import { Router, Request, Response } from 'express';
import { query, validationResult, matchedData, checkSchema } from 'express-validator';
import { Problem, IProblem } from '../mongoose/schemas/problems';
import { createProblemValidation } from '../validations/create-problem-validation';
import { updateProblemValidation } from '../validations/update-problem-validation';

const problemsRouter = Router();

problemsRouter.get('/api/problems', async (request: Request, response: Response) => {
  try {
    const problems: IProblem[] = await Problem.find()
      .select('id displayID title createdTime')
      .sort({ createdTime: -1 });
    return response.status(200).send(problems);
  } catch (error) {
    if (error) {
      return response.status(400).send(error);
    }
  }
});

problemsRouter.get('/api/problems/:displayID', async (request: Request, response: Response) => {
  if (!request.user) {
    return response.status(401).send('Please login first');
  }
  const { displayID } = request.params;
  try {
    const problem: IProblem | null = await Problem.findOne({ displayID });
    if (!problem) {
      return response.sendStatus(404);
    }
    return response.status(200).send(problem);
  } catch (error) {
    console.log(error);
    return response.status(400).send(error);
  }
});

problemsRouter.post(
  '/api/problems',
  checkSchema(createProblemValidation),
  async (request: Request, response: Response) => {
    if (!request.user || !request.user.isAdmin) {
      return response.status(401).send('Please login as an admin first');
    }
    const result = validationResult(request);
    if (!result.isEmpty()) {
      return response.status(400).send(result.array());
    }
    const data = matchedData(request);
    const newProblem = new Problem(data);
    try {
      newProblem.createdTime = new Date();
      const savedProblem: IProblem = await newProblem.save();
      return response.status(201).send(savedProblem);
    } catch (error) {
      console.log(`Error: ${error}`);
      return response.status(400).send(error);
    }
  }
);

problemsRouter.delete('/api/problems/:displayID', async (request: Request, response: Response) => {
  if (!request.user || !request.user.isAdmin) {
    return response.status(401).send('Please login as an admin first');
  }
  const { displayID } = request.params;
  try {
    const problem: IProblem | null = await Problem.findOneAndDelete({ displayID });
    if (!problem) {
      return response.sendStatus(404);
    }
    return response.status(200).send(problem);
  } catch (error) {
    console.log(error);
    return response.status(400).send(error);
  }
});

problemsRouter.patch(
  '/api/problems/:displayID',
  checkSchema(updateProblemValidation),
  async (request: Request, response: Response) => {
    if (!request.user) {
      return response.status(401).send('Please login first');
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
        return response.sendStatus(404);
      }
      problem = await Problem.findOne({ displayID }).select('id displayID title createdTime');
      return response.status(201).send(problem);
    } catch (error) {
      console.log(error);
      return response.status(400).send(error);
    }
  }
);

export default problemsRouter;
