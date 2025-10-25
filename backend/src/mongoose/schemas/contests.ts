import mongoose, { Document, Schema } from 'mongoose';

interface ProblemInContest {
    name: string;
    score: number;
}

interface ProblemScore {
    problemID: string;
    score: number;
    lastSubmissionTime?: Date;
}

interface UserStanding {
    username: string;
    totalScore: number;
    solvedCount: number;
    problemScores: ProblemScore[];
    lastSubmissionTime?: Date;
}

interface IContest extends Document {
  contestID: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  problems: ProblemInContest[];
  standings: UserStanding[];
}

const contestSchema: Schema = new Schema({
  contestID: {
    type: Schema.Types.String,
    required: true,
    unique: true
  },
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
  problems: [
    {
        name: Schema.Types.String,
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
          problemID: Schema.Types.String,
          score: Schema.Types.Number,
          lastSubmissionTime: Schema.Types.Date
        }
      ],
      lastSubmissionTime: Schema.Types.Date
    }
  ]
});

export const Contest = mongoose.model<IContest>('Contest', contestSchema);
export { IContest, UserStanding, ProblemScore };
