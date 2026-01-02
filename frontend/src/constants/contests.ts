export interface Standing {
  username: string;
  totalScore: number;
  solvedCount: number;
  lastSubmissionTime: string;
  problemScores: {
    serialNumber: number;
    score: number;
    lastSubmissionTime: string;
  }
}

export interface Contest {
  _id: string;
  title: string;
  description: string;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  problems: {
    serialNumber: number;
    score: number;
  }[];
  createdTime: string; // ISO string
  standings: Standing[];
}

const contests = [
  {
    _id: "68fb7a00b2c3d4e5f6789012",
    contestID: "homework-0-spring-2026-dsa",
    title: "Homework 0",
    description: "Homework 0 for Spring 2026 DSA course, easy peasy",
    startTime: "2025-11-01T09:00:00.000Z",
    endTime: "2025-11-01T14:00:00.000Z",
    problems: [
      {
        problemID: 1,
        title: "Binary Search",
      },
      {
        problemID: 2,
        title: "Two Sum",
      },
      {
        problemID: 3,
        title: "Travelling Salesman",
      },
    ],
    participants: ["alice", "bob", "charlie"],
    visibility: "public",
    createdTime: "2025-10-24T13:30:00.000Z",
    standings: [
      {
        username: "alice",
        score: 200,
        solvedProblems: 2,
      },
      {
        username: "bob",
        score: 150,
        solvedProblems: 1,
      },
      {
        username: "charlie",
        score: 100,
        solvedProblems: 1,
      },
    ],
  },
  {
    _id: "68fb7a00b2c3d4e5f6345452",
    contestID: "homework-1-spring-2026-dsa",
    title: "Homework 1",
    description: "Homework 1 for Spring 2026 DSA course, easy peasy",
    startTime: "2025-11-11T09:00:00.000Z",
    endTime: "2025-11-21T14:00:00.000Z",
    problems: [
      {
        problemID: 4,
        title: "Merge Sort",
      },
      {
        problemID: 5,
        title: "Quick Sort",
      },
      {
        problemID: 6,
        title: "Depth-First Search",
      },
      {
        problemID: 7,
        title: "Breadth-First Search",
      },
    ],
    participants: ["alice", "bob", "charlie"],
    visibility: "public",
    createdTime: "2025-10-24T13:30:00.000Z",
    standings: [
      {
        username: "alice",
        score: 200,
        solvedProblems: 2,
      },
      {
        username: "charlie",
        score: 150,
        solvedProblems: 1,
      },
      {
        username: "bob",
        score: 100,
        solvedProblems: 1,
      },
    ],
  },
  {
    _id: "68fb7a00b2c3d4e5f6340912",
    contestID: "homework-2-spring-2026-dsa",
    title: "Homework 2",
    description: "Homework 2 for Spring 2026 DSA course, easy peasy",
    startTime: "2025-12-11T09:00:00.000Z",
    endTime: "2025-11-24T14:00:00.000Z",
    problems: [
      {
        problemID: 8,
        title: "Dynamic Programming",
      },
      {
        problemID: 9,
        title: "Linked List Reversal",
      },
      {
        problemID: 10,
        title: "Knapsack Problem",
      },
      {
        problemID: 11,
        title: "Maximum Subarray Sum",
      },
    ],
    participants: ["alice", "bob", "charlie"],
    visibility: "public",
    createdTime: "2025-10-24T13:30:00.000Z",
    standings: [
      {
        username: "bob",
        score: 300,
        solvedProblems: 3,
      },
      {
        username: "alice",
        score: 250,
        solvedProblems: 2,
      },
      {
        username: "charlie",
        score: 100,
        solvedProblems: 1,
      },
    ],
  },
  {
    _id: "68fb7a00b2c3d4e5f6311111",
    contestID: "homework-3-spring-2026-dsa",
    title: "Homework 3",
    description: "Homework 3 for Spring 2026 DSA course, easy peasy",
    startTime: "2025-12-15T09:00:00.000Z",
    endTime: "2025-12-25T14:00:00.000Z",
    problems: [
      {
        problemID: 12,
        title: "Floyd-Warshall Algorithm",
      },
      {
        problemID: 13,
        title: "Dijkstra's Algorithm",
      },
      {
        problemID: 14,
        title: "Prim's Algorithm",
      },
      {
        problemID: 15,
        title: "Topological Sorting",
      },
    ],
    participants: ["alice", "bob", "charlie"],
    visibility: "public",
    createdTime: "2025-10-24T13:30:00.000Z",
    standings: [
      {
        username: "bob",
        score: 300,
        solvedProblems: 3,
      },
      {
        username: "charlie",
        score: 250,
        solvedProblems: 2,
      },
      {
        username: "alice",
        score: 100,
        solvedProblems: 1,
      },
    ],
  },
];

export default contests;
