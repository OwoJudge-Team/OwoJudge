export enum ProblemStatus {
  Ready = "ready",
  Waiting = "waiting",
  Error = "error",
}

export interface SubmissionDetail {
  accepted: number;
  submitted: number;
  timeLimitExceeded: number;
  memoryLimitExceeded: number;
  wrongAnswer: number;
  runtimeError: number;
  compilationError: number;
  processLimitExceeded: number;
}

export interface Problem {
  _id: number;
  title: string;
  serialNumber: number;
  fullScore: number;
  timeLimit: number;
  memoryLimit: number;
  submissionDetail: SubmissionDetail;
  userDetail: {
    solved: number;
    attempted: number;
  };
  dailyQuota: number;
  description?: string;
  released: boolean;
  status: ProblemStatus;
  statusReason?: string;
}
