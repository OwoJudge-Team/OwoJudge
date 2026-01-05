import { Router, Request, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { User, IUser } from '../mongoose/schemas/users';
import { createUserValidation } from '../validations/create-user-validation';
import { hashString } from '../utils/hash-password';
import { getUsersValidation } from '../validations/get-user-validation';
import { updateUserValidation } from '../validations/update-user-validation';
import { IRequest } from '../utils/request-interface';
import { giteaService } from '../utils/gitea-service';
import { isAdmin, isAuthenticated } from '../middleware/auth';
import { usernameParamValidation } from '../validations/username-param-validation';

const usersRouter = Router();

const getAllUsers = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).send(errors.array());
    return;
  }

  const { filter, value } = matchedData(request);

  if (!filter && !value) {
    try {
      const users: IUser[] = await User.find().select('id username displayName').sort({ id: -1 });
      response.status(200).send(users);
    } catch (error) {
      console.error(error);
      response.status(500).send(error);
    }
    return;
  }

  try {
    const users: IUser[] = await User.find()
      .where(filter as string)
      .equals({ $regex: `.*${value}.*`, $options: 'i' })
      .select('username displayName rating');
    response.status(200).send(users);
  } catch (error) {
    console.error(error);
    response.status(400).send(error);
  }
};

const getUserByUsername = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).send(errors.array());
    return;
  }

  const { username } = matchedData(request);
  try {
    const user: IUser | null = await User.findOne({ username }).select('-password');
    if (!user) {
      response.sendStatus(404);
      return;
    }
    response.status(200).send(user);
  } catch (error) {
    console.error(error);
    response.status(400).send(error);
  }
};

const createUser = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).send(errors.array());
    return;
  }

  const { username, password, displayName, isAdmin, studentId } = matchedData(request) as IUser;

  try {
    // Step 1: Create OwoJudge user first (without Gitea data)
    const newUser = new User({
      username,
      displayName,
      isAdmin,
      studentId,
      password: hashString(password)
      // giteaId and gitSshUrl will be filled in later
    });

    const savedUser: IUser = await newUser.save();

    // Step 2: Create Gitea user and repo
    let giteaId: number;
    let gitSshUrl: string;

    try {
      const giteaUser = await giteaService.createUser({
        username,
        password,
        email: `${username}@owojudge.local`
      });
      giteaId = giteaUser.id;

      const giteaRepo = await giteaService.createUserRepo({ username });
      gitSshUrl = giteaRepo.ssh_url;
    } catch (giteaError) {
      console.error(`Failed to create Gitea user/repo for ${username}:`, giteaError);

      // Rollback: Delete judge user since Gitea integration failed
      try {
        await User.findOneAndDelete({ username });
      } catch (deleteError) {
        console.error(`Failed to rollback judge user ${username}:`, deleteError);
      }

      response.status(500).send({
        message: 'Failed to create Gitea user',
        error: giteaError
      });
      return;
    }

    // Step 3: Update judge user with Gitea data
    savedUser.giteaId = giteaId;
    savedUser.gitSshUrl = gitSshUrl;
    await savedUser.save();

    response.status(201).send(savedUser);
  } catch (error) {
    console.error(error);
    response.status(500).send(error);
  }
};

const deleteUser = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).send(errors.array());
    return;
  }
  const { username } = matchedData(request);
  try {
    const deletedUser: IUser | null = await User.findOneAndDelete({ username });
    if (!deletedUser) {
      response.sendStatus(404);
      return;
    }
    response.status(201).send(deletedUser);
  } catch (error) {
    console.error(error);
    response.status(500).send(error);
  }
};

const updateUser = async (request: IRequest, response: Response) => {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    response.status(400).send(errors.array());
    return;
  }

  const { username: oldUsername } = request.params;
  const user = request.user as IUser;

  // Authorization: Only admin or self can update
  if (oldUsername !== user.username && !user.isAdmin) {
    response.status(403).send('Not authorized to update this user');
    return;
  }

  const updates = matchedData(request);

  // Only admin can change isAdmin, studentId, giteaId status
  if (!user.isAdmin) {
    delete updates.isAdmin;
    delete updates.studentId;
  }

  const { oldPassword } = request.body;
  
  // Require password verification for self-updates
  if (oldUsername === user.username) {
    if (!oldPassword) {
      response.status(400).send('Password is required to update profile');
      return;
    }

    const dbUser = await User.findOne({ username: oldUsername });
    if (!dbUser || dbUser.password !== hashString(oldPassword)) {
      response.status(403).send('Invalid password');
      return;
    }
  }

  // Ensure oldPassword is not in updates if it was passed
  delete updates.oldPassword;

  if (updates.password) {
    updates.password = hashString(updates.password);
  }

  try {
    // Gitea SSH Key update logic
    if (updates.gitPublicKey) {
      const existingUser = await User.findOne({ username: oldUsername });
      if (existingUser && updates.gitPublicKey !== existingUser.gitPublicKey) {
        console.log(`New public key detected for user ${oldUsername}, adding to Gitea...`);
        try {
          await giteaService.addPublicKey(oldUsername, {
            key: updates.gitPublicKey,
            read_only: true,
            title: `OwoJudge SSH Key - ${new Date().toISOString()}`
          });
        } catch (giteaError) {
          console.error(`Failed to add public key to Gitea for ${oldUsername}:`, giteaError);
          response.status(500).send({ message: 'Failed to add public key to Gitea', error: giteaError });
          return;
        }
      }
    }

    const updatedUser = await User.findOneAndUpdate({ username: oldUsername }, updates, { new: true });
    if (!updatedUser) {
      response.status(404).send('User not found');
      return;
    }
    response.status(200).send(`${oldUsername} updated`);
  } catch (error) {
    console.error(error);
    response.status(400).send(error);
  }
};


usersRouter.get('/api/users', checkSchema(getUsersValidation), getAllUsers);
usersRouter.get('/api/users/:username', isAuthenticated, checkSchema(usernameParamValidation), getUserByUsername);
usersRouter.post('/api/users', isAdmin, checkSchema(createUserValidation), createUser);
usersRouter.delete('/api/users/:username', isAdmin, checkSchema(usernameParamValidation), deleteUser);
usersRouter.patch('/api/users/:username', isAuthenticated, checkSchema(usernameParamValidation), checkSchema(updateUserValidation), updateUser);

export default usersRouter;
export { getAllUsers, getUserByUsername, createUser, deleteUser, updateUser };
