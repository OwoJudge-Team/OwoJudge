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
  serialNumber: number;
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
  serialNumber: { type: Number, unique: true },
  problemID: { type: String, required: true },
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

// Auto-increment serialNumber using pre-save hook
problemSchema.pre('save', async function(next) {
  if (this.isNew && !this.serialNumber) {
    try {
      // Find the highest existing serialNumber
      const lastProblem = await mongoose.model('Problem').findOne(
        {}, 
        { serialNumber: 1 }, 
        { sort: { serialNumber: -1 } }
      );
      
      // Set serialNumber starting from 0
      this.serialNumber = lastProblem?.serialNumber !== undefined
        ? lastProblem.serialNumber + 1 
        : 0;
      
      next();
    } catch (error) {
      next(error as Error);
    }
  } else {
    next();
  }
});

export const Problem = mongoose.model<IProblem>('Problem', problemSchema);
export { ScorePolicy, ITestcase, IProblem };
