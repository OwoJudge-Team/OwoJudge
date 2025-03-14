import { Router, Request, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { User, IUser } from '../mongoose/schemas/users';
import { createUserValidation } from '../validations/create-user-validation';
import { hashString } from '../utils/hash-password';
import { getUsersValidation } from '../validations/get-user-validation';
import { updateUserValidation } from '../validations/update-user-validation';

const usersRouter = Router();

usersRouter.get('/api/users', checkSchema(getUsersValidation), async (request: Request, response: Response) => {
  const {
    query: { filter, value }
  }: { query: { filter?: string; value?: string } } = request;
  const result = validationResult(request);
  if (!filter && !value) {
    const users: IUser[] = await User.find().select('id username displayName').sort({ id: -1 });
    return response.status(200).send(users);
  }
  if (!result.isEmpty()) {
    console.log(result.array());
    return response.status(400).send(result.array());
  }
  try {
    if (!filter) {
      return response.status(400).send('Filter is required');
    }
    const users: IUser[] = await User.find()
      .where(filter)
      .equals({ $regex: `.*${value}.*`, $options: 'i' })
      .select('username displayName rating');
    return response.status(200).send(users);
  } catch (error) {
    console.log(error);
    return response.status(400).send(error);
  }
});

usersRouter.get('/api/users/:username', async (request: Request, response: Response) => {
  const username: string | undefined = request.params?.username;
  if (!request.user) {
    return response.status(401).send('Please login first');
  }
  try {
    const user: IUser | null = await User.findOne({ username }).select('-password');
    if (!user) {
      return response.sendStatus(404);
    }
    return response.status(200).send(user);
  } catch (error) {
    console.log(error);
    return response.status(400).send(error);
  }
});

usersRouter.post('/api/users', checkSchema(createUserValidation), async (request: Request, response: Response) => {
  if (!request.user) {
    return response.status(401).send('Please login first');
  }
  const result = validationResult(request);
  if (!result.isEmpty()) {
    return response.status(400).send(result.array());
  }
  const data = matchedData(request) as Partial<IUser>;
  const user = request.user as IUser;
  if (data.isAdmin && !user.isAdmin) {
    return response.status(401).send('Please login as an admin first');
  }
  const newUser = new User(data);
  try {
    newUser.password = hashString(newUser.password);
    newUser.solvedProblem = 0;
    newUser.solvedProblems = [];
    newUser.rating = 0;
    const savedUser: IUser = await newUser.save();
    return response.status(201).send(savedUser);
  } catch (error) {
    console.log(`Error: ${error}`);
    return response.status(400).send(error);
  }
});

usersRouter.delete('/api/users/:username', async (request: Request, response: Response) => {
  const user = request.user as IUser;
  if (!request.user || !user.isAdmin) {
    return response.status(401).send('Please login as an admin first');
  }
  const username: string | undefined = request.params?.username;
  if (!username) {
    return response.status(400).send('Username is required');
  }
  try {
    const user: IUser | null = await User.findOneAndDelete({ username });
    if (!user) {
      return response.sendStatus(404);
    }
    return response.status(201).send(user);
  } catch (error) {
    console.log(error);
    return response.status(400).send(error);
  }
});

usersRouter.patch(
  '/api/users/:username',
  checkSchema(updateUserValidation),
  async (request: Request, response: Response) => {
    if (!request.user) {
      return response.status(401).send('Please login first');
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
        return response.sendStatus(404);
      }
      user = await User.findOne({ username }).select('-password');
      return response.status(201).send(user);
    } catch (error) {
      console.log(error);
      return response.status(400).send(error);
    }
  }
);

export default usersRouter;
