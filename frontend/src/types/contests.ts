export interface Standing {
  username: string;
  totalScore: number;
  solvedCount: number;
  lastSubmissionTime: string;
  problemScores: {
    serialNumber: number;
    score: number;
    lastSubmissionTime: string;
  }[];
}

export interface Contest {
  _id: string;
  title: string;
  description: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  problems: {
    serialNumber: number;
    score: number;
  }[];
  createdTime: string; // ISO string
  standings: Standing[];
}
