export enum UserRole {
  Student = "student",
  TA = "ta",
  JudgeAdmin = "judgeAdmin",
}

export interface User {
  _id: string;
  username: string;
  displayName: string;
  role: UserRole;
  rating: number;
  solvedProblem: number;
  solvedProblems: (string | number)[];
}
