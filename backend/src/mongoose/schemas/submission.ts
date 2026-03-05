/**
 * Submission schema module.
 *
 * Defines the Mongoose schema and model for code submissions,
 * including user solution files, judge results, and auto-increment serial numbers.
 *
 * @module Schemas/Submission
 */

import mongoose, { Schema, model, Document } from 'mongoose';
import { SubmissionStatus } from '../../utils/submission-status';

/**
 * A single source file in a user's submission.
 *
 * @property filename - The source file name (e.g. `"main.cpp"`).
 * @property content - The file's source code content.
 */
interface IUserSolution {
  filename: string;
  content: string;
}

const userSolutionSchema = new Schema<IUserSolution>({
  filename: { type: String, required: true },
  content: { type: String, required: true },
}, { _id: false });

/**
 * The judge result of a single testcase.
 *
 * @property testcase - Testcase identifier (e.g. `"1-01"`).
 * @property status - Verdict for this testcase (see {@link SubmissionStatus}).
 * @property time - Execution time in seconds.
 * @property memory - Peak memory usage in KB.
 * @property message - Optional judge message (e.g. `"ok"`, `"wrong answer"`).
 */
interface ITestCaseResult {
  testcase: string;
  status: SubmissionStatus;
  time: number;
  memory: number;
  message?: string;
}

const testCaseResultSchema = new Schema<ITestCaseResult>({
  testcase: { type: String, required: true },
  status: { type: String, enum: Object.values(SubmissionStatus), required: true },
  time: { type: Number, required: true },
  memory: { type: Number, required: true },
  message: { type: String }
}, { _id: false });

/**
 * Aggregated result for a subtask / testcase group.
 *
 * @property score - Score awarded for this group.
 * @property testcases - Individual testcase results within the group.
 */
interface IGroupResult {
  score: number;
  testcases: ITestCaseResult[];
}

const groupResultSchema = new Schema<IGroupResult>({
  score: { type: Number, required: true },
  testcases: [testCaseResultSchema]
}, { _id: false });

/**
 * Represents a submission document in MongoDB.
 *
 * @property serialNumber - Auto-incremented unique submission number (starts at `1000000`).
 * @property problemSerialNumber - The problem this submission targets.
 * @property problemTitle - Snapshot of the problem title at submission time.
 * @property username - Username of the submitter.
 * @property userID - MongoDB ObjectId referencing the `User` document.
 * @property language - Language identifier (e.g. `"g++ c++17"`, `"python3"`).
 * @property userSolution - Array of source files ({@link IUserSolution}).
 * @property status - Current judge verdict ({@link SubmissionStatus}).
 * @property createdAt - Timestamp when the submission was created (auto via `timestamps`).
 * @property updatedAt - Timestamp when the submission was last updated (auto via `timestamps`).
 * @property score - Total score (default `0`).
 * @property time - Peak execution time in seconds (default `0`).
 * @property memory - Peak memory usage in KB (default `0`).
 * @property results - Per-group judge results, keyed by group name (e.g. `"sample"`, `"subtask1"`).
 */
interface ISubmission extends Document {
  serialNumber: number;
  problemSerialNumber: number;
  problemTitle: string;
  username: string;
  userID: mongoose.Types.ObjectId;
  language: string;
  userSolution: IUserSolution[];
  status: SubmissionStatus;
  createdAt: Date;
  updatedAt: Date;
  score?: number;
  time?: number;
  memory?: number;
  results?: { [groupName: string]: IGroupResult };
}

/**
 * Mongoose schema for {@link ISubmission}.
 *
 * Collection: `submissions`
 *
 * | Field                  | Type       | Required | Default     | Unique | Notes                                |
 * |------------------------|------------|----------|-------------|--------|--------------------------------------|
 * | `serialNumber`         | `Number`   | No       | Auto-inc    | Yes    | Starts at `1000000`                  |
 * | `problemSerialNumber`  | `Number`   | Yes      | —           | No     | Target problem                       |
 * | `problemTitle`         | `String`   | Yes      | —           | No     | Problem title snapshot               |
 * | `username`             | `String`   | Yes      | —           | No     | Submitter username                   |
 * | `userID`               | `ObjectId` | Yes      | —           | No     | Ref to `User`                        |
 * | `language`             | `String`   | Yes      | —           | No     | Language identifier                  |
 * | `userSolution`         | `Array`    | No       | `[]`        | No     | {@link IUserSolution} entries        |
 * | `status`               | `String`   | No       | `"pending"` | No     | {@link SubmissionStatus}             |
 * | `score`                | `Number`   | No       | `0`         | No     | Total score                          |
 * | `time`                 | `Number`   | No       | `0`         | No     | Peak time (seconds)                  |
 * | `memory`               | `Number`   | No       | `0`         | No     | Peak memory (KB)                     |
 * | `results`              | `Mixed`    | No       | `{}`        | No     | Per-group {@link IGroupResult}       |
 *
 * Indexes: `problemSerialNumber`, `username`, `userID`, `status`, `createdAt` (desc)
 */
const submissionSchema = new Schema<ISubmission>({
  serialNumber: { type: Schema.Types.Number, unique: true },
  problemSerialNumber: { type: Schema.Types.Number, required: true },
  problemTitle: { type: Schema.Types.String, required: true },
  username: { type: Schema.Types.String, required: true },
  userID: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  language: { type: Schema.Types.String, required: true },
  userSolution: [userSolutionSchema],
  status: { type: Schema.Types.String, enum: Object.values(SubmissionStatus), default: SubmissionStatus.PD },
  score: { type: Schema.Types.Number, default: 0 },
  time: { type: Schema.Types.Number, default: 0 },
  memory: { type: Schema.Types.Number, default: 0 },
  results: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

submissionSchema.index({ problemSerialNumber: 1 });
submissionSchema.index({ username: 1 });
submissionSchema.index({ userID: 1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ createdAt: -1 });

/**
 * Auto-increment hook for `serialNumber`.
 *
 * On first save, finds the highest existing serial number and assigns
 * the next value. Serial numbers start from `1000000`.
 */
// Auto-increment serialNumber using pre-save hook
submissionSchema.pre('save', async function () {
  if (this.isNew && !this.serialNumber) {
    // Find the highest existing serialNumber
    const lastSubmission = await mongoose.model('Submission').findOne(
      {},
      { serialNumber: 1 },
      { sort: { serialNumber: -1 } }
    );

    // Set serialNumber starting from 1000000
    this.serialNumber = lastSubmission?.serialNumber
      ? lastSubmission.serialNumber + 1
      : 1000000;
  }
});

/** Mongoose model for the `submissions` collection. */
const Submission = model<ISubmission>('Submission', submissionSchema);

export { Submission, ISubmission, IUserSolution, ITestCaseResult, IGroupResult, submissionSchema };
