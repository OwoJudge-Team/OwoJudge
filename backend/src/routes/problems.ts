import { Router, Request, Response } from 'express';
import { query, validationResult, matchedData, checkSchema } from 'express-validator';
import { Problem, IProblem } from '../mongoose/schemas/problems';
import { createProblemValidation } from '../validations/create-problem-validation';
import { updateProblemValidation } from '../validations/update-problem-validation';
import { IUser, User } from '../mongoose/schemas/users';

const problemsRouter = Router();

const getProblems = async (request: Request, response: Response) => {
  try {
    const problems: IProblem[] = await Problem.find()
      .select('id displayID title createdTime')
      .sort({ createdTime: -1 });
    response.status(200).send(problems);
  } catch (error) {
    if (error) {
      response.status(400).send(error);
    }
  }
};

const getProblemById = async (request: Request, response: Response) => {
  if (!request.user) {
    response.status(401).send('Please login first');
  }
  const { displayID } = request.params;
  try {
    const problem: IProblem | null = await Problem.findOne({ displayID });
    if (!problem) {
      response.sendStatus(404);
    }
    response.status(200).send(problem);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

const createProblem = async (request: Request, response: Response) => {
  const user = request.user as IUser;
  if (!request.user || !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
  }
  const result = validationResult(request);
  if (!result.isEmpty()) {
    response.status(400).send(result.array());
  }
  const data = matchedData(request);
  const newProblem = new Problem(data);
  try {
    newProblem.createdTime = new Date();
    const savedProblem: IProblem = await newProblem.save();
    response.status(201).send(savedProblem);
  } catch (error) {
    console.log(`Error: ${error}`);
    response.status(400).send(error);
  }
};

const deleteProblem = async (request: Request, response: Response) => {
  const user = request.user as IUser;
  if (!request.user || !user.isAdmin) {
    response.status(401).send('Please login as an admin first');
  }
  const { displayID } = request.params;
  try {
    const problem: IProblem | null = await Problem.findOneAndDelete({ displayID });
    if (!problem) {
      response.sendStatus(404);
    }
    response.status(200).send(problem);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

const updateProblem = async (request: Request, response: Response) => {
  if (!request.user) {
    response.status(401).send('Please login first');
  }
  const { displayID } = request.params;
  const data = matchedData(request);
  console.log(data);
  try {
    if (Object.keys(data).length === 2) {
      throw {
        message: 'No matched patch data',
        error: validationResult(request).array()
      };
    }
    let problem: IProblem | null = await Problem.findOneAndUpdate({ displayID }, data);
    if (!problem) {
      response.sendStatus(404);
    }
    problem = await Problem.findOne({ displayID }).select('id displayID title createdTime');
    response.status(201).send(problem);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

problemsRouter.get('/api/problems', getProblems);
problemsRouter.get('/api/problems/:displayID', getProblemById);
problemsRouter.post('/api/problems', checkSchema(createProblemValidation), createProblem);
problemsRouter.delete('/api/problems/:displayID', deleteProblem);
problemsRouter.patch('/api/problems/:displayID', checkSchema(updateProblemValidation), updateProblem);

export default problemsRouter;
export { getProblems, getProblemById, createProblem, deleteProblem, updateProblem };