export enum SubmissionStatus {
  PD = "pending",
  QU = "in queue",
  AC = "Accepted",
  WA = "Wrong Answer",
  PE = "Presentation Error",
  PS = "Partially Scored",
  CE = "Compilation Error",
  RE = "Runtime Error",
  MLE = "Memory Limit Exceeded",
  TLE = "Time Limit Exceeded",
  PLE = "Process Limit Exceeded",
  SE = "System Error",
}

export const StatusToCode = Object.fromEntries(
  Object.entries(SubmissionStatus).map(([key, value]) => [value, key])
);

export type Status =
  | SubmissionStatus.PD
  | SubmissionStatus.QU
  | SubmissionStatus.AC
  | SubmissionStatus.WA
  | SubmissionStatus.PE
  | SubmissionStatus.PS
  | SubmissionStatus.CE
  | SubmissionStatus.RE
  | SubmissionStatus.MLE
  | SubmissionStatus.TLE
  | SubmissionStatus.PLE
  | SubmissionStatus.SE;

export interface UserSolution {
  filename: string;
  content: string;
}

export interface Result {
  testcase: string;
  status: Status;
  time: number;
  memory: number;
  message: string;
}

export interface Submission {
  serialNumber: number;
  userHandle: string;
  userID: number;
  problemSerialNumber: number;
  problemTitle: string;
  language: string;
  status: Status;
  score?: number;
  createdTime: string;
  time: string;
  memory: string;
  userSolution: Array<UserSolution>;
  results: Result[];
}
