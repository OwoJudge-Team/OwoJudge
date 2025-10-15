import { Router, Request, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { createSubmissionValidation } from '../validations/create-submission-validation';
import { IRequest } from '../utils/request-interface';
import { submitUserSubmission } from '../judger/judger';

const submissionRouter: Router = Router();

const getSubmissions = async (request: IRequest, response: Response): Promise<void> => {
  if (!request.isAuthenticated() || !request.user) {
    response.status(401).send('Please login first');
    return;
  }
  try {
    const submissions: ISubmission[] = await Submission.find()
      .select('problemID username status language createdTime')
      .sort({ createdTime: 1 });
    response.status(200).send(submissions);
  } catch (error: unknown) {
    if (error) {
      response.status(400).send(error);
    }
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
  const newSubmission: ISubmission = new Submission(data);
  try {
    const savedSubmission: ISubmission = await newSubmission.save();
    submitUserSubmission(savedSubmission);
    response.status(201).send(savedSubmission);
  } catch (error: unknown) {
    console.log(`Error: ${error}`);
    response.status(400).send(error);
  }
};

submissionRouter.get('/api/submissions', getSubmissions);
submissionRouter.post('/api/submissions', checkSchema(createSubmissionValidation), createSubmission);

export default submissionRouter;
