import { Router, Request, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { Problem } from '../mongoose/schemas/problems';
import { User, IUser } from '../mongoose/schemas/users';
import { createSubmissionValidation } from '../validations/create-submission-validation';
import { IRequest } from '../utils/request-interface';
import { submitUserSubmission } from '../judger/judger';

const submissionRouter: Router = Router();

const getSubmissions = async (request: IRequest, response: Response): Promise<void> => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }
  
  const user = request.user as IUser;
  const query = user.isAdmin ? {} : { username: user.username };
  
  try {
    const submissions: ISubmission[] = await Submission.find(query)
      .select('serialNumber problemID problemSerialNumber problemTitle username userHandle userID status language createdTime score')
      .sort({ createdTime: -1 });
    response.status(200).send(submissions);
  } catch (error: unknown) {
    if (error) {
      response.status(400).send(error);
    }
  }
};

const getSubmissionByID = async (request: IRequest, response: Response): Promise<void> => {
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

const createSubmission = async (request: IRequest, response: Response): Promise<void> => {
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
    const problem = await Problem.findOne({ problemID: data.problemID });
    if (!problem) {
      response.status(404).send('Problem not found');
      return;
    }

    // Add the additional fields
    data.userHandle = user.displayName;
    data.userID = user.id;
    data.problemSerialNumber = problem.serialNumber;
    data.problemTitle = problem.title;

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
