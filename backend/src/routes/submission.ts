import { Router, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { createSubmissionValidation } from '../validations/create-submission-validation';
import { IRequest } from '../utils/request-interface';
import { submitUserSubmission } from '../judger/judger';
import { isAuthenticated } from '../middleware/auth';

const submissionRouter: Router = Router();

const getSubmissions = async (request: IRequest, response: Response): Promise<void> => {
  try {
    // Build filter object based on query parameters
    const filter: any = {};

    if (request.query.username) {
      filter.username = request.query.username;
    }

    if (request.query.problemID) {
      filter.problemID = request.query.problemID;
    }

    if (request.query.status) {
      filter.status = request.query.status;
    }

    const submissions: ISubmission[] = await Submission.find(filter)
      .select('problemID username status language createdTime score results')
      .sort({ createdTime: 1 });
    response.status(200).send(submissions);
  } catch (error: unknown) {
    if (error) {
      response.status(400).send(error);
    }
  }
};

const createSubmission = async (request: IRequest, response: Response): Promise<void> => {
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

submissionRouter.get('/api/submissions', isAuthenticated, getSubmissions);
submissionRouter.post('/api/submissions', isAuthenticated, checkSchema(createSubmissionValidation), createSubmission);

export default submissionRouter;
