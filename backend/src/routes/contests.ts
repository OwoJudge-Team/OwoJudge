import { Router, Response } from 'express';
import { validationResult, checkSchema } from 'express-validator';
import { Contest, IContest, UserStanding } from '../mongoose/schemas/contests';
import { IUser } from '../mongoose/schemas/users';
import { IRequest } from '../utils/request-interface';
import { Submission } from '../mongoose/schemas/submission';
import { recalculateContestStandings } from '../utils/standing-utils';
import { createContestValidation } from '../validations/create-contest-validation';
import { updateContestValidation } from '../validations/update-contest-validation';
import { isJudgeAdmin, isTA, isAuthenticated } from '../middleware/auth';
import { UserRole } from '../mongoose/schemas/users';

const contestsRouter = Router();

const getAllContests = async (request: IRequest, response: Response) => {
  try {
    const user = request.user as IUser | undefined;
    const query = (user && (user.role === UserRole.JudgeAdmin || user.role === UserRole.TA)) ? {} : { released: true };
    const contests: IContest[] = await Contest.find(query).sort({ _id: -1 });
    response.status(200).send(contests);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
};

const getContestByID = async (request: IRequest, response: Response) => {
  const id: string | undefined = request.params?.id;
  if (!id) {
    response.status(400).send('Contest ID is required');
    return;
  }
  try {
    const contest: IContest | null = await Contest.findById(id).populate('problems');
    if (!contest) {
      response.sendStatus(404);
      return;
    }

    const user = request.user as IUser | undefined;
    if (!contest.released && (!user || (user.role !== UserRole.JudgeAdmin && user.role !== UserRole.TA))) {
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
  const result = validationResult(request);
  if (!result.isEmpty()) {
    response.status(400).send(result.array());
    return;
  }
  const { title, description, startTime, endTime, problems, released } = request.body;
  const newContest = new Contest({
    title,
    description,
    startTime,
    endTime,
    problems,
    released: released ?? false
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
  const id: string | undefined = request.params?.id;
  if (!id) {
    response.status(400).send('Contest ID is required');
    return;
  }
  const data = request.body;
  try {
    const updatedContest = await Contest.findByIdAndUpdate(id, data, { new: true });
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
  const id: string | undefined = request.params?.id;
  if (!id) {
    response.status(400).send('Contest ID is required');
    return;
  }
  try {
    const contest = await Contest.findByIdAndDelete(id);
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

const getStandings = async (request: IRequest, response: Response) => {
  const id: string | undefined = request.params?.id;
  if (!id) {
    response.status(400).send('Contest ID is required');
    return;
  }
  try {
    const contest: IContest | null = await Contest.findById(id);
    if (!contest) {
      response.sendStatus(404);
      return;
    }

    // Sort standings by totalScore (descending), then by submissionCount (ascending)
    const sortedStandings = [...contest.standings].sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      // If scores are equal, lower submission count (penalty) is better
      const countA = a.submissionCount || 0;
      const countB = b.submissionCount || 0;
      return countA - countB;
    });

    response.status(200).send(sortedStandings);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
};

const updateStandings = async (request: IRequest, response: Response) => {
  const id: string | undefined = request.params?.id;
  if (!id) {
    response.status(400).send('Contest ID is required');
    return;
  }

  try {
     const contest = await recalculateContestStandings(id);
     response.status(200).send({ message: 'Standings updated successfully', standings: contest.standings });
  } catch (error) {
    console.log(error);
    if (error instanceof Error && error.message === 'Contest not found') {
       response.sendStatus(404);
       return;
    }
    response.status(500).send(error);
  }
};

contestsRouter.get('/api/contests', getAllContests);
contestsRouter.get('/api/contests/:id', getContestByID);
contestsRouter.get('/api/contests/:id/standings', getStandings);
contestsRouter.post('/api/contests', isTA, checkSchema(createContestValidation), createContest);
contestsRouter.post('/api/contests/:id/standings/update', isAuthenticated, updateStandings);
contestsRouter.patch(
  '/api/contests/:id',
  isTA,
  checkSchema(updateContestValidation),
  updateContest
);
contestsRouter.delete('/api/contests/:id', isJudgeAdmin, deleteContest);

export default contestsRouter;
export { getAllContests, getContestByID, createContest, updateContest, deleteContest, getStandings, updateStandings };

