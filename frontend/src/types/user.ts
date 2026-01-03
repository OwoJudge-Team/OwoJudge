export interface User {
  _id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  rating: number;
  solvedProblem: number;
  solvedProblems: (string | number)[];
}
