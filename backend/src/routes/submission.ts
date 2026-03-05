/**
 * Submission management routes.
 *
 * Endpoints for creating and querying code submissions.
 *
 * @module API/Submissions
 */

import { Router, Response } from 'express';
import { validationResult, matchedData, checkSchema } from 'express-validator';
import { Submission, ISubmission } from '../mongoose/schemas/submission';
import { SubmissionStatus } from '../utils/submission-status';
import { Problem, ProblemStatus } from '../mongoose/schemas/problems';
import { User, IUser, UserRole } from '../mongoose/schemas/users';
import { createSubmissionValidation } from '../validations/create-submission-validation';
import { IRequest } from '../utils/request-interface';
import { submitUserSubmission } from '../judger/judger';
import { isAuthenticated } from '../middleware/auth';

const submissionRouter: Router = Router();

/**
 * Retrieves a paginated list of submissions with optional filters.
 * Non-privileged users can only view their own submissions.
 * Admins and TAs can view all submissions.
 *
 * @route `GET /api/submissions`
 * @authentication Required.
 *
 * @param request - Express request. Supports query parameters:
 *   - `username` — filter by username (regex for admins, exact for self).
 *   - `userID` — filter by MongoDB ObjectId.
 *   - `problemSerialNumber` — filter by problem serial number.
 *   - `status` — filter by status (e.g. `AC`, `WA`, `TLE`). Regex supported.
 *   - `minScore` / `maxScore` — score range filter.
 *   - `offset` or `index` — number of records to skip (default 0).
 *   - `limit` — number of records to return (default 20).
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with `{ total: number, submissions: ISubmission[] }`.
 * - `400 Bad Request` on query error.
 *
 * @example
 * ##### Response Body
 * ```json
 * {
 *   "total": 123,
 *   "submissions": [
 *     {
 *       "_id": "68fb7890a1b2c3d4e5f67890",
 *       "serialNumber": 1000000,
 *       "username": "admin",
 *       "userID": "68fb6d6e6deaffa916ced917",
 *       "problemSerialNumber": 0,
 *       "problemTitle": "Problem Title",
 *       "language": "g++ c++17",
 *       "status": "AC",
 *       "score": 100,
 *       "time": 0.05,
 *       "memory": 2048,
 *       "createdAt": "2025-10-24T13:00:00.000Z"
 *     }
 *   ]
 * }
 * ```
 */
export const getSubmissions = async (request: IRequest, response: Response): Promise<void> => {
  const user = request.user as IUser;
  const isPrivileged = user.role === UserRole.JudgeAdmin || user.role === UserRole.TA;
  const query: any = isPrivileged ? {} : { username: user.username };

  // Add filters from query parameters
  const { username, userID, problemSerialNumber, status, minScore, maxScore } = request.query;
  if (username) {
    if (isPrivileged) {
      query.username = { $regex: username, $options: 'i' };
    } else if (username === user.username) {
      query.username = username;
    }
  }
  if (userID && (isPrivileged || userID === user.id.toString())) {
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
      .select('serialNumber problemSerialNumber problemTitle username userID status language createdAt score time memory')
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

/**
 * Retrieves a single submission by its serial number.
 * Non-admin users can only view their own submissions.
 *
 * @route `GET /api/submission/:serialNumber`
 * @authentication Required.
 *
 * @param request - Express request with `serialNumber` route parameter.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with the full submission object (source code, results, etc.).
 * - `403 Forbidden` if the user is not authorized to view this submission.
 * - `404 Not Found` if the submission does not exist.
 *
 * @example
 * ##### Response Body
 * ```json
 * {
 *   "_id": "68fb7890a1b2c3d4e5f67890",
 *   "serialNumber": 1000000,
 *   "username": "admin",
 *   "userID": "68fb6d6e6deaffa916ced917",
 *   "problemSerialNumber": 0,
 *   "problemTitle": "Problem Title",
 *   "language": "g++ c++17",
 *   "status": "AC",
 *   "score": 100,
 *   "time": 0.05,
 *   "memory": 2048,
 *   "createdAt": "2025-10-24T13:00:00.000Z",
 *   "userSolution": [
 *     {
 *       "filename": "main.cpp",
 *       "content": "#include <iostream>\nusing namespace std;\nint main() { ... }"
 *     }
 *   ],
 *   "results": {
 *     "sample": {
 *       "score": 0,
 *       "testcases": [
 *         {
 *           "testcase": "0-01",
 *           "status": "AC",
 *           "time": 0.01,
 *           "memory": 1024,
 *           "message": "ok"
 *         }
 *       ]
 *     },
 *     "subtask1": {
 *       "score": 100,
 *       "testcases": [
 *         {
 *           "testcase": "1-01",
 *           "status": "AC",
 *           "time": 0.02,
 *           "memory": 2048,
 *           "message": "ok"
 *         }
 *       ]
 *     }
 *   }
 * }
 * ```
 */
export const getSubmissionByID = async (request: IRequest, response: Response): Promise<void> => {
  const user = request.user as IUser;
  const { serialNumber } = request.params;

  try {
    const submission: ISubmission | null = await Submission.findOne({ serialNumber: parseInt(serialNumber) });
    if (!submission) {
      response.status(404).send('Submission not found');
      return;
    }

    // Check if user is authorized to view this submission
    if ((user.role !== UserRole.JudgeAdmin && user.role !== UserRole.TA) && submission.username !== user.username) {
      response.status(403).send('You are not authorized to view this submission');
      return;
    }

    response.status(200).send(submission);
  } catch (error: unknown) {
    console.log(`Error: ${error}`);
    response.status(400).send(error);
  }
};

/**
 * Creates a new code submission for a problem.
 *
 * Validates the problem exists and is `ready`, checks daily quota, then
 * queues the submission for judging. The initial status is `PD` (Pending).
 *
 * @route `POST /api/submissions`
 * @authentication Required.
 *
 * @param request - Express request. Body must contain:
 *   - `problemSerialNumber` (number) — the problem to submit to.
 *   - `language` (string) — language identifier (e.g. `"g++ c++17"`, `"python3"`).
 *   - `userSolution` (array) — source files, each with `filename` and `content`.
 * @param response - Express response.
 *
 * @returns
 * - `201 Created` with the saved submission object.
 * - `400 Bad Request` if validation fails or the problem is not ready.
 * - `404 Not Found` if the problem or user does not exist.
 * - `429 Too Many Requests` if the daily submission quota is exceeded.
 *
 * @example
 * ##### Request Body
 * ```json
 * {
 *   "problemSerialNumber": 0,
 *   "language": "g++ c++17",
 *   "userSolution": [
 *     {
 *       "filename": "main.cpp",
 *       "content": "#include <iostream>\nusing namespace std;\nint main() { ... }"
 *     }
 *   ]
 * }
 * ```
 *
 * ##### Response Body
 * ```json
 * {
 *   "_id": "68fb7890a1b2c3d4e5f67890",
 *   "serialNumber": 1000000,
 *   "username": "admin",
 *   "userID": "68fb6d6e6deaffa916ced917",
 *   "problemSerialNumber": 0,
 *   "problemTitle": "Problem Title",
 *   "language": "g++ c++17",
 *   "status": "PD",
 *   "score": 0,
 *   "createdAt": "2025-10-24T13:00:00.000Z",
 *   "userSolution": [
 *     {
 *       "filename": "main.cpp",
 *       "content": "#include <iostream>\nusing namespace std;\nint main() { ... }"
 *     }
 *   ],
 *   "results": {}
 * }
 * ```
 */
export const createSubmission = async (request: IRequest, response: Response): Promise<void> => {
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
    if (problem.dailyQuota && problem.dailyQuota > 0 && user.role !== UserRole.JudgeAdmin && user.role !== UserRole.TA) {
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

submissionRouter.get('/api/submissions', isAuthenticated, getSubmissions);
submissionRouter.get('/api/submission/:serialNumber', isAuthenticated, getSubmissionByID);
submissionRouter.post('/api/submissions', isAuthenticated, checkSchema(createSubmissionValidation), createSubmission);

export default submissionRouter;
