export interface User {
  _id: string;
  username: string;
  displayName: string;
  isAdmin: boolean;
  rating: number;
  solvedProblemsCount: number;
  solvedProblems: (string | number)[];
}
