import mongoose, { ObjectId } from 'mongoose';

interface IUser {
  username: string;
  displayName: string;
  password: string;
  isAdmin: boolean;
  solvedProblem: number;
  solvedProblems: any;
  rating: number;
  id: ObjectId;
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
  }
});

export const User = mongoose.model('User', userSchema);
export { IUser };
