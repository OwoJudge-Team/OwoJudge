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
  serialNumber: { type: Schema.Types.Number, unique: true },
  problemID: { type: Schema.Types.String, required: true },
  username: { type: Schema.Types.String, required: true },
  language: { type: Schema.Types.String, required: true },
  userSolution: [userSolutionSchema],
  status: { type: Schema.Types.String, enum: Object.values(SubmissionStatus), default: SubmissionStatus.PD },
  createdTime: { type: Schema.Types.Date, default: Date.now },
  score: { type: Schema.Types.Number, default: 0 },
  results: [testCaseResultSchema],
});

// Auto-increment serialNumber using pre-save hook
submissionSchema.pre('save', async function(next) {
  if (this.isNew && !this.serialNumber) {
    try {
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
      
      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

const Submission = model<ISubmission>('Submission', submissionSchema);

export { Submission, ISubmission, IUserSolution, ITestCaseResult };
