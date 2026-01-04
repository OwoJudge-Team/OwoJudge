import { Router, Request, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { SubmissionStatus } from '../utils/submission-status';
import { Problem, ProblemStatus } from '../mongoose/schemas/problems';
import { User, IUser } from '../mongoose/schemas/users';
import { createSubmissionValidation } from '../validations/create-submission-validation';
import { IRequest } from '../utils/request-interface';
import { submitUserSubmission } from '../judger/judger';

const submissionRouter: Router = Router();

export const getSubmissions = async (request: IRequest, response: Response): Promise<void> => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }

  const user = request.user as IUser;
  const query: any = user.isAdmin ? {} : { username: user.username };

  // Add filters from query parameters
  const { username, userID, problemSerialNumber, status, minScore, maxScore } = request.query;
  if (username) {
    if (user.isAdmin) {
      query.username = { $regex: username, $options: 'i' };
    } else if (username === user.username) {
      query.username = username;
    }
  }
  if (userID && (user.isAdmin || userID === user.id.toString())) {
    query.userID = userID;
  }
  if (problemSerialNumber) {
    query.problemSerialNumber = parseInt(problemSerialNumber as string);
  }
  if (status) {
    query.status = { $regex: status, $options: 'i' };
  }
  if (minScore !== undefined || maxScore !== undefined) {
    query.score = {};
    if (minScore !== undefined) {
      query.score.$gte = parseInt(minScore as string);
    }
    if (maxScore !== undefined) {
      query.score.$lte = parseInt(maxScore as string);
    }
  }

  const offset = parseInt(request.query.offset as string) || 0;
  const limit = parseInt(request.query.limit as string) || 20;
  const index = parseInt(request.query.index as string);
  const finalOffset = !isNaN(index) ? index : offset;

  try {
    const total = await Submission.countDocuments(query);
    const submissions: ISubmission[] = await Submission.find(query)
      .select('serialNumber problemSerialNumber problemTitle username userHandle userID status language createdTime score time memory')
      .sort({ serialNumber: -1 })
      .skip(finalOffset)
      .limit(limit);
    response.status(200).send({ total, submissions });
  } catch (error: unknown) {
    if (error) {
      response.status(400).send(error);
    }
  }
};

export const getSubmissionByID = async (request: IRequest, response: Response): Promise<void> => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }

  const user = request.user as IUser;
  const { serialNumber } = request.params;

  try {
    const submission: ISubmission | null = await Submission.findOne({ serialNumber: parseInt(serialNumber) });
    if (!submission) {
      response.status(404).send('Submission not found');
      return;
    }

    // Check if user is authorized to view this submission
    if (!user.isAdmin && submission.username !== user.username) {
      response.status(403).send('You are not authorized to view this submission');
      return;
    }

    response.status(200).send(submission);
  } catch (error: unknown) {
    console.log(`Error: ${error}`);
    response.status(400).send(error);
  }
};

export const createSubmission = async (request: IRequest, response: Response): Promise<void> => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }
  const result = validationResult(request);
  if (!result.isEmpty()) {
    response.status(400).send(result.array());
    return;
  }
  const data: Partial<ISubmission> = matchedData(request);

  try {
    // Fetch user details
    const user = await User.findOne({ username: request.user.username });
    if (!user) {
      response.status(404).send('User not found');
      return;
    }

    // Fetch problem details
    const problem = await Problem.findOne({ serialNumber: data.problemSerialNumber });
    if (!problem) {
      response.status(404).send('Problem not found');
      return;
    }

    if (problem.status !== ProblemStatus.Ready) {
      response.status(400).send('Problem is not ready for submission');
      return;
    }

    // Check daily quota
    if (problem.dailyQuota && problem.dailyQuota > 0) {
      if (!user.quotaUsage) {
        user.quotaUsage = new Map();
      }

      const problemID = problem.id.toString();
      const usage = user.quotaUsage.get(problemID);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Reset quota if it's a new day or no usage record exists
      if (!usage || usage.date < today) {
        user.quotaUsage.set(problemID, { count: 0, date: today });
      }

      const currentUsage = user.quotaUsage.get(problemID)!;

      if (currentUsage.count >= problem.dailyQuota) {
        response.status(429).send(`Daily submission quota exceeded. Limit: ${problem.dailyQuota}`);
        return;
      }

      // Increment quota usage
      currentUsage.count += 1;
      user.quotaUsage.set(problemID, currentUsage);
      await user.save();
    }

    // Add the additional fields
    data.username = user.username;
    data.userHandle = user.displayName;
    data.userID = user.id as any;
    data.problemSerialNumber = problem.serialNumber;
    data.problemTitle = problem.title;
    data.results = {};

    const newSubmission: ISubmission = new Submission(data);
    const savedSubmission: ISubmission = await newSubmission.save();
    submitUserSubmission(savedSubmission);
    response.status(201).send(savedSubmission);
  } catch (error: unknown) {
    console.log(`Error: ${error}`);
    response.status(400).send(error);
  }
};

submissionRouter.get('/api/submissions', getSubmissions);
submissionRouter.get('/api/submission/:serialNumber', getSubmissionByID);
submissionRouter.post('/api/submissions', checkSchema(createSubmissionValidation), createSubmission);

export default submissionRouter;
