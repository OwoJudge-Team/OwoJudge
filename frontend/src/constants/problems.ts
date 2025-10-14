interface Problem {
  id: number;
  title: string;
  difficulty: "Easy" | "Medium" | "Hard";
  description: string;
  submissions: number;
  accuracy: string;
}

export const problems: Problem[] = [
  {
    id: 1,
    title: "Binary Search",
    difficulty: "Easy",
    description: "Implement binary search algorithm.",
    submissions: 450,
    accuracy: "85%",
  },
  {
    id: 2,
    title: "Two Sum",
    difficulty: "Medium",
    description: "Find two numbers that add up to a target value.",
    submissions: 1200,
    accuracy: "67%",
  },
  {
    id: 3,
    title: "Travelling Salesman",
    difficulty: "Hard",
    description: "Find the shortest possible route visiting all cities.",
    submissions: 350,
    accuracy: "45%",
  },
  {
    id: 4,
    title: "Merge Sort",
    difficulty: "Easy",
    description: "Implement merge sort algorithm.",
    submissions: 550,
    accuracy: "90%",
  },
  {
    id: 5,
    title: "Quick Sort",
    difficulty: "Medium",
    description: "Implement quicksort algorithm.",
    submissions: 1100,
    accuracy: "78%",
  },
  {
    id: 6,
    title: "Depth-First Search",
    difficulty: "Medium",
    description: "Perform depth-first search on a graph.",
    submissions: 900,
    accuracy: "72%",
  },
  {
    id: 7,
    title: "Breadth-First Search",
    difficulty: "Medium",
    description: "Perform breadth-first search on a graph.",
    submissions: 950,
    accuracy: "80%",
  },
  {
    id: 8,
    title: "Dynamic Programming",
    difficulty: "Hard",
    description: "Solve problems using dynamic programming techniques.",
    submissions: 600,
    accuracy: "60%",
  },
  {
    id: 9,
    title: "Linked List Reversal",
    difficulty: "Easy",
    description: "Reverse a singly linked list.",
    submissions: 700,
    accuracy: "92%",
  },
  {
    id: 10,
    title: "Knapsack Problem",
    difficulty: "Hard",
    description: "Solve the knapsack problem using dynamic programming.",
    submissions: 400,
    accuracy: "55%",
  },
  {
    id: 11,
    title: "Maximum Subarray Sum",
    difficulty: "Easy",
    description: "Find the maximum sum of a contiguous subarray.",
    submissions: 600,
    accuracy: "88%",
  },
  {
    id: 12,
    title: "Floyd-Warshall Algorithm",
    difficulty: "Hard",
    description: "Implement the Floyd-Warshall algorithm.",
    submissions: 250,
    accuracy: "48%",
  },
  {
    id: 13,
    title: "Dijkstra's Algorithm",
    difficulty: "Medium",
    description: "Find the shortest path in a graph using Dijkstra's algorithm.",
    submissions: 850,
    accuracy: "70%",
  },
  {
    id: 14,
    title: "Prim's Algorithm",
    difficulty: "Medium",
    description: "Find the minimum spanning tree of a graph.",
    submissions: 780,
    accuracy: "77%",
  },
  {
    id: 15,
    title: "Topological Sorting",
    difficulty: "Hard",
    description: "Perform topological sorting on a directed acyclic graph.",
    submissions: 300,
    accuracy: "52%",
  },
];
