type Status = "AC" | "WA" | "TLE" | "MLE";

interface UserSolution {
  filename: string;
  content: string;
}

interface Result {
  testcase: string;
  status: Status;
  time: number;
  memory: number;
  message: string;
}

interface Submission {
  id: number;
  user: string;
  problem: string;
  language: string;
  status: Status;
  score?: number;
  createdTime: string;
  time: string;
  memory: string;
  userSolution: UserSolution;
  results: Result[];
}

export const submissions: Submission[] = [
  {
    id: 1,
    user: "alice",
    problem: "Binary Search",
    language: "Python",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.45s",
    memory: "12MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "AC",
        time: 0.45,
        memory: 12,
        message: "Passed",
      },
    ],
  },
  {
    id: 2,
    user: "bob",
    problem: "Merge Sort",
    language: "C++",
    score: 50,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "0.70s",
    memory: "8MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "WA",
        time: 0.70,
        memory: 8,
        message: "HELL NAH",
      },
    ],
  },
  {
    id: 3,
    user: "alice",
    problem: "Two Sum",
    language: "JavaScript",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.30s",
    memory: "5MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 5,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "AC",
        time: 0.30,
        memory: 5,
        message: "Passed",
      },
      
      {
        testcase: "0-02",
        status: "AC",
        time: 0.30,
        memory: 5,
        message: "Passed",
      },
    ],
  },
  {
    id: 4,
    user: "charlie",
    problem: "Dynamic Programming",
    language: "Java",
    score: 0,
    createdTime: "2024-06-15 10:30:00",
    status: "TLE",
    time: "1.80s",
    memory: "20MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "TLE",
        time: 1.8,
        memory: 20,
        message: "Too slow",
      },
      {
        testcase: "0-02",
        status: "TLE",
        time: 1.8,
        memory: 20,
        message: "Too slow",
      },
      
      {
        testcase: "0-02",
        status: "TLE",
        time: 1.8,
        memory: 20,
        message: "Too slow",
      },
    ],
  },
  {
    id: 5,
    user: "dave",
    problem: "Quick Sort",
    language: "C++",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.90s",
    memory: "10MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 5,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "AC",
        time: 0.30,
        memory: 5,
        message: "Passed",
      },
      
      {
        testcase: "0-02",
        status: "AC",
        time: 0.30,
        memory: 5,
        message: "Passed",
      },
    ],
  },
  {
    id: 6,
    user: "eve",
    problem: "Graph Traversal",
    language: "Python",
    score: 30,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "1.00s",
    memory: "15MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "WA",
        time: 0.70,
        memory: 8,
        message: "HELL NAH",
      },
    ],
  },
  {
    id: 7,
    user: "frank",
    problem: "Heap Sort",
    language: "Java",
    score: 70,
    createdTime: "2024-06-15 10:30:00",
    status: "MLE",
    time: "1.20s",
    memory: "25MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "MLE",
        time: 0.70,
        memory: 25,
        message: "HELL NAH",
      },
    ],
  },
  {
    id: 8,
    user: "alice",
    problem: "Shortest Path",
    language: "C++",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.60s",
    memory: "7MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "AC",
        time: 0.45,
        memory: 12,
        message: "Passed",
      },
    ],
  },
  {
    id: 9,
    user: "bob",
    problem: "Knapsack Problem",
    language: "Python",
    score: 0,
    createdTime: "2024-06-15 10:30:00",
    status: "TLE",
    time: "2.50s",
    memory: "18MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "TLE",
        time: 1.8,
        memory: 20,
        message: "Too slow",
      },
      {
        testcase: "0-02",
        status: "TLE",
        time: 1.8,
        memory: 20,
        message: "Too slow",
      },
      
      {
        testcase: "0-02",
        status: "TLE",
        time: 1.8,
        memory: 20,
        message: "Too slow",
      },
    ],
  },
  {
    id: 10,
    user: "charlie",
    problem: "Longest Common Subsequence",
    language: "JavaScript",
    score: 60,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "1.10s",
    memory: "9MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "WA",
        time: 0.70,
        memory: 8,
        message: "HELL NAH",
      },
    ],
  },
  {
    id: 11,
    user: "dave",
    problem: "Binary Tree Traversal",
    language: "Java",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.75s",
    memory: "11MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "AC",
        time: 0.45,
        memory: 12,
        message: "Passed",
      },
    ],
  },
  {
    id: 12,
    user: "eve",
    problem: "Fibonacci Sequence",
    language: "C++",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "0.85s",
    memory: "6MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "WA",
        time: 0.45,
        memory: 12,
        message: "Hell nah",
      },
    ],
  },
  {
    id: 13,
    user: "frank",
    problem: "Palindrome Check",
    language: "Python",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.25s",
    memory: "4MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "AC",
        time: 0.45,
        memory: 12,
        message: "Passed",
      },
    ],
  },
  {
    id: 14,
    user: "alice",
    problem: "Prime Factorization",
    language: "JavaScript",
    score: 0,
    createdTime: "2024-06-15 10:30:00",
    status: "TLE",
    time: "2.20s",
    memory: "17MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "TLE",
        time: 1.8,
        memory: 20,
        message: "Too slow",
      },
      {
        testcase: "0-02",
        status: "TLE",
        time: 1.8,
        memory: 20,
        message: "Too slow",
      },
      
      {
        testcase: "0-02",
        status: "TLE",
        time: 1.8,
        memory: 20,
        message: "Too slow",
      },
    ],
  },
  {
    id: 15,
    user: "bob",
    problem: "Dijkstra's Algorithm",
    language: "Java",
    score: 10,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "0.95s",
    memory: "10MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "WA",
        time: 0.45,
        memory: 12,
        message: "Hell nah",
      },
    ],
  },
  {
    id: 16,
    user: "charlie",
    problem: "String Matching",
    language: "Python",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.40s",
    memory: "8MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "AC",
        time: 0.45,
        memory: 12,
        message: "Passed",
      },
    ],
  },
  {
    id: 17,
    user: "dave",
    problem: "Matrix Multiplication",
    language: "C++",
    score: 20,
    createdTime: "2024-06-15 10:30:00",
    status: "MLE",
    time: "1.40s",
    memory: "30MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "MLE",
        time: 0.70,
        memory: 25,
        message: "HELL NAH",
      },
    ],
  },
  {
    id: 18,
    user: "eve",
    problem: "Number of Islands",
    language: "JavaScript",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.55s",
    memory: "6MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "AC",
        time: 0.45,
        memory: 12,
        message: "Passed",
      },
    ],
  },
  {
    id: 19,
    user: "frank",
    problem: "Topological Sort",
    language: "Python",
    score: 80,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "1.30s",
    memory: "12MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "WA",
        time: 0.45,
        memory: 12,
        message: "Hell nah",
      },
    ],
  },
  {
    id: 20,
    user: "alice",
    problem: "Traveling Salesman",
    language: "C++",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.50s",
    memory: "5MB",
    userSolution: {
      filename: "main.cpp",
      content: "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.12,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "AC",
        time: 0.45,
        memory: 12,
        message: "Passed",
      },
    ],
  },
];
