/**
 * Contest management routes.
 *
 * Endpoints for creating, updating, deleting contests and viewing/recalculating standings.
 *
 * @module API/Contests
 */

import { Router, Response } from 'express';
import { validationResult, checkSchema } from 'express-validator';
import { Contest, IContest, UserStanding } from '../mongoose/schemas/contests';
import { IUser } from '../mongoose/schemas/users';
import { IRequest } from '../utils/request-interface';
import { Submission } from '../mongoose/schemas/submission';
import { recalculateContestStandings, updateUserStanding } from '../utils/standing-utils';
import { createContestValidation } from '../validations/create-contest-validation';
import { updateContestValidation } from '../validations/update-contest-validation';
import { isJudgeAdmin, isTA, isAuthenticated } from '../middleware/auth';
import { UserRole } from '../mongoose/schemas/users';

const contestsRouter = Router();

/**
 * Retrieves all contests.
 *
 * @route `GET /api/contests`
 * @authentication
 * - **Released** contests: open to all users.
 * - **Unreleased** contests: open to JudgeAdmins and TAs.
 *
 * @param request - Express request with session.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with an array of contest objects, sorted newest first.
 */
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

/**
 * Retrieves a single contest by its MongoDB ObjectId.
 *
 * @route `GET /api/contests/:id`
 * @authentication
 * - **Released** contests: open to all users.
 * - **Unreleased** contests: open to JudgeAdmins and TAs.
 *
 * @param request - Express request with `id` route parameter.
 * @param response - Express response.
 *
 * @returns 
 * - `200 OK` with the contest object (problems populated).
 * - `400 Bad Request` if `id` is missing.
 * - `404 Not Found` if the contest does not exist or is unreleased for this user.
 */
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

/**
 * Creates a new contest.
 *
 * @route `POST /api/contests`
 * @authentication Only for TAs and JudgeAdmins.
 *
 * @param request - Express request. Body fields:
 *   - `title` (string) - contest title.
 *   - `description` (string) - contest description.
 *   - `startTime` (Date) - contest start time.
 *   - `endTime` (Date) - contest end time.
 *   - `submissionEndTime` (Date, optional) - deadline for late submissions.
 *   - `problems` (ObjectId[]) - array of problem references.
 *   - `released` (boolean, default false) - whether the contest is publicly visible.
 * @param response - Express response.
 *
 * @returns
 * - `201 Created` with the saved contest object.
 * - `400 Bad Request` if validation fails.
 *
 * @example
 * ##### Request Body
 * ```json
 * {
 *   "title": "Fall Programming Contest 2025",
 *   "description": "Annual fall programming contest featuring algorithmic challenges.",
 *   "startTime": "2025-11-01T09:00:00.000Z",
 *   "endTime": "2025-11-01T14:00:00.000Z",
 *   "problems": [
 *     {
 *       "serialNumber": 0,
 *       "score": 100
 *     }
 *   ]
 * }
 * ```
 *
 * ##### Response Body
 * ```json
 * {
 *   "_id": "68fb7a00b2c3d4e5f6789012",
 *   "title": "Fall Programming Contest 2025",
 *   "description": "Annual fall programming contest featuring algorithmic challenges.",
 *   "startTime": "2025-11-01T09:00:00.000Z",
 *   "endTime": "2025-11-01T14:00:00.000Z",
 *   "problems": [
 *     {
 *       "serialNumber": 0,
 *       "score": 100
 *     }
 *   ],
 *   "standings": [],
 *   "createdTime": "2025-10-24T13:30:00.000Z"
 * }
 * ```
 */
const createContest = async (request: IRequest, response: Response) => {
  const result = validationResult(request);
  if (!result.isEmpty()) {
    response.status(400).send(result.array());
    return;
  }
  const { title, description, startTime, endTime, submissionEndTime, problems, released, canApplyGM } = request.body;
  const newContest = new Contest({
    title,
    description,
    startTime,
    endTime,
    submissionEndTime,
    problems,
    released: released ?? false,
    canApplyGM: canApplyGM ?? false
  });
  try {
    const savedContest: IContest = await newContest.save();
    response.status(201).send(savedContest);
  } catch (error) {
    console.log(`Error: ${error}`);
    response.status(400).send(error);
  }
};

/**
 * Updates an existing contest.
 *
 * @route `PATCH /api/contests/:id`
 * @authentication Only for TAs and JudgeAdmins.
 *
 * @param request - Express request with `id` route parameter and update fields in body.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with the updated contest object.
 * - `400 Bad Request` if `id` is missing or update fails.
 * - `404 Not Found` if the contest does not exist.
 * 
 * @example
 * ##### Request Body
 * ```json
 * {
 *   "title": "Fall Programming Contest 2025 - Updated",
 *   "endTime": "2025-11-01T15:00:00.000Z"
 * }
 * ```
 *
 * ##### Response Body
 * ```json
 * {
 *   "_id": "68fb7a00b2c3d4e5f6789012",
 *   "title": "Fall Programming Contest 2025 - Updated",
 *   "endTime": "2025-11-01T15:00:00.000Z"
 * }
 * ```
 */
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

/**
 * Deletes a contest.
 *
 * @route `DELETE /api/contests/:id`
 * @authentication Only for JudgeAdmins.
 *
 * @param request - Express request with `id` route parameter.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with the deleted contest object.
 * - `400 Bad Request` if `id` is missing.
 * - `404 Not Found` if the contest does not exist.
 * 
 * @example
 * ##### Response Body
 * ```json
 * {
 *   "_id": "68fb7a00b2c3d4e5f6789012",
 *   "title": "Fall Programming Contest 2025"
 * }
 * ```
 */
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

/**
 * Retrieves the standings for a contest.
 * Standings are sorted by `totalScore` descending, then by `submissionCount` ascending (lower is better).
 *
 * @route `GET /api/contests/:id/standings`
 *
 * @param request - Express request with `id` route parameter.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with a sorted array of {@link UserStanding} objects.
 * - `400 Bad Request` if `id` is missing.
 * - `404 Not Found` if the contest does not exist.
 * 
 * @example
 * ##### Response Body
 * ```json
 * [
 *   {
 *     "username": "user1",
 *     "totalScore": 200,
 *     "solvedCount": 2,
 *     "problemScores": [
 *       {
 *         "serialNumber": 0,
 *         "score": 100,
 *         "lastSubmissionTime": "2025-11-01T10:00:00.000Z"
 *       },
 *       {
 *         "serialNumber": 1,
 *         "score": 100,
 *         "lastSubmissionTime": "2025-11-01T11:00:00.000Z"
 *       }
 *     ],
 *     "lastSubmissionTime": "2025-11-01T11:00:00.000Z"
 *   }
 * ]
 * ```
 */
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

/**
 * Recalculates and updates the standings for a contest.
 * Delegates to {@link recalculateContestStandings}.
 *
 * @route `POST /api/contests/:id/standings/update`
 * @authentication Only for JudgeAdmins.
 *
 * @param request - Express request with `id` route parameter.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with `{ message, standings }` on success.
 * - `400 Bad Request` if `id` is missing.
 * - `404 Not Found` if the contest does not exist.
 * 
 * @example
 * ##### Response Body
 * ```json
 * {
 *   "message": "Standings updated successfully",
 *   "standings": [
 *     {
 *       "username": "user1",
 *       "totalScore": 200,
 *       "solvedCount": 2,
 *       "problemScores": [
 *         {
 *           "serialNumber": 0,
 *           "score": 100,
 *           "lastSubmissionTime": "2025-11-01T10:00:00.000Z"
 *         }
 *       ],
 *       "lastSubmissionTime": "2025-11-01T11:00:00.000Z"
 *     }
 *   ]
 * }
 * ```
 */
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

const GM_BUDGET = 8;

/**
 * Allocates golden medals across multiple contests in a single request.
 * Each entry in the request body maps a contest ID to the number of medals to
 * allocate there. The total across all entries must not exceed 8.
 * Each listed contest must have `canApplyGM` enabled and the user must already
 * have a standing. All standings are recalculated immediately.
 *
 * @route `PATCH /api/contests/use-gm`
 * @authentication Required.
 *
 * @param request - Express request. Body is a plain object mapping contest IDs
 *   to non-negative integer medal counts:
 *   `{ [contestId: string]: number }`
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with an object mapping each contest ID to `{ goldenMedalCount, standing }`.
 * - `400 Bad Request` if the body is not a plain object, any count is invalid,
 *   the total exceeds 8, or a contest does not allow golden medals.
 * - `404 Not Found` if any contest does not exist or the user has no standing in it.
 *
 * @example
 * ##### Request Body
 * ```json
 * {
 *   "507f1f77bcf86cd799439011": 3,
 *   "507f1f77bcf86cd799439012": 2
 * }
 * ```
 *
 * ##### Response Body
 * ```json
 * {
 *   "507f1f77bcf86cd799439011": { "goldenMedalCount": 3, "standing": { "username": "user1", "totalScore": 95 } },
 *   "507f1f77bcf86cd799439012": { "goldenMedalCount": 2, "standing": { "username": "user1", "totalScore": 88 } }
 * }
 * ```
 */
const batchUseGoldenMedal = async (request: IRequest, response: Response) => {
  const allocation = request.body;

  if (!allocation || typeof allocation !== 'object' || Array.isArray(allocation)) {
    response.status(400).send('Request body must be a map of contestId to GM count');
    return;
  }

  for (const [contestId, count] of Object.entries(allocation)) {
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > GM_BUDGET) {
      response.status(400).send(
        `Invalid count for contest ${contestId}: must be an integer between 0 and ${GM_BUDGET}`
      );
      return;
    }
  }

  const total = Object.values(allocation as Record<string, number>).reduce((sum, c) => sum + c, 0);
  if (total > GM_BUDGET) {
    response.status(400).send(
      `Total allocation ${total} exceeds the golden medal budget of ${GM_BUDGET}`
    );
    return;
  }

  const user = request.user as IUser;
  const username = user.username;

  try {
    const results: Record<string, { goldenMedalCount: number; standing: UserStanding | undefined }> = {};

    for (const [contestId, count] of Object.entries(allocation as Record<string, number>)) {
      const contest = await Contest.findById(contestId);
      if (!contest) {
        response.status(404).send(`Contest ${contestId} not found`);
        return;
      }

      if (!contest.canApplyGM) {
        response.status(400).send(`Golden medals are not allowed in contest ${contestId}`);
        return;
      }

      const existingStanding = contest.standings.find(s => s.username === username);
      if (!existingStanding) {
        response.status(404).send(`You have no standing in contest ${contestId}`);
        return;
      }

      await updateUserStanding(contest, username, count);

      const updatedContest = await Contest.findById(contestId);
      const updatedStanding = updatedContest?.standings.find(s => s.username === username);

      results[contestId] = { goldenMedalCount: count, standing: updatedStanding };
    }

    response.status(200).send(results);
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
};

/**
 * Sets the number of golden medals the authenticated user allocates to a contest.
 * Each golden medal reduces the late-submission delay by 1 day for every problem
 * in the contest. A user has a total budget of 8 golden medals shared across all
 * contests; the sum of medals allocated across all contests must not exceed this limit.
 * The user's standing is recalculated immediately after the allocation changes.
 *
 * Late penalty formula:
 * `effective_score = submission_score * max(0, 1 - delay_secs / (5 * 86400))`
 * where `delay_secs = max(0, seconds_after_end_time - count * 86400)`.
 *
 * @route `PATCH /api/contests/:id/use-gm`
 * @authentication Required.
 *
 * @param request - Express request with `id` route parameter. Body fields:
 *   - `count` (number, 0–8) - number of golden medals to allocate to this contest.
 * @param response - Express response.
 *
 * @returns
 * - `200 OK` with `{ goldenMedalCount, standing }` after recalculating.
 * - `400 Bad Request` if `id` is missing, golden medals are not allowed, `count` is
 *   invalid, or the allocation would exceed the user's total budget of 8.
 * - `404 Not Found` if the contest does not exist or the user has no standing.
 *
 * @example
 * ##### Request Body
 * ```json
 * { "count": 2 }
 * ```
 *
 * ##### Response Body
 * ```json
 * {
 *   "goldenMedalCount": 2,
 *   "standing": {
 *     "username": "user1",
 *     "totalScore": 195,
 *     "solvedCount": 2,
 *     "goldenMedalCount": 2,
 *     "problemScores": [
 *       {
 *         "serialNumber": 0,
 *         "score": 98,
 *         "lastSubmissionTime": "2025-11-02T10:00:00.000Z"
 *       }
 *     ],
 *     "lastSubmissionTime": "2025-11-02T10:00:00.000Z"
 *   }
 * }
 * ```
 */
const useGoldenMedal = async (request: IRequest, response: Response) => {
  const id: string | undefined = request.params?.id;
  if (!id) {
    response.status(400).send('Contest ID is required');
    return;
  }

  const count: number = request.body?.count;
  if (typeof count !== 'number' || !Number.isInteger(count) || count < 0 || count > GM_BUDGET) {
    response.status(400).send(`count must be an integer between 0 and ${GM_BUDGET}`);
    return;
  }

  try {
    const contest = await Contest.findById(id);
    if (!contest) {
      response.sendStatus(404);
      return;
    }

    if (!contest.canApplyGM) {
      response.status(400).send('Golden medals are not allowed in this contest');
      return;
    }

    const user = request.user as IUser;
    const username = user.username;

    const existingStanding = contest.standings.find(s => s.username === username);
    if (!existingStanding) {
      response.status(404).send('You have no standing in this contest');
      return;
    }

    // Sum GM usage across all other contests for this user
    const otherContests = await Contest.find({
      _id: { $ne: contest._id },
      'standings.username': username
    });
    const usedElsewhere = otherContests.reduce((sum, c) => {
      const s = c.standings.find(s => s.username === username);
      return sum + (s?.goldenMedalCount ?? 0);
    }, 0);

    if (usedElsewhere + count > GM_BUDGET) {
      response.status(400).send(
        `Insufficient golden medals: ${usedElsewhere} already allocated elsewhere, only ${GM_BUDGET - usedElsewhere} remaining`
      );
      return;
    }

    await updateUserStanding(contest, username, count);

    const updatedContest = await Contest.findById(id);
    const updatedStanding = updatedContest?.standings.find(s => s.username === username);

    response.status(200).send({
      goldenMedalCount: count,
      standing: updatedStanding
    });
  } catch (error) {
    console.log(error);
    response.status(500).send(error);
  }
};

contestsRouter.get('/api/contests', getAllContests);
contestsRouter.get('/api/contests/:id', getContestByID);
contestsRouter.get('/api/contests/:id/standings', getStandings);
contestsRouter.post('/api/contests', isTA, checkSchema(createContestValidation), createContest);
contestsRouter.post('/api/contests/:id/standings/update', isJudgeAdmin, updateStandings);
contestsRouter.patch('/api/contests/use-gm', isAuthenticated, batchUseGoldenMedal);
contestsRouter.patch('/api/contests/:id/use-gm', isAuthenticated, useGoldenMedal);
contestsRouter.patch(
  '/api/contests/:id',
  isTA,
  checkSchema(updateContestValidation),
  updateContest
);
contestsRouter.delete('/api/contests/:id', isJudgeAdmin, deleteContest);

export default contestsRouter;
export { getAllContests, getContestByID, createContest, updateContest, deleteContest, getStandings, updateStandings, useGoldenMedal, batchUseGoldenMedal };

