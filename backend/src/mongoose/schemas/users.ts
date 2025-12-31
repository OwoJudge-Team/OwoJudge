import mongoose, { ObjectId } from 'mongoose';

interface IUser extends mongoose.Document {
  username: string;
  displayName: string;
  password: string;
  isAdmin: boolean;
  solvedProblem: number;
  solvedProblems: any;
  rating: number;
  quotaUsage: Map<string, { count: number; date: Date }>;
}

const userSchema = new mongoose.Schema<IUser>({
  username: {
    type: mongoose.Schema.Types.String,
    require: true,
    unique: true
  },
  displayName: {
    type: mongoose.Schema.Types.String,
    require: true
  },
  password: {
    type: mongoose.Schema.Types.String,
    required: true
  },
  isAdmin: {
    type: mongoose.Schema.Types.Boolean,
    required: true
  },
  solvedProblem: {
    type: mongoose.Schema.Types.Number,
    required: true
  },
  solvedProblems: {
    type: mongoose.Schema.Types.Array,
    required: true
  },
  rating: {
    type: mongoose.Schema.Types.Number,
    required: true
  },
  quotaUsage: {
    type: Map,
    of: new mongoose.Schema({
      count: { type: Number, required: true },
      date: { type: Date, required: true }
    }),
    default: {}
  }
});

export const User = mongoose.model('User', userSchema);
export { IUser };
