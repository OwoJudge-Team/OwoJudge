/**
 * Rejudge routes.
 *
 * Endpoints for retriggering judgement on existing submissions, individually or in batch.
 * All endpoints require JudgeAdmin privileges.
 *
 * @module Rejudge
 */

import { Router, Response } from 'express';
import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { SubmissionStatus } from '../utils/submission-status';
import { Problem, IProblem } from '../mongoose/schemas/problems';
import { IUser } from '../mongoose/schemas/users';
import { IRequest } from '../utils/request-interface';
import { submitUserSubmission } from '../judger/judger';
import { isJudgeAdmin } from '../middleware/auth';

const rejudgeRouter: Router = Router();

/**
 * Batch rejudge multiple submissions by serial numbers.
 * Resets each submission’s status to `PD`, score to 0, clears results,
 * and re-queues it for judging.
 *
 * @route `POST /api/rejudge/submissions`
 * @authentication Only for JudgeAdmins.
 *
 * @param request - Express request. Body must contain:
 *   - `serialNumbers` (number[]) — array of submission serial numbers to rejudge.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with a message indicating how many submissions were rejudged.
 * - `400 Bad Request` if `serialNumbers` is not an array.
 * - `404 Not Found` if no matching submissions exist.
 *
 * @example
 * ##### Request Body
 * ```json
 * {
 *   "serialNumbers": [100, 101, 102]
 * }
 * ```
 */
export const rejudgeSubmissions = async (request: IRequest, response: Response): Promise<void> => {
  const { serialNumbers } = request.body;

  if (!Array.isArray(serialNumbers)) {
    response.status(400).send('serialNumbers must be an array');
    return;
  }

  try {
    const submissions: ISubmission[] = await Submission.find({ serialNumber: { $in: serialNumbers } });
    
    if (submissions.length === 0) {
      response.status(404).send('No submissions found');
      return;
    }

    for (const submission of submissions) {
      submission.status = SubmissionStatus.PD;
      submission.score = 0;
      submission.results = {};
      await submission.save();
      submitUserSubmission(submission);
    }

    response.status(200).send(`Rejudge triggered for ${submissions.length} submissions.`);
  } catch (error: unknown) {
    console.log(`Error: ${error}`);
    response.status(400).send(error);
  }
};

/**
 * Batch rejudge all submissions for the given problem serial numbers.
 * Finds every submission associated with the specified problems, resets them,
 * and re-queues them for judging.
 *
 * @route `POST /api/rejudge/problems`
 * @authentication Only for JudgeAdmins.
 *
 * @param request - Express request. Body must contain:
 *   - `serialNumbers` (number[]) — array of problem serial numbers.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with a message indicating counts of rejudged submissions and problems.
 * - `400 Bad Request` if `serialNumbers` is not an array.
 * - `404 Not Found` if no matching problems exist.
 *
 * @example
 * ##### Request Body
 * ```json
 * {
 *   "serialNumbers": [1, 2]
 * }
 * ```
 */
export const rejudgeProblems = async (request: IRequest, response: Response): Promise<void> => {
  const { serialNumbers } = request.body;

  if (!Array.isArray(serialNumbers)) {
    response.status(400).send('serialNumbers must be an array');
    return;
  }

  try {
    // Verify problems exist
    const problems: IProblem[] = await Problem.find({ serialNumber: { $in: serialNumbers } });
    
    if (problems.length === 0) {
      response.status(404).send('No problems found');
      return;
    }

    const foundProblemIDs = problems.map(p => p.serialNumber);
    
    // Find all submissions for these problems
    const submissions: ISubmission[] = await Submission.find({ problemSerialNumber: { $in: foundProblemIDs } });

    for (const submission of submissions) {
      submission.status = SubmissionStatus.PD;
      submission.score = 0;
      submission.results = {};
      await submission.save();
      submitUserSubmission(submission);
    }

    response.status(200).send(`Rejudge triggered for ${submissions.length} submissions across ${problems.length} problems.`);
  } catch (error: unknown) {
    console.log(`Error: ${error}`);
    response.status(400).send(error);
  }
};

/**
 * Rejudge a single submission by its serial number.
 *
 * @route `POST /api/rejudge/submission/:serialNumber`
 * @authentication Only for JudgeAdmins.
 *
 * @param request - Express request with `serialNumber` route parameter.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with the updated submission object.
 * - `404 Not Found` if the submission does not exist.
 */
export const rejudgeSubmission = async (request: IRequest, response: Response): Promise<void> => {
  const { serialNumber } = request.params;

  try {
    const submission: ISubmission | null = await Submission.findOne({ serialNumber: parseInt(serialNumber) });
    if (!submission) {
      response.status(404).send('Submission not found');
      return;
    }

    submission.status = SubmissionStatus.PD;
    submission.score = 0;
    submission.results = {};
    await submission.save();

    submitUserSubmission(submission);

    response.status(200).send(submission);
  } catch (error: unknown) {
    console.log(`Error: ${error}`);
    response.status(400).send(error);
  }
};

/**
 * Rejudge all submissions for a single problem.
 *
 * @route `POST /api/rejudge/problem/:serialNumber`
 * @authentication Only for JudgeAdmins.
 *
 * @param request - Express request with `serialNumber` route parameter (problem serial number).
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with a message indicating how many submissions were rejudged.
 * - `400 Bad Request` if `serialNumber` is not a valid number.
 * - `404 Not Found` if the problem does not exist.
 */
export const rejudgeProblem = async (request: IRequest, response: Response): Promise<void> => {
  const serialNumber = parseInt(request.params.serialNumber);

  if (isNaN(serialNumber)) {
    response.status(400).send('Invalid problem ID');
    return;
  }

  try {
    const problem: IProblem | null = await Problem.findOne({ serialNumber });
    if (!problem) {
      response.sendStatus(404);
      return;
    }

    const submissions: ISubmission[] = await Submission.find({ problemSerialNumber: serialNumber });

    // Process submissions in chunks to avoid overwhelming the database/judger
    for (const submission of submissions) {
      submission.status = SubmissionStatus.PD;
      submission.score = 0;
      submission.results = {};
      await submission.save();

      // We don't await the submission process here to avoid timeout
      // The judger queue handle it eventually
      submitUserSubmission(submission);
    }

    response.status(200).send(`Rejudge triggered for ${submissions.length} submissions.`);
  } catch (error) {
    console.log(error);
    response.status(500).send('Internal Server Error');
  }
};

rejudgeRouter.post('/api/rejudge/submissions', isJudgeAdmin, rejudgeSubmissions);
rejudgeRouter.post('/api/rejudge/problems', isJudgeAdmin, rejudgeProblems);
rejudgeRouter.post('/api/rejudge/submission/:serialNumber', isJudgeAdmin, rejudgeSubmission);
rejudgeRouter.post('/api/rejudge/problem/:serialNumber', isJudgeAdmin, rejudgeProblem);

export default rejudgeRouter;
