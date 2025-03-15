import { Router, Request, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { User, IUser } from '../mongoose/schemas/users';
import { createUserValidation } from '../validations/create-user-validation';
import { hashString } from '../utils/hash-password';
import { getUsersValidation } from '../validations/get-user-validation';
import { updateUserValidation } from '../validations/update-user-validation';

const usersRouter = Router();

const getAllUsers = async (request: Request, response: Response) => {
  const {
    query: { filter, value }
  }: { query: { filter?: string; value?: string } } = request;
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
      .where(filter)
      .equals({ $regex: `.*${value}.*`, $options: 'i' })
      .select('username displayName rating');
    response.status(200).send(users);
    return;
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
    return;
  }
};

const getUserByUsername = async (request: Request, response: Response) => {
  const username: string | undefined = request.params?.username;
  if (!username) {
    response.status(400).send('Username is required');
    return;
  }
  if (!request.user) {
    response.status(401).send('Please login first');
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

const createUser = async (request: Request, response: Response) => {
  if (!request.user) {
    response.status(401).send('Please login first');
    return;
  }
  const result = validationResult(request);
  if (!result.isEmpty()) {
    response.status(400).send(result.array());
    return;
  }
  const data = matchedData(request) as Partial<IUser>;
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

const deleteUser = async (request: Request, response: Response) => {
  const user = request.user as IUser;
  if (!request.user || !user.isAdmin) {
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

const updateUser = async (request: Request, response: Response) => {
  if (!request.user) {
    response.status(401).send('Please login first');
    return;
  }
  const username: string | undefined = request.params?.username;
  const data = matchedData(request) as Partial<IUser>;
  try {
    if (Object.keys(data).length === 1) {
      throw {
        message: 'No matched patch data',
        error: validationResult(request).array()
      };
    }
    if (data.password) {
      data.password = hashString(data.password);
    }
    let user: IUser | null = await User.findOneAndUpdate({ username }, data);
    if (!user) {
      response.sendStatus(404);
      return;
    }
    user = await User.findOne({ username }).select('-password');
    response.status(201).send(user);
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