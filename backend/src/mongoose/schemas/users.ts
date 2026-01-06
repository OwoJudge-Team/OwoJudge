import mongoose, { ObjectId } from 'mongoose';

export enum UserRole {
  Student = 'student',
  TA = 'ta',
  JudgeAdmin = 'judgeAdmin'
}

interface IUser extends mongoose.Document {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  solvedProblem: number;
  solvedProblems: any;
  rating: number;
  gitPublicKey?: string;
  studentId?: string;
  giteaId?: number;
  gitSshUrl?: string;
  id: ObjectId;
  quotaUsage: Map<string, { count: number; date: Date }>;
}

const userSchema = new mongoose.Schema<IUser>({
  username: {
    type: mongoose.Schema.Types.String,
    required: true,
    unique: true
  },
  displayName: {
    type: mongoose.Schema.Types.String,
    required: true
  },
  password: {
    type: mongoose.Schema.Types.String,
    required: true
  },
  role: {
    type: mongoose.Schema.Types.String,
    enum: Object.values(UserRole),
    required: true,
    default: UserRole.Student
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

export const User = mongoose.model<IUser>('User', userSchema);
export { IUser };
