/**
 * Contest schema module.
 *
 * Defines the Mongoose schema and model for programming contests,
 * including embedded problem lists and live standings.
 *
 * @module Schemas/Contest
 */

import mongoose, { Document, Schema } from 'mongoose';

/**
 * A problem entry within a contest.
 *
 * @property serialNumber - The problem's serial number (references {@link IProblem}).
 * @property score - Maximum score allocated to this problem in the contest.
 */
interface ProblemInContest {
    serialNumber: number;
    score: number;
}

/**
 * A user's score for a single problem within a contest standing.
 *
 * @property serialNumber - The problem's serial number.
 * @property score - The user's score on this problem.
 * @property lastSubmissionTime - Timestamp of the user's last submission for this problem.
 * @property solved - Whether the user has fully solved this problem.
 * @property submissionCount - Total submissions by the user for this problem.
 */
interface ProblemScore {
    serialNumber: number;
    score: number;
    lastSubmissionTime?: Date;
    solved: Boolean;
    submissionCount?: number;
}

/**
 * A user's standing (row) in the contest scoreboard.
 *
 * @property username - The participant's username.
 * @property totalScore - Sum of scores across all problems.
 * @property solvedCount - Number of problems fully solved.
 * @property problemScores - Per-problem breakdown of scores.
 * @property lastSubmissionTime - Timestamp of the user's most recent submission.
 * @property submissionCount - Total submissions across all problems.
 */
interface UserStanding {
    username: string;
    totalScore: number;
    solvedCount: number;
    problemScores: ProblemScore[];
    lastSubmissionTime?: Date;
    submissionCount?: number;
}

/**
 * Represents a contest document in MongoDB.
 *
 * @property title - Contest title.
 * @property description - Contest description / rules.
 * @property startTime - When the contest becomes visible / starts.
 * @property endTime - When the contest ends (optional for open-ended contests).
 * @property submissionEndTime - Hard deadline for accepting submissions.
 * @property released - Whether the contest is publicly visible.
 * @property problems - Embedded array of {@link ProblemInContest} entries.
 * @property standings - Embedded array of {@link UserStanding} entries.
 */
interface IContest extends Document {
  title: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  submissionEndTime: Date;
  released: boolean;
  problems: ProblemInContest[];
  standings: UserStanding[];
}

/**
 * Mongoose schema for {@link IContest}.
 *
 * Collection: `contests`
 *
 * | Field               | Type             | Required | Default | Notes                                   |
 * |---------------------|------------------|----------|---------|-----------------------------------------|
 * | `title`             | `String`         | Yes      | —       | Contest title                           |
 * | `description`       | `String`         | Yes      | —       | Contest description                     |
 * | `startTime`         | `Date`           | Yes      | —       | Contest start time                      |
 * | `endTime`           | `Date`           | No       | —       | Contest end time (optional)             |
 * | `submissionEndTime` | `Date`           | Yes      | —       | Hard deadline for submissions           |
 * | `released`          | `Boolean`        | No       | `false` | Public visibility flag                  |
 * | `problems`          | `ProblemInContest[]` | No    | `[]`    | Embedded problem entries                |
 * | `standings`         | `UserStanding[]` | No       | `[]`    | Live scoreboard entries                 |
 */
const contestSchema: Schema = new Schema({
  title: {
    type: Schema.Types.String,
    required: true
  },
  description: {
    type: Schema.Types.String,
    required: true
  },
  startTime: {
    type: Schema.Types.Date,
    required: true
  },
  endTime: {
    type: Schema.Types.Date,
    required: false
  },
  submissionEndTime: {
    type: Schema.Types.Date,
    required: true
  },
  released: {
    type: Schema.Types.Boolean,
    default: false
  },
  problems: [
    {
        serialNumber: Schema.Types.Number,
        score: Schema.Types.Number
    }
  ],
  standings: [
    {
      username: {
        type: Schema.Types.String,
        required: true
      },
      totalScore: {
        type: Schema.Types.Number,
        default: 0
      },
      solvedCount: {
        type: Schema.Types.Number,
        default: 0
      },
      problemScores: [
        {
          serialNumber: Schema.Types.Number,
          score: Schema.Types.Number,
          lastSubmissionTime: Schema.Types.Date,
          submissionCount: { type: Schema.Types.Number, default: 0 }
        }
      ],
      lastSubmissionTime: Schema.Types.Date,
      submissionCount: { type: Schema.Types.Number, default: 0 }
    }
  ]
});

/** Mongoose model for the `contests` collection. */
export const Contest = mongoose.model<IContest>('Contest', contestSchema);
export { IContest, UserStanding, ProblemScore, ProblemInContest, contestSchema };
