export interface Problem {
  id: number;
  title: string; // problem name
  quota: number; // e.g., remaining submissions or attempt quota
  score: number; // points awarded
  acNum: number; // number of ACs
  isAC: boolean; // whether current user AC'd
}

export const problems: Problem[] = [
  { id: 1, title: "Binary Search", quota: 5, score: 100, acNum: 320, isAC: true },
  { id: 2, title: "Two Sum", quota: 3, score: 100, acNum: 540, isAC: false },
  { id: 3, title: "Travelling Salesman", quota: 2, score: 300, acNum: 45, isAC: false },
  { id: 4, title: "Merge Sort", quota: 5, score: 100, acNum: 410, isAC: true },
  { id: 5, title: "Quick Sort", quota: 4, score: 150, acNum: 280, isAC: false },
  { id: 6, title: "Depth-First Search", quota: 3, score: 120, acNum: 260, isAC: false },
  { id: 7, title: "Breadth-First Search", quota: 3, score: 120, acNum: 275, isAC: true },
  { id: 8, title: "Dynamic Programming", quota: 2, score: 250, acNum: 95, isAC: false },
  { id: 9, title: "Linked List Reversal", quota: 5, score: 80, acNum: 520, isAC: true },
  { id: 10, title: "Knapsack Problem", quota: 2, score: 300, acNum: 60, isAC: false },
  { id: 11, title: "Maximum Subarray Sum", quota: 5, score: 90, acNum: 430, isAC: true },
  { id: 12, title: "Floyd-Warshall Algorithm", quota: 1, score: 280, acNum: 38, isAC: false },
  { id: 13, title: "Dijkstra's Algorithm", quota: 2, score: 200, acNum: 190, isAC: false },
  { id: 14, title: "Prim's Algorithm", quota: 2, score: 200, acNum: 170, isAC: false },
  { id: 15, title: "Topological Sorting", quota: 2, score: 220, acNum: 120, isAC: false },
];
