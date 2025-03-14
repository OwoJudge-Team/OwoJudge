import { Router, Request, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { createSubmissionValidation } from '../validations/create-submission-validation';

const submissionRouter: Router = Router();

submissionRouter.get('/api/submissions', async (request: Request, response: Response): Promise<Response> => {
  if (!request.user) {
    return response.status(401).send('Please login first');
  }
  try {
    const submissions: ISubmission[] = await Submission.find()
      .select('problemID username status language createdTime')
      .sort({ createdTime: 1 });
    return response.status(200).send(submissions);
  } catch (error: unknown) {
    if (error) {
      return response.status(400).send(error);
    }
  }
});

submissionRouter.post(
  '/api/submissions',
  checkSchema(createSubmissionValidation),
  async (request: Request, response: Response): Promise<Response> => {
    if (!request.user) {
      return response.status(401).send('Please login first');
    }
    const result = validationResult(request);
    if (!result.isEmpty()) {
      return response.status(400).send(result.array());
    }
    const data: Partial<ISubmission> = matchedData(request);
    const newSubmission: ISubmission = new Submission(data);
    try {
      newSubmission.createdTime = new Date();
      newSubmission.status = 'pending';
      newSubmission.result = {
        score: -1,
        maxTime: -1,
        maxMemory: -1,
        individual: []
      };
      const savedSubmission: ISubmission = await newSubmission.save();
      return response.status(201).send(savedSubmission);
    } catch (error: unknown) {
      console.log(`Error: ${error}`);
      return response.status(400).send(error);
    }
  }
);

export default submissionRouter;
