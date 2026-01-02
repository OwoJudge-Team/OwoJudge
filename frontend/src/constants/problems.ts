export interface Problem {
  id: number;
  title: string; // problem name
  quota: number; // e.g., remaining submissions or attempt quota
  score: number; // points awarded
  acNum: number; // number of ACs
  status: "unseen" | "wrong" | "correct"; // user's submission status
  tryCount?: number; // number of attempts (only for wrong status)
  serialNumber?: number; // serial number for problem
  fullScore?: number; // full score for the problem
  submissionDetail?: {
    accepted: number;
    compilationError: number;
    memoryLimitExceeded: number;
    processLimitExceeded: number;
    runtimeError: number;
    submitted: number;
    timeLimitExceeded: number;
    wrongAnswer: number;
  };
  userDetail?: {
    solved: number;
    attempted: number;
  };
}

export const problems: Problem[] = [
  { id: 1, title: "Binary Search", quota: 5, score: 100, acNum: 320, status: "correct" },
  { id: 2, title: "Two Sum", quota: 3, score: 100, acNum: 540, status: "wrong", tryCount: 3 },
  { id: 3, title: "Travelling Salesman", quota: 2, score: 300, acNum: 45, status: "unseen" },
  { id: 4, title: "Merge Sort", quota: 5, score: 100, acNum: 410, status: "correct" },
  { id: 5, title: "Quick Sort", quota: 4, score: 150, acNum: 280, status: "correct" },
  { id: 6, title: "Depth-First Search", quota: 3, score: 120, acNum: 260, status: "unseen" },
  { id: 7, title: "Breadth-First Search", quota: 3, score: 120, acNum: 275, status: "correct" },
  {
    id: 8,
    title: "Dynamic Programming",
    quota: 2,
    score: 250,
    acNum: 95,
    status: "wrong",
    tryCount: 2,
  },
  { id: 9, title: "Linked List Reversal", quota: 5, score: 80, acNum: 520, status: "correct" },
  { id: 10, title: "Knapsack Problem", quota: 2, score: 300, acNum: 60, status: "unseen" },
  { id: 11, title: "Maximum Subarray Sum", quota: 5, score: 90, acNum: 430, status: "correct" },
  {
    id: 12,
    title: "Floyd-Warshall Algorithm",
    quota: 1,
    score: 280,
    acNum: 38,
    status: "wrong",
    tryCount: 1,
  },
  { id: 13, title: "Dijkstra's Algorithm", quota: 2, score: 200, acNum: 190, status: "unseen" },
  {
    id: 14,
    title: "Prim's Algorithm",
    quota: 2,
    score: 200,
    acNum: 170,
    status: "correct",
  },
  { id: 15, title: "Topological Sorting", quota: 2, score: 220, acNum: 120, status: "unseen" },
];
