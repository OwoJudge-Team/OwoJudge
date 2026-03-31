/**
 * User schema module.
 *
 * Defines the Mongoose schema and model for user accounts,
 * including roles, Gitea integration fields, and submission quota tracking.
 *
 * @module Schemas/User
 */

import mongoose, { ObjectId } from 'mongoose';

/**
 * Enumeration of user roles.
 *
 * | Role           | Value          | Permissions                            |
 * |----------------|----------------|----------------------------------------|
 * | `Student`      | `"student"`    | Submit solutions, view own submissions |
 * | `TA`           | `"ta"`         | Manage problems, view all submissions  |
 * | `JudgeAdmin`   | `"judgeAdmin"` | Full administrative access              |
 */
export enum UserRole {
  Student = 'student',
  TA = 'ta',
  JudgeAdmin = 'judgeAdmin'
}

/**
 * Represents a user document in MongoDB.
 *
 * @property username - Unique login name.
 * @property displayName - Name shown in the UI.
 * @property password - Hashed password (SHA-256 + salt).
 * @property role - One of {@link UserRole}.
 * @property solvedProblem - Total count of distinct solved problems.
 * @property solvedProblems - Array of solved problem serial numbers.
 * @property rating - User's rating score.
 * @property gitPublicKey - SSH public key for Gitea integration.
 * @property studentId - Student ID (unique, sparse index).
 * @property giteaId - Corresponding Gitea user ID.
 * @property gitSshUrl - Git SSH clone URL for the user's solution repository.
 * @property id - MongoDB ObjectId.
 * @property quotaUsage - Per-problem daily submission quota tracking map.
 * @property email - User's email address, derived from `{username}@{USER_EMAIL_DOMAIN}` at creation time.
 * @property resetPasswordToken - One-time token for password reset (expires after 1 hour).
 * @property resetPasswordExpires - Expiry timestamp for {@link resetPasswordToken}.
 */
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
  email?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
}

/**
 * Mongoose schema for {@link IUser}.
 *
 * Collection: `users`
 *
 * | Field                  | Type     | Required | Default     | Unique  | Notes                              |
 * |------------------------|----------|----------|-------------|---------|------------------------------------|
 * | `username`             | `String` | Yes      | —           | Yes     | Login name                         |
 * | `displayName`          | `String` | Yes      | —           | No      | Display name                       |
 * | `password`             | `String` | Yes      | —           | No      | Hashed password                    |
 * | `role`                 | `String` | Yes      | `"student"` | No      | {@link UserRole} enum value        |
 * | `solvedProblem`        | `Number` | Yes      | `0`         | No      | Solved problem count               |
 * | `solvedProblems`       | `Array`  | Yes      | `[]`        | No      | Solved problem serial numbers      |
 * | `rating`               | `Number` | Yes      | `0`         | No      | User rating                        |
 * | `gitPublicKey`         | `String` | No       | —           | No      | SSH public key                     |
 * | `studentId`            | `String` | No       | —           | Sparse  | Student ID                         |
 * | `giteaId`              | `Number` | No       | —           | Sparse  | Gitea user ID                      |
 * | `gitSshUrl`            | `String` | No       | —           | No      | Git SSH URL                        |
 * | `quotaUsage`           | `Map`    | No       | `{}`        | No      | Daily submission quota per problem |
 * | `email`                | `String` | No       | —           | No      | Derived from `{username}@{USER_EMAIL_DOMAIN}` |
 * | `resetPasswordToken`   | `String` | No       | —           | No      | One-time password reset token       |
 * | `resetPasswordExpires` | `Date`   | No       | —           | No      | Expiry for reset token (1 hour)     |
 */
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
  },
  email: {
    type: mongoose.Schema.Types.String,
    required: false
  },
  resetPasswordToken: {
    type: mongoose.Schema.Types.String,
    required: false
  },
  resetPasswordExpires: {
    type: mongoose.Schema.Types.Date,
    required: false
  }
});

/** Mongoose model for the `users` collection. */
export const User = mongoose.model<IUser>('User', userSchema);
export { IUser, userSchema };
