import { Router, Request, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { User, IUser } from '../mongoose/schemas/users';
import { createUserValidation } from '../validations/create-user-validation';
import { hashString } from '../utils/hash-password';
import { getUsersValidation } from '../validations/get-user-validation';
import { updateUserValidation } from '../validations/update-user-validation';
import IValidationError from '../validations/validation-error';
import { IRequest } from '../utils/request-interface';

const usersRouter = Router();

const getAllUsers = async (request: IRequest, response: Response) => {
  const { filter, value } = request.query ?? ({} as { filter?: string; value?: string });
  const result = validationResult(request);
  if (!filter && !value) {
    const users: IUser[] = await User.find().select('id username displayName').sort({ id: -1 });
    response.status(200).send(users);
    return;
  }
  if (!result.isEmpty()) {
    console.log(result.array());
    response.status(400).send(result.array());
    return;
  }
  try {
    if (!filter) {
      response.status(400).send('Filter is required');
      return;
    }
    const users: IUser[] = await User.find()
      .where(filter as string)
      .equals({ $regex: `.*${value}.*`, $options: 'i' })
      .select('username displayName rating');
    response.status(200).send(users);
    return;
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

const getUserByUsername = async (request: IRequest, response: Response) => {
  const username: string | undefined = request.params?.username;
  if (!username) {
    response.status(400).send('Username is required');
    return;
  }
  if (!request.isAuthenticated() || !request.user) {
    response.status(403).send('Please login first');
    return;
  }
  try {
    const user: IUser | null = await User.findOne({ username }).select('-password');
    if (!user) {
      response.sendStatus(404);
      return;
    }
    response.status(200).send(user);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

const createUser = async (request: IRequest, response: Response) => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }
  const result = validationResult(request);
  if (!result.isEmpty()) {
    response.status(400).send(result.array());
    return;
  }
  const { username, password, displayName, isAdmin } = request.body as IUser;
  const data = { username, password, displayName, isAdmin } as IUser;
  if (data.isAdmin !== true && data.isAdmin !== false) {
    response.status(400).send('isAdmin must be a boolean');
    return;
  }
  const user = request.user as IUser;
  if (data.isAdmin && !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  const newUser = new User(data);
  try {
    newUser.password = hashString(newUser.password);
    newUser.solvedProblem = 0;
    newUser.solvedProblems = [];
    newUser.rating = 0;
    const savedUser: IUser = await newUser.save();
    response.status(201).send(savedUser);
  } catch (error) {
    console.log(`Error: ${error}`);
    response.status(400).send(error);
  }
};

const deleteUser = async (request: IRequest, response: Response) => {
  const user = request.user as IUser;
  if (!request.isAuthenticated() || !request.user || !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  const username: string | undefined = request.params?.username;
  if (!username) {
    response.status(400).send('Username is required');
    return;
  }
  try {
    const user: IUser | null = await User.findOneAndDelete({ username });
    if (!user) {
      response.sendStatus(404);
      return;
    }
    response.status(201).send(user);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

const updateUser = async (request: IRequest, response: Response) => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }
  const oldUsername: string | undefined = request.params?.username;
  const { username, password, displayName, isAdmin } = request.body as IUser;
  const data = {} as IUser;
  if (username) {
    data.username = username;
  }
  if (password) {
    data.password = password;
  }
  if (displayName) {
    data.displayName = displayName;
  }
  const user = request.user as IUser;
  if ((isAdmin == true || isAdmin == false) && user.isAdmin) {
    data.isAdmin = isAdmin;
  } else if (isAdmin === true || isAdmin === false) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  if (!oldUsername) {
    response.status(400).send('Username is required');
    return;
  }
  if (oldUsername !== user.username && !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  try {
    const errorArray = validationResult(request).array();
    for (const key in data) {
      for (let i = 0; i < errorArray.length; i++) {
        const error = errorArray[i] as unknown as IValidationError;
        console.log(error);
        if (error.path === key) {
          throw {
            message: 'Invalid patch data',
            error
          };
        }
      }
    }
    if (data.password) {
      data.password = hashString(data.password);
    }
    const user: IUser | null = await User.findOneAndUpdate({ username: oldUsername }, data);
    if (!user) {
      response.status(404).send('User not found');
      return;
    }
    response.status(201).send(`${oldUsername} updated`);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

usersRouter.get('/api/users', checkSchema(getUsersValidation), getAllUsers);
usersRouter.get('/api/users/:username', getUserByUsername);
usersRouter.post('/api/users', checkSchema(createUserValidation), createUser);
usersRouter.delete('/api/users/:username', deleteUser);
usersRouter.patch('/api/users/:username', checkSchema(updateUserValidation), updateUser);

export default usersRouter;
export { getAllUsers, getUserByUsername, createUser, deleteUser, updateUser };
