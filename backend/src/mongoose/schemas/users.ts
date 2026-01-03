import mongoose, { ObjectId } from 'mongoose';

interface IUser {
  username: string;
  displayName: string;
  password: string;
  isAdmin: boolean;
  solvedProblem: number;
  solvedProblems: any;
  rating: number;
  gitPublicKey?: string;
  studentId?: string;
  giteaId?: number;
  gitSshUrl?: string;
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
    required: true,
    default: 0
  },
  solvedProblems: {
    type: mongoose.Schema.Types.Array,
    required: true,
    default: []
  },
  rating: {
    type: mongoose.Schema.Types.Number,
    required: true,
    default: 0
  },
  gitPublicKey: {
    type: mongoose.Schema.Types.String,
    required: false
  },
  studentId: {
    type: mongoose.Schema.Types.String,
    required: false,
    unique: true,
    sparse: true
  },
  giteaId: {
    type: mongoose.Schema.Types.Number,
    required: false,
    unique: true,
    sparse: true
  },
  gitSshUrl: {
    type: mongoose.Schema.Types.String,
    required: false
  }
});

export const User = mongoose.model('User', userSchema);
export { IUser };
