import mongoose, { Document, Schema } from 'mongoose';

interface ProblemInContest {
    name: string;
    score: number;
}

interface IContest extends Document {
  contestID: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  problems: ProblemInContest[];
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
  ]
});

export const Contest = mongoose.model<IContest>('Contest', contestSchema);
export { IContest };
