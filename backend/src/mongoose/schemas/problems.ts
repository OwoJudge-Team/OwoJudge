import mongoose, { Document, Schema } from 'mongoose';

enum ScorePolicy {
  Sum = 'sum',
  Max = 'max'
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
  description: string;
  inputDescription: string;
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

const problemSchema: Schema = new mongoose.Schema({
  problemID: {
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
  timeLimit: {
    type: mongoose.Schema.Types.Number,
    required: true
  },
  memoryLimit: {
    type: mongoose.Schema.Types.Number,
    required: true
  },
  processes: {
    type: mongoose.Schema.Types.Number,
    required: true,
    default: 1
  },
  fullScore: {
    type: mongoose.Schema.Types.Number,
    required: true
  },
  description: {
    type: mongoose.Schema.Types.String,
    required: true
  },
  inputDescription: {
    type: mongoose.Schema.Types.String,
    required: true
  },
  scorePolicy: {
    type: mongoose.Schema.Types.String,
    required: true
  },
  testcase: [
    {
      filename: mongoose.Schema.Types.String,
      point: mongoose.Schema.Types.Number,
      subtask: mongoose.Schema.Types.String
    }
  ],
  tags: [
    {
      type: mongoose.Schema.Types.String
    }
  ],
  problemRelatedTags: [
    {
      type: mongoose.Schema.Types.String
    }
  ],
  submissionDetail: {
    accepted: {
      type: mongoose.Schema.Types.Number,
      default: 0
    },
    submitted: {
      type: mongoose.Schema.Types.Number,
      default: 0
    },
    timeLimitExceeded: {
      type: mongoose.Schema.Types.Number,
      default: 0
    },
    memoryLimitExceeded: {
      type: mongoose.Schema.Types.Number,
      default: 0
    },
    wrongAnswer: {
      type: mongoose.Schema.Types.Number,
      default: 0
    },
    runtimeError: {
      type: mongoose.Schema.Types.Number,
      default: 0
    },
    compilationError: {
      type: mongoose.Schema.Types.Number,
      default: 0
    },
    processLimitExceeded: {
      type: mongoose.Schema.Types.Number,
      default: 0
    }
  },
  userDetail: {
    solved: {
      type: mongoose.Schema.Types.Number,
      default: 0
    },
    attempted: {
      type: mongoose.Schema.Types.Number,
      default: 0
    }
  }
});

export const Problem = mongoose.model<IProblem>('Problem', problemSchema);
export { ScorePolicy, ITestcase, IProblem };
