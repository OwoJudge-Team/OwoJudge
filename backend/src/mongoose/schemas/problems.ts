import mongoose, { Document, Schema } from 'mongoose';

enum ScorePolicy {
  Sum = 'sum',
  Max = 'max',
  Min = 'min'
}

interface ITestcase {
  filename: string;
  point: number;
  subtask: string;
}

interface IProblem extends Document {
  problemID: string;
  createdTime: Date;
  title: string;
  timeLimit: number;
  memoryLimit: number;
  processes: number;
  fullScore: number;
  scorePolicy: ScorePolicy;
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

const problemSchema = new Schema<IProblem>({
  problemID: { type: String, required: true, unique: true },
  createdTime: { type: Date, required: true, default: Date.now },
  title: { type: String, required: true },
  timeLimit: { type: Number, required: true },
  memoryLimit: { type: Number, required: true },
  processes: { type: Number, required: true, default: 1 },
  fullScore: { type: Number, required: true },
  scorePolicy: { type: String, required: true, enum: Object.values(ScorePolicy) },
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

export const Problem = mongoose.model<IProblem>('Problem', problemSchema);
export { ScorePolicy, ITestcase, IProblem };
