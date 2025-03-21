interface Submission {
  id: number;
  user: string;
  problem: string;
  language: string;
  status: 'AC' | 'WA' | 'TLE' | 'MLE';
  time: string;
  memory: string;
}

export const submissions: Submission[] = [
  { id: 1, user: 'alice', problem: 'Binary Search', language: 'Python', status: 'AC', time: '0.45s', memory: '12MB' },
  { id: 2, user: 'bob', problem: 'Merge Sort', language: 'C++', status: 'WA', time: '0.70s', memory: '8MB' },
  { id: 3, user: 'alice', problem: 'Two Sum', language: 'JavaScript', status: 'AC', time: '0.30s', memory: '5MB' },
  { id: 4, user: 'charlie', problem: 'Dynamic Programming', language: 'Java', status: 'TLE', time: '1.80s', memory: '20MB' },
  { id: 5, user: 'dave', problem: 'Quick Sort', language: 'C++', status: 'AC', time: '0.90s', memory: '10MB' },
  { id: 6, user: 'eve', problem: 'Graph Traversal', language: 'Python', status: 'WA', time: '1.00s', memory: '15MB' },
  { id: 7, user: 'frank', problem: 'Heap Sort', language: 'Java', status: 'MLE', time: '1.20s', memory: '25MB' },
  { id: 8, user: 'alice', problem: 'Shortest Path', language: 'C++', status: 'AC', time: '0.60s', memory: '7MB' },
  { id: 9, user: 'bob', problem: 'Knapsack Problem', language: 'Python', status: 'TLE', time: '2.50s', memory: '18MB' },
  { id: 10, user: 'charlie', problem: 'Longest Common Subsequence', language: 'JavaScript', status: 'WA', time: '1.10s', memory: '9MB' },
  { id: 11, user: 'dave', problem: 'Binary Tree Traversal', language: 'Java', status: 'AC', time: '0.75s', memory: '11MB' },
  { id: 12, user: 'eve', problem: 'Fibonacci Sequence', language: 'C++', status: 'WA', time: '0.85s', memory: '6MB' },
  { id: 13, user: 'frank', problem: 'Palindrome Check', language: 'Python', status: 'AC', time: '0.25s', memory: '4MB' },
  { id: 14, user: 'alice', problem: 'Prime Factorization', language: 'JavaScript', status: 'TLE', time: '2.20s', memory: '17MB' },
  { id: 15, user: 'bob', problem: 'Dijkstra\'s Algorithm', language: 'Java', status: 'WA', time: '0.95s', memory: '10MB' },
  { id: 16, user: 'charlie', problem: 'String Matching', language: 'Python', status: 'AC', time: '0.40s', memory: '8MB' },
  { id: 17, user: 'dave', problem: 'Matrix Multiplication', language: 'C++', status: 'MLE', time: '1.40s', memory: '30MB' },
  { id: 18, user: 'eve', problem: 'Number of Islands', language: 'JavaScript', status: 'AC', time: '0.55s', memory: '6MB' },
  { id: 19, user: 'frank', problem: 'Topological Sort', language: 'Python', status: 'WA', time: '1.30s', memory: '12MB' },
  { id: 20, user: 'alice', problem: 'Traveling Salesman', language: 'C++', status: 'AC', time: '0.50s', memory: '5MB' },
];
