import mongoose, { Document, Schema } from 'mongoose';
import { Counter } from './counters';

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
problemSchema.pre('save', async function() {
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

export const Problem = mongoose.model<IProblem>('Problem', problemSchema);
export { ScorePolicy, ITestcase, IProblem };
