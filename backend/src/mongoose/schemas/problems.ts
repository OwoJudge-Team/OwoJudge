import mongoose, { Document, Schema } from 'mongoose';

interface ITestcase {
  input: string;
  output: string;
  point: number;
  subtask: string;
}

export interface IProblem extends Document {
  displayID: string;
  createdTime: Date;
  title: string;
  description: string;
  inputFormat?: string;
  outputFormat?: string;
  timeLimit: number;
  memoryLimit: number;
  scorePolicy: string;
  testcase: ITestcase[];
}

const problemSchema: Schema = new mongoose.Schema({
  displayID: {
    type: mongoose.Schema.Types.String,
    required: true,
    unique: true
  },
  createdTime: {
    type: mongoose.Schema.Types.Date,
    required: true
  },
  title: {
    type: mongoose.Schema.Types.String,
    required: true
  },
  description: {
    type: mongoose.Schema.Types.String,
    required: true
  },
  inputFormat: {
    type: mongoose.Schema.Types.String
  },
  outputFormat: {
    type: mongoose.Schema.Types.String
  },
  timeLimit: {
    type: mongoose.Schema.Types.Number,
    required: true
  },
  memoryLimit: {
    type: mongoose.Schema.Types.Number,
    required: true
  },
  scorePolicy: {
    type: mongoose.Schema.Types.String,
    required: true
  },
  testcase: [
    {
      input: mongoose.Schema.Types.String,
      output: mongoose.Schema.Types.String,
      point: mongoose.Schema.Types.Number,
      subtask: mongoose.Schema.Types.String
    }
  ]
});

export const Problem = mongoose.model<IProblem>('Problem', problemSchema);
export { ITestcase };
