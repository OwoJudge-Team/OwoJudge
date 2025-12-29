import { Router, Request, Response } from 'express';
import { validationResult, checkSchema } from 'express-validator';
import { Contest, IContest, UserStanding } from '../mongoose/schemas/contests';
import { IRequest } from '../utils/request-interface';
import { IUser } from '../mongoose/schemas/users';
import { Submission } from '../mongoose/schemas/submission';
import { SubmissionStatus } from '../utils/submission-status';
import { createContestValidation } from '../validations/create-contest-validation';
import { updateContestValidation } from '../validations/update-contest-validation';

const contestsRouter = Router();

const getAllContests = async (request: IRequest, response: Response) => {
  try {
    const contests: IContest[] = await Contest.find().sort({ _id: -1 });
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
  const { title, description, startTime, endTime, problems } = request.body;
  const newContest = new Contest({
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
  if (!request.isAuthenticated() || !request.user || !(request.user as IUser).isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
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
    
    // Sort standings by totalScore (descending), then by lastSubmissionTime (ascending - earlier is better)
    const sortedStandings = [...contest.standings].sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      // If scores are equal, earlier submission time is better
      if (a.lastSubmissionTime && b.lastSubmissionTime) {
        return a.lastSubmissionTime.getTime() - b.lastSubmissionTime.getTime();
      }
      return 0;
    });
    
    response.status(200).send(sortedStandings);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
};

const updateStandings = async (request: IRequest, response: Response) => {
  if (!request.isAuthenticated() || !request.user || !(request.user as IUser).isAdmin) {
    response.status(401).send('Please login as an admin first');
    return;
  }
  
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
    
    // Get all problem IDs in the contest
    const problemSerialNumbers = contest.problems.map(p => p.serialNumber);
    
    // Find all submissions for these problems within the contest timeframe
    const submissions = await Submission.find({
      problemSerialNumber: { $in: problemSerialNumbers },
      createdTime: {
        $gte: contest.startTime,
        $lte: contest.endTime
      }
    }).sort({ createdTime: 1 });
    
    // Build standings from submissions
    const standingsMap = new Map<string, UserStanding>();
    
    for (const submission of submissions) {
      const username = submission.username;
      const serialNumber = submission.problemSerialNumber;
      const score = submission.score || 0;
      
      if (!standingsMap.has(username)) {
        standingsMap.set(username, {
          username,
          totalScore: 0,
          solvedCount: 0,
          problemScores: [],
          lastSubmissionTime: submission.createdTime
        });
      }
      
      const userStanding = standingsMap.get(username)!;
      
      // Find if this problem already has a score
      const existingProblemScore = userStanding.problemScores.find(ps => ps.serialNumber === serialNumber);
      
      if (existingProblemScore) {
        // Update if this submission has a better score
        if (score > existingProblemScore.score) {
          userStanding.totalScore += (score - existingProblemScore.score);
          existingProblemScore.score = score;
          existingProblemScore.lastSubmissionTime = submission.createdTime;
        }
      } else {
        // Add new problem score
        userStanding.problemScores.push({
          serialNumber,
          score,
          lastSubmissionTime: submission.createdTime
        });
        userStanding.totalScore += score;
      }
      
      // Update last submission time
      if (!userStanding.lastSubmissionTime || submission.createdTime > userStanding.lastSubmissionTime) {
        userStanding.lastSubmissionTime = submission.createdTime;
      }
      
      // Count solved problems (score > 0)
      userStanding.solvedCount = userStanding.problemScores.filter(ps => ps.score > 0).length;
    }
    
    // Convert map to array
    contest.standings = Array.from(standingsMap.values());
    await contest.save();
    
    response.status(200).send({ message: 'Standings updated successfully', standings: contest.standings });
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
};

contestsRouter.get('/api/contests', getAllContests);
contestsRouter.get('/api/contests/:id', getContestByID);
contestsRouter.get('/api/contests/:id/standings', getStandings);
contestsRouter.post('/api/contests', checkSchema(createContestValidation), createContest);
contestsRouter.post('/api/contests/:id/standings/update', updateStandings);
contestsRouter.patch(
  '/api/contests/:id',
  checkSchema(updateContestValidation),
  updateContest
);
contestsRouter.delete('/api/contests/:id', deleteContest);

export default contestsRouter;
export { getAllContests, getContestByID, createContest, updateContest, deleteContest, getStandings, updateStandings };

