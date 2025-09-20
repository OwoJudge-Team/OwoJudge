import { Schema, model, Document } from 'mongoose';
import { SubmissionStatus } from '../../utils/submission-status';

interface IUserSolution {
  filename: string;
  content: string;
}

const userSolutionSchema = new Schema<IUserSolution>({
  filename: { type: String, required: true },
  content: { type: String, required: true },
}, { _id: false });

interface ITestCaseResult {
  testcase: string;
  status: SubmissionStatus;
  time: number;
  memory: number;
}

const testCaseResultSchema = new Schema<ITestCaseResult>({
  testcase: { type: String, required: true },
  status: { type: String, enum: Object.values(SubmissionStatus), required: true },
  time: { type: Number, required: true },
  memory: { type: Number, required: true },
}, { _id: false });

interface ISubmission extends Document {
  serialNumber: number;
  problemID: string;
  username: string;
  language: string;
  userSolution: IUserSolution[];
  status: SubmissionStatus;
  createdTime: Date;
  score?: number;
  results?: ITestCaseResult[];
}

const submissionSchema = new Schema<ISubmission>({
  serialNumber: { type: Number, unique: true, index: true, auto: true },
  problemID: { type: String, required: true },
  username: { type: String, required: true },
  language: { type: String, required: true },
  userSolution: [userSolutionSchema],
  status: { type: String, enum: Object.values(SubmissionStatus), default: SubmissionStatus.PD },
  createdTime: { type: Date, default: Date.now },
  score: { type: Number, default: 0 },
  results: [testCaseResultSchema],
});

const Submission = model<ISubmission>('Submission', submissionSchema);

export { Submission, ISubmission, IUserSolution, ITestCaseResult };
