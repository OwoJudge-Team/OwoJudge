import { Router, Request, Response } from 'express';
import { validationResult, checkSchema } from 'express-validator';
import { Contest, IContest } from '../mongoose/schemas/contests';
import { IRequest } from '../utils/request-interface';
import { IUser } from '../mongoose/schemas/users';
import { createContestValidation } from '../validations/create-contest-validation';
import { updateContestValidation } from '../validations/update-contest-validation';

const contestsRouter = Router();

const getAllContests = async (request: IRequest, response: Response) => {
  try {
    const contests: IContest[] = await Contest.find().sort({ contestID: -1 });
    response.status(200).send(contests);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
};

const getContestById = async (request: IRequest, response: Response) => {
  const contestID: string | undefined = request.params?.contestID;
  if (!contestID) {
    response.status(400).send('Contest ID is required');
    return;
  }
  try {
    const contest: IContest | null = await Contest.findOne({ contestID }).populate('problems');
    if (!contest) {
      response.sendStatus(404);
      return;
    }
    response.status(200).send(contest);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
};

const createContest = async (request: IRequest, response: Response) => {
  if (!request.isAuthenticated() || !request.user || !(request.user as IUser).isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  const result = validationResult(request);
  if (!result.isEmpty()) {
    response.status(400).send(result.array());
    return;
  }
  const { contestID, title, description, startTime, endTime, problems } = request.body;
  const newContest = new Contest({
    contestID,
    title,
    description,
    startTime,
    endTime,
    problems
  });
  try {
    const savedContest: IContest = await newContest.save();
    response.status(201).send(savedContest);
  } catch (error) {
    console.log(`Error: ${error}`);
    response.status(400).send(error);
  }
};

const updateContest = async (request: IRequest, response: Response) => {
  if (!request.isAuthenticated() || !request.user || !(request.user as IUser).isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  const contestID: string | undefined = request.params?.contestID;
  if (!contestID) {
    response.status(400).send('Contest ID is required');
    return;
  }
  const data = request.body;
  try {
    const updatedContest = await Contest.findOneAndUpdate({ contestID }, data, { new: true });
    if (!updatedContest) {
      response.status(404).send('Contest not found');
      return;
    }
    response.status(200).send(updatedContest);
  } catch (error) {
    console.log(error);
    response.status(400).send(error);
  }
};

const deleteContest = async (request: IRequest, response: Response) => {
  if (!request.isAuthenticated() || !request.user || !(request.user as IUser).isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  const contestID: string | undefined = request.params?.contestID;
  if (!contestID) {
    response.status(400).send('Contest ID is required');
    return;
  }
  try {
    const contest = await Contest.findOneAndDelete({ contestID });
    if (!contest) {
      response.sendStatus(404);
      return;
    }
    response.status(200).send(contest);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
};

contestsRouter.get('/api/contests', getAllContests);
contestsRouter.get('/api/contests/:contestID', getContestById);
contestsRouter.post('/api/contests', checkSchema(createContestValidation), createContest);
contestsRouter.patch(
  '/api/contests/:contestID',
  checkSchema(updateContestValidation),
  updateContest
);
contestsRouter.delete('/api/contests/:contestID', deleteContest);

export default contestsRouter;
export { getAllContests, getContestById, createContest, updateContest, deleteContest };

