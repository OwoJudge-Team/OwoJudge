import mongoose, { Schema, model, Document } from 'mongoose';
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
  message?: string;
}

const testCaseResultSchema = new Schema<ITestCaseResult>({
  testcase: { type: String, required: true },
  status: { type: String, enum: Object.values(SubmissionStatus), required: true },
  time: { type: Number, required: true },
  memory: { type: Number, required: true },
  message: { type: String }
}, { _id: false });

interface IGroupResult {
  score: number;
  testcases: ITestCaseResult[];
}

const groupResultSchema = new Schema<IGroupResult>({
  score: { type: Number, required: true },
  testcases: [testCaseResultSchema]
}, { _id: false });

interface ISubmission extends Document {
  serialNumber: number;
  problemSerialNumber: number;
  problemTitle: string;
  username: string;
  userHandle: string;
  userID: mongoose.Types.ObjectId;
  language: string;
  userSolution: IUserSolution[];
  status: SubmissionStatus;
  createdTime: Date;
  score?: number;
  results?: Map<string, IGroupResult>;
}

const submissionSchema = new Schema<ISubmission>({
  serialNumber: { type: Schema.Types.Number, unique: true },
  problemSerialNumber: { type: Schema.Types.Number, required: true },
  problemTitle: { type: Schema.Types.String, required: true },
  username: { type: Schema.Types.String, required: true },
  userHandle: { type: Schema.Types.String, required: true },
  userID: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
  language: { type: Schema.Types.String, required: true },
  userSolution: [userSolutionSchema],
  status: { type: Schema.Types.String, enum: Object.values(SubmissionStatus), default: SubmissionStatus.PD },
  createdTime: { type: Schema.Types.Date, default: Date.now },
  score: { type: Schema.Types.Number, default: 0 },
  results: { type: Map, of: groupResultSchema, default: () => new Map() },
});

// Auto-increment serialNumber using pre-save hook
submissionSchema.pre('save', async function() {
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

const Submission = model<ISubmission>('Submission', submissionSchema);

export { Submission, ISubmission, IUserSolution, ITestCaseResult, IGroupResult };
