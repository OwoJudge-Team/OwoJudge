import mongoose, { Document, Schema } from 'mongoose';

interface ProblemInContest {
    serialNumber: number;
    score: number;
}

interface ProblemScore {
    serialNumber: number;
    score: number;
    lastSubmissionTime?: Date;
    solved: Boolean;
    submissionCount?: number;
}

interface UserStanding {
    username: string;
    totalScore: number;
    solvedCount: number;
    problemScores: ProblemScore[];
    lastSubmissionTime?: Date;
    submissionCount?: number;
}

interface IContest extends Document {
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  submissionEndTime?: Date;
  released: boolean;
  problems: ProblemInContest[];
  standings: UserStanding[];
}

const contestSchema: Schema = new Schema({
  title: {
    type: Schema.Types.String,
    required: true
  },
  description: {
    type: Schema.Types.String,
    required: true
  },
  startTime: {
    type: Schema.Types.Date,
    required: true
  },
  endTime: {
    type: Schema.Types.Date,
    required: true
  },
  submissionEndTime: {
    type: Schema.Types.Date,
    required: false
  },
  released: {
    type: Schema.Types.Boolean,
    default: false
  },
  problems: [
    {
        serialNumber: Schema.Types.Number,
        score: Schema.Types.Number
    }
  ],
  standings: [
    {
      username: {
        type: Schema.Types.String,
        required: true
      },
      totalScore: {
        type: Schema.Types.Number,
        default: 0
      },
      solvedCount: {
        type: Schema.Types.Number,
        default: 0
      },
      problemScores: [
        {
          serialNumber: Schema.Types.Number,
          score: Schema.Types.Number,
          lastSubmissionTime: Schema.Types.Date,
          submissionCount: { type: Schema.Types.Number, default: 0 }
        }
      ],
      lastSubmissionTime: Schema.Types.Date,
      submissionCount: { type: Schema.Types.Number, default: 0 }
    }
  ]
});

export const Contest = mongoose.model<IContest>('Contest', contestSchema);
export { IContest, UserStanding, ProblemScore };
