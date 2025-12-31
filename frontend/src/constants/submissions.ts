export type Status = "AC" | "WA" | "TLE" | "MLE";

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
  id: number;
  user: string;
  userID: number;
  problemID: number;
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
    userID: 1,
    problemID: 1,
    problem: "Binary Search",
    language: "Python",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.45s",
    memory: "12MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 2,
    problemID: 4,
    problem: "Merge Sort",
    language: "C++",
    score: 50,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "0.70s",
    memory: "8MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
        time: 0.7,
        memory: 8,
        message: "HELL NAH",
      },
    ],
  },
  {
    id: 3,
    user: "alice",
    userID: 1,
    problemID: 2,
    problem: "Two Sum",
    language: "JavaScript",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.30s",
    memory: "5MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
        time: 0.3,
        memory: 5,
        message: "Passed",
      },

      {
        testcase: "0-02",
        status: "AC",
        time: 0.3,
        memory: 5,
        message: "Passed",
      },
    ],
  },
  {
    id: 4,
    user: "charlie",
    userID: 11,
    problemID: 8,
    problem: "Dynamic Programming",
    language: "Java",
    score: 0,
    createdTime: "2024-06-15 10:30:00",
    status: "TLE",
    time: "1.80s",
    memory: "20MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 13,
    problemID: 5,
    problem: "Quick Sort",
    language: "C++",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.90s",
    memory: "10MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
        time: 0.3,
        memory: 5,
        message: "Passed",
      },

      {
        testcase: "0-02",
        status: "AC",
        time: 0.3,
        memory: 5,
        message: "Passed",
      },
    ],
  },
  {
    id: 6,
    user: "eve",
    userID: 17,
    problemID: 0,
    problem: "Graph Traversal",
    language: "Python",
    score: 30,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "1.00s",
    memory: "15MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
        time: 0.7,
        memory: 8,
        message: "HELL NAH",
      },
    ],
  },
  {
    id: 7,
    user: "frank",
    userID: 19,
    problemID: 0,
    problem: "Heap Sort",
    language: "Java",
    score: 70,
    createdTime: "2024-06-15 10:30:00",
    status: "MLE",
    time: "1.20s",
    memory: "25MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
        time: 0.7,
        memory: 25,
        message: "HELL NAH",
      },
    ],
  },
  {
    id: 8,
    user: "alice",
    userID: 1,
    problemID: 0,
    problem: "Shortest Path",
    language: "C++",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.60s",
    memory: "7MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 2,
    problemID: 10,
    problem: "Knapsack Problem",
    language: "Python",
    score: 0,
    createdTime: "2024-06-15 10:30:00",
    status: "TLE",
    time: "2.50s",
    memory: "18MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 11,
    problemID: 0,
    problem: "Longest Common Subsequence",
    language: "JavaScript",
    score: 60,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "1.10s",
    memory: "9MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
        time: 0.7,
        memory: 8,
        message: "HELL NAH",
      },
    ],
  },
  {
    id: 11,
    user: "dave",
    userID: 13,
    problemID: 0,
    problem: "Binary Tree Traversal",
    language: "Java",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.75s",
    memory: "11MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 17,
    problemID: 0,
    problem: "Fibonacci Sequence",
    language: "C++",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "0.85s",
    memory: "6MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 19,
    problemID: 0,
    problem: "Palindrome Check",
    language: "Python",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.25s",
    memory: "4MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 1,
    problemID: 0,
    problem: "Prime Factorization",
    language: "JavaScript",
    score: 0,
    createdTime: "2024-06-15 10:30:00",
    status: "TLE",
    time: "2.20s",
    memory: "17MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 2,
    problemID: 13,
    problem: "Dijkstra's Algorithm",
    language: "Java",
    score: 10,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "0.95s",
    memory: "10MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 11,
    problemID: 0,
    problem: "String Matching",
    language: "Python",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.40s",
    memory: "8MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 13,
    problemID: 0,
    problem: "Matrix Multiplication",
    language: "C++",
    score: 20,
    createdTime: "2024-06-15 10:30:00",
    status: "MLE",
    time: "1.40s",
    memory: "30MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
        time: 0.7,
        memory: 25,
        message: "HELL NAH",
      },
    ],
  },
  {
    id: 18,
    user: "eve",
    userID: 17,
    problemID: 0,
    problem: "Number of Islands",
    language: "JavaScript",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "AC",
    time: "0.55s",
    memory: "6MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 19,
    problemID: 15,
    problem: "Topological Sort",
    language: "Python",
    score: 80,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "1.30s",
    memory: "12MB",
    userSolution: {
      filename: "main.cpp",
      content:
        "#include <iostream>\nusing namespace std;\nint main() {\n    int a, b;\n    cin >> a >> b;\n    cout << a + b << endl;\n    return 0;\n}",
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
    userID: 1,
    problemID: 3,
    problem: "Traveling Salesman",
    language: "C++",
    score: 100,
    createdTime: "2024-06-15 10:30:00",
    status: "WA",
    time: "0.39s",
    memory: "4MB",
    userSolution: {
      filename: "main.cpp",
      content: `#include <bits/stdc++.h>
#define rep(i,a,b) for(int i=a; i<b; ++i)
#define rep1(i,a,b) for(int i=a; i<=b; ++i)
#define per(i,a,b) for(int i=a; i>b; --i)
#define per1(i,a,b) for(int i=a; i>=b; --i)
#define int int64_t
#define fi first
#define se second
#define max max<int>
#define min min<int>
#define all(a) a.begin(),a.end()
#define sz(a) (signed)a.size()
#define rr(a,x) memset(a,x,sizeof(a))
#define hyper ios::sync_with_stdio(0); cin.tie(0)
using namespace std;
using pii = pair<int,int>;
using vi = vector<int>;
using vvi = vector<vi>;
const int IINF = 0x3f3f3f3f;
const int INF = 0x3f3f3f3f3f3f3f3f;
const int MOD = 998244353;
const int MN = 1005;

int n, m, k, t;
int dis[MN][MN];
int toair[MN];
set<int> airports;

void update(int u, int v, int w) {
    rep1(i,1,n) rep1(j,1,n) {
        dis[i][j] = min(dis[i][j], dis[i][u] + w + dis[v][j]);
        dis[i][j] = min(dis[i][j], dis[i][v] + w + dis[u][j]);
    }
    rep1(i,1,n) {
        toair[i] = INF;
        for(int v: airports) {
            toair[i] = min(toair[i], dis[i][v]);
        }
    }
}

signed main() {
    hyper;
    cin >> n >> m;
    rr(dis, 0x3f);
    rep1(i,1,n) dis[i][i] = 0;
    rep(i,0,m) {
        int u, v, w;
        cin >> u >> v >> w;
        dis[u][v] = dis[v][u] = min(dis[u][v], w);
    }
    cin >> k >> t;
    rep(i,0,k) {
        int d;
        cin >> d;
        airports.insert(d);
    }

    rep1(k,1,n) rep1(i,1,n) rep1(j,1,n)
        dis[i][j] = min(dis[i][j], dis[i][k] + dis[k][j]);
    rep1(i,1,n) {
        toair[i] = INF;
        for(int v: airports) {
            toair[i] = min(toair[i], dis[i][v]);
        }
    }

    int q; cin >> q;
    while(q--) {
        int type; cin >> type;
        if(type == 1) {
            int x, y, t;
            cin >> x >> y >> t;
            if(t < dis[x][y]) {
                dis[x][y] = dis[y][x] = t;
                update(x, y, t);
            }
        } else if(type == 2) {
            int x;
            cin >> x;
            if(airports.count(x)) continue;
            airports.insert(x);
            rep1(i,1,n) {
                toair[i] = min(toair[i], dis[i][x]);
            }
        } else if(type == 3) {
            int ans = 0;
            rep1(i,1,n) rep1(j,1,n) {
                int air = INF;
                if(toair[i] != INF && toair[j] != INF)
                    air = toair[i] + t + toair[j];
                int d = min(dis[i][j], air);
                if(d != INF) ans += d;
            }
            cout << ans << '\\n';
        }
    }
}
`,
    },
    results: [
      {
        testcase: "0-01",
        status: "AC",
        time: 0.09,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "0-02",
        status: "WA",
        time: 0.39,
        memory: 15,
        message: "Passed",
      },
      {
        testcase: "1-01",
        status: "AC",
        time: 0.15,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "1-02",
        status: "WA",
        time: 0.15,
        memory: 12,
        message: "Passed",
      },
      {
        testcase: "1-03",
        status: "AC",
        time: 0.15,
        memory: 12,
        message: "Passed",
      },
      {
        testcase: "1-04",
        status: "AC",
        time: 0.15,
        memory: 12,
        message: "Passed",
      },
      {
        testcase: "1-05",
        status: "WA",
        time: 0.15,
        memory: 12,
        message: "Passed",
      },
    ],
  },
  {
    id: 21,
    user: "bob",
    userID: 2,
    problemID: 3,
    problem: "Traveling Salesman",
    language: "C++",
    score: 100,
    createdTime: "2024-06-15 10:35:00",
    status: "AC",
    time: "0.67s",
    memory: "5MB",
    userSolution: {
      filename: "main.cpp",
      content: `#include <bits/stdc++.h>
#define rep(i,a,b) for(int i=a; i<b; ++i)
#define rep1(i,a,b) for(int i=a; i<=b; ++i)
#define per(i,a,b) for(int i=a; i>b; --i)
#define per1(i,a,b) for(int i=a; i>=b; --i)
#define int int64_t
#define fi first
#define se second
#define max max<int>
#define min min<int>
#define all(a) a.begin(),a.end()
#define sz(a) (signed)a.size()
#define rr(a,x) memset(a,x,sizeof(a))
#define hyper ios::sync_with_stdio(0); cin.tie(0)
using namespace std;
using pii = pair<int,int>;
using vi = vector<int>;
using vvi = vector<vi>;
const int IINF = 0x3f3f3f3f;
const int INF = 0x3f3f3f3f3f3f3f3f;
const int MOD = 998244353;
const int MN = 1005;

int n, m, k, t;
int dis[MN][MN];
set<int> airports;

void update(int u, int v, int w) {
    rep1(i,1,n) rep1(j,1,n) {
        dis[i][j] = min(dis[i][j], dis[i][u] + w + dis[v][j]);
        dis[i][j] = min(dis[i][j], dis[i][v] + w + dis[u][j]);
    }
}

signed main() {
    hyper;
    cin >> n >> m;
    rr(dis, 0x3f);
    rep1(i,1,n) dis[i][i] = 0;
    rep(i,0,m) {
        int u, v, w;
        cin >> u >> v >> w;
        dis[u][v] = min(dis[u][v], w);
        dis[v][u] = min(dis[v][u], w);
    }
    cin >> k >> t;
    rep(i,0,k) {
        int d;
        cin >> d;
        airports.insert(d);
    }
    for(int u: airports) for(int v: airports) {
        if(u != v) {
            dis[u][v] = min(dis[u][v], t);
            dis[v][u] = min(dis[v][u], t);
        }
    }

    rep1(k,1,n) rep1(i,1,n) rep1(j,1,n)
        dis[i][j] = min(dis[i][j], dis[i][k] + dis[k][j]);

    int q; cin >> q;
    while(q--) {
        int type; cin >> type;
        if(type == 1) {
            int x, y, t;
            cin >> x >> y >> t;
            if(t < dis[x][y]) {
                dis[x][y] = dis[y][x] = t;
                update(x, y, t);
            }
        } else if(type == 2) {
            int x;
            cin >> x;
            if(airports.count(x)) continue;
            for(int v: airports) {
                if(t < dis[x][v]) {
                    dis[x][v] = dis[v][x] = t;
                }
            }
            for(int v: airports) {
                update(x, v, t);
            }
            airports.insert(x);
        } else if(type == 3) {
            int ans = 0;
            rep1(i,1,n) rep1(j,1,n) {
                if(dis[i][j] != INF) ans += dis[i][j];
            }
            cout << ans << '\\n';
        }
    }
}
`,
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
        time: 0.67,
        memory: 12,
        message: "Passed",
      },
      {
        testcase: "1-01",
        status: "AC",
        time: 0.15,
        memory: 10,
        message: "Passed",
      },
      {
        testcase: "1-02",
        status: "AC",
        time: 0.15,
        memory: 12,
        message: "Passed",
      },
      {
        testcase: "1-03",
        status: "AC",
        time: 0.15,
        memory: 12,
        message: "Passed",
      },
      {
        testcase: "1-04",
        status: "AC",
        time: 0.15,
        memory: 12,
        message: "Passed",
      },
      {
        testcase: "1-05",
        status: "AC",
        time: 0.15,
        memory: 12,
        message: "Passed",
      },
    ],
  },
];
