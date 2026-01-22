export interface Problem {
  _id: number;
  title: string;
  serialNumber: number;
  fullScore: number;
  timeLimit: number;
  memoryLimit: number;
  submissionDetail: {
    accepted: number;
    compilationError: number;
    memoryLimitExceeded: number;
    processLimitExceeded: number;
    runtimeError: number;
    submitted: number;
    timeLimitExceeded: number;
    wrongAnswer: number;
  };
  userDetail: {
    solved: number;
    attempted: number;
  };
  dailyQuota: number;
  description?: string;
  released: boolean;
}
