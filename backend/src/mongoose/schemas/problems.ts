/**
 * Problem schema module.
 *
 * Defines the Mongoose schema and model for programming problems,
 * including testcase metadata, score policies, and submission/user statistics.
 *
 * @module Schemas/Problem
 */

import mongoose, { Document, Schema } from 'mongoose';
import { Counter } from './counters';

/**
 * Scoring policy for evaluating submissions.
 *
 * | Policy | Description                                     |
 * |--------|-------------------------------------------------|
 * | `sum`  | Sum scores across all subtasks                  |
 * | `max`  | Take the maximum score among all submissions    |
 * | `min`  | Take the minimum score among all submissions    |
 */
enum ScorePolicy {
  Sum = 'sum',
  Max = 'max',
  Min = 'min'
}

/**
 * Problem readiness status.
 *
 * | Status    | Description                                       |
 * |-----------|---------------------------------------------------|
 * | `ready`   | Problem is fully configured and accepting submissions |
 * | `waiting` | Problem is being processed / testcases loading    |
 * | `error`   | Problem setup encountered an error                |
 */
export enum ProblemStatus {
  Ready = 'ready',
  Waiting = 'waiting',
  Error = 'error'
}

/**
 * A single testcase entry within a problem.
 *
 * @property filename - Testcase input filename (e.g. `"1-01"`).
 * @property point - Points awarded for passing this testcase.
 * @property subtask - Subtask group name (e.g. `"sample"`, `"subtask1"`).
 */
interface ITestcase {
  filename: string;
  point: number;
  subtask: string;
}

/**
 * Represents a problem document in MongoDB.
 *
 * @property serialNumber - Auto-incremented unique problem number.
 * @property createdTime - Timestamp when the problem was created.
 * @property title - Display title.
 * @property fileName - The problem's directory / file name on disk.
 * @property timeLimit - Time limit in seconds per testcase.
 * @property memoryLimit - Memory limit in KB per testcase.
 * @property processes - Maximum number of processes allowed (default `1`).
 * @property fullScore - Maximum achievable score.
 * @property dailyQuota - Optional daily submission limit per user.
 * @property released - Whether the problem is publicly visible.
 * @property status - One of {@link ProblemStatus}.
 * @property statusReason - Human-readable reason for the current status (e.g. error message).
 * @property scorePolicy - One of {@link ScorePolicy}.
 * @property hasGrader - Whether the problem uses a custom grader.
 * @property testcase - Array of {@link ITestcase} entries.
 * @property tags - Classification tags (e.g. `["DP", "Graph"]`).
 * @property problemRelatedTags - Additional related tags.
 * @property submissionDetail - Aggregated submission verdict counters.
 * @property userDetail - Aggregated user solve/attempt counters.
 */
interface IProblem extends Document {
  serialNumber: number;
  createdTime: Date;
  title: string;
  fileName: string;
  timeLimit: number;
  memoryLimit: number;
  processes: number;
  fullScore: number;
  dailyQuota?: number;
  released: boolean;
  status: ProblemStatus;
  statusReason?: string;
  scorePolicy: ScorePolicy;
  hasGrader?: boolean;
  testcase: ITestcase[];
  tags?: string[];
  problemRelatedTags?: string[];
  submissionDetail: {
    accepted: number;
    submitted: number;
    timeLimitExceeded: number;
    memoryLimitExceeded: number;
    wrongAnswer: number;
    runtimeError: number;
    compilationError: number;
    processLimitExceeded: number;
  };
  userDetail: {
    solved: number;
    attempted: number;
  };
}

/**
 * Mongoose schema for {@link IProblem}.
 *
 * Collection: `problems`
 *
 * | Field              | Type       | Required | Default      | Unique | Notes                              |
 * |--------------------|------------|----------|--------------|--------|------------------------------------|
 * | `serialNumber`     | `Number`   | No       | Auto-inc     | Yes    | Auto-incremented via counter       |
 * | `createdTime`      | `Date`     | Yes      | `Date.now`   | No     | Creation timestamp                 |
 * | `fileName`         | `String`   | Yes      | —            | No     | Problem directory name             |
 * | `title`            | `String`   | Yes      | —            | No     | Display title                      |
 * | `timeLimit`        | `Number`   | Yes      | —            | No     | Seconds per testcase               |
 * | `memoryLimit`      | `Number`   | Yes      | —            | No     | KB per testcase                    |
 * | `processes`        | `Number`   | Yes      | `1`          | No     | Max processes                      |
 * | `fullScore`        | `Number`   | Yes      | —            | No     | Maximum score                      |
 * | `dailyQuota`       | `Number`   | No       | —            | No     | Daily submission limit             |
 * | `released`         | `Boolean`  | No       | `false`      | No     | Public visibility                  |
 * | `status`           | `String`   | No       | `"waiting"`  | No     | {@link ProblemStatus}              |
 * | `statusReason`     | `String`   | No       | —            | No     | Human-readable reason for status   |
 * | `scorePolicy`      | `String`   | Yes      | —            | No     | {@link ScorePolicy}                |
 * | `hasGrader`        | `Boolean`  | No       | `false`      | No     | Custom grader flag                 |
 * | `testcase`         | `Array`    | No       | `[]`         | No     | {@link ITestcase} entries          |
 * | `tags`             | `[String]` | No       | `[]`         | No     | Classification tags                |
 * | `problemRelatedTags`| `[String]`| No       | `[]`         | No     | Related tags                       |
 * | `submissionDetail` | `Object`   | No       | all `0`      | No     | Verdict counters                   |
 * | `userDetail`       | `Object`   | No       | all `0`      | No     | Solve/attempt counters             |
 */
const problemSchema = new Schema<IProblem>({
  serialNumber: { type: Number, unique: true },
  createdTime: { type: Date, required: true, default: Date.now },
  fileName: { type: String, required: true },
  title: { type: String, required: true },
  timeLimit: { type: Number, required: true },
  memoryLimit: { type: Number, required: true },
  processes: { type: Number, required: true, default: 1 },
  fullScore: { type: Number, required: true },
  dailyQuota: { type: Number },
  released: { type: Boolean, default: false },
  status: { type: String, enum: Object.values(ProblemStatus), default: ProblemStatus.Waiting },
  statusReason: { type: String, default: '' },
  scorePolicy: { type: String, required: true, enum: Object.values(ScorePolicy) },
  hasGrader: { type: Boolean, default: false },
  testcase: [
    {
      filename: String,
      point: Number,
      subtask: String
    }
  ],
  tags: [String],
  problemRelatedTags: [String],
  submissionDetail: {
    accepted: { type: Number, default: 0 },
    submitted: { type: Number, default: 0 },
    timeLimitExceeded: { type: Number, default: 0 },
    memoryLimitExceeded: { type: Number, default: 0 },
    wrongAnswer: { type: Number, default: 0 },
    runtimeError: { type: Number, default: 0 },
    compilationError: { type: Number, default: 0 },
    processLimitExceeded: { type: Number, default: 0 }
  },
  userDetail: {
    solved: { type: Number, default: 0 },
    attempted: { type: Number, default: 0 }
  }
});

/**
 * Auto-increment hook for `serialNumber`.
 *
 * On first save, checks or initializes the `problemSerialNumber` counter
 * in the {@link Counter} collection, then assigns the next value.
 * Serial numbers start from `0`.
 */
// Auto-increment serialNumber using pre-save hook
problemSchema.pre('save', async function () {
  if (this.isNew && this.serialNumber === undefined) {
    // Check if counter exists to handle existing data
    const counterExists = await Counter.exists({ _id: 'problemSerialNumber' });

    if (!counterExists) {
      // Find the highest existing serialNumber
      const lastProblem = await mongoose.model('Problem').findOne(
        {},
        { serialNumber: 1 },
        { sort: { serialNumber: -1 } }
      );
      const maxSerial = lastProblem?.serialNumber ?? -1;

      try {
        // Initialize counter so the next increment gives maxSerial + 1
        // We set seq to maxSerial + 1. 
        // The update below will increment it to maxSerial + 2.
        // Then we subtract 1 to get maxSerial + 1.
        await Counter.create({
          _id: 'problemSerialNumber',
          seq: maxSerial + 1
        });
      } catch (error) {
        // Ignore duplicate key error if another process initialized it concurrently
      }
    }

    const counter = await Counter.findByIdAndUpdate(
      { _id: 'problemSerialNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    // We want to start from 0, so we subtract 1 from the sequence
    this.serialNumber = counter.seq - 1;
  }
});

/** Mongoose model for the `problems` collection. */
export const Problem = mongoose.model<IProblem>('Problem', problemSchema);
export { ScorePolicy, ITestcase, IProblem, problemSchema };
