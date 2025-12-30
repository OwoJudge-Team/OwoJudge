## Problem Statement

中文測試，weber 好帥好喜歡愛了愛了 <3

Iahub is playing an uncommon game. Initially, he has $ n $ boxes, numbered 1, 2, 3, $ ... $ , $ n $ . Each box has some number of candies in it, described by a sequence $ a*{1} $ , $ a*{2} $ , $ ... $ , $ a*{n} $ . The number $ a*{k} $ represents the number of candies in box $ k $ .

The goal of the game is to move all candies into exactly two boxes. The rest of $ n-2 $ boxes must contain zero candies. Iahub is allowed to do several (possible zero) moves. At each move he chooses two different boxes $ i $ and $ j $ , such that $ a*{i} \le a*{j} $ . Then, Iahub moves from box $ j $ to box $ i $ exactly $ a\_{i} $ candies. Obviously, when two boxes have equal number of candies, box number $ j $ becomes empty.

Your task is to give him a set of moves such as Iahub to archive the goal of the game. If Iahub can't win the game for the given configuration of boxes, output -1. Please note that in case there exist a solution, you don't need to print the solution using minimal number of moves.

## Input Format

The first line of the input contains integer $ n $ ( $ 3<=n<=1000 $ ). The next line contains $ n $ non-negative integers: $ a*{1},a*{2},...,a\_{n} $ — sequence elements. It is guaranteed that sum of all numbers in sequence $ a $ is up to $ 10^{6} $ .

## Output Format

In case there exists no solution, output -1. Otherwise, in the first line output integer $ c $ $ (0<=c<=10^{6}) $ , representing number of moves in your solution. Each of the next $ c $ lines should contain two integers $ i $ and $ j $ $ (1<=i,j<=n,i≠j) $ : integers $ i $ , $ j $ in the $ k $ th line mean that at the $ k $ -th move you will move candies from the $ j $ -th box to the $ i $ -th one.

this is a test line -> `test inline code` haha.

`another inline code test`

## Samples

### Sample Input #1

```
3
3 6 9
```

### Sample Output #1

```
2
2 3
1 3
```

### Sample Input #2

```text
3
0 1 0
```

### Sample Output #2

```
-1asdfasdfasdf
```

### Sample Intput #3

```
4
0 1 1 0
```

### Sample Output #3

```
0
```

## Hint

For the first sample, after the first move the boxes will contain 3, 12 and 3 candies. After the second move, the boxes will contain 6, 12 and 0 candies. Now all candies are in exactly 2 boxes.

For the second sample, you can observe that the given configuration is not valid, as all candies are in a single box and they should be in two boxes. Also, any move won't change the configuration, so there exists no solution.

For the third sample, all candies are already in 2 boxes. Hence, no move is needed.

```cpp
#include <bits/stdc++.h>
using namespace std;
#define rep(i,a,b) for(int i=a,zz=b;i<zz;++i)
#define rep1(i,a,b) for(int i=a,zz=b;i<=zz;++i)
#define per1(i,a,b) for(int i=a,zz=b;i>=zz;--i)
#define int long long
#define x first
#define y second
#define all(a) a.begin(),a.end()
template<typename T,typename U>ostream& operator<<(ostream&os,const pair<T,U>&p)
{return os<<"("<<p.first<<", "<<p.second<<")";}
template<typename T>ostream& operator<<(ostream&os,const vector<T>&v)
{os<<"[";rep(i,0,v.size())os<<v[i]<<(i==v.size()-1?"]":", ");return os;}
#ifdef DBG
template<typename T> void _dbg(T x){cerr<<x<<"\n";}
template<typename T,typename ...U> void _dbg(T x,U ...y){cerr<<x<<", ";_dbg(y...);}
#define dbg(...) do{cerr<<"\033[33m"<<#__VA_ARGS__<<" = ";_dbg(__VA_ARGS__);cerr<<"\033[0m";}while(0)
#else
#define dbg(...) (void(0))
#endif
using pii = pair<int,int>;
using vi = vector<int>;
using vvi = vector<vi>;
using vp = vector<pii>;
using vvp = vector<vp>;
const vp dirs = {{0,1},{1,0},{0,-1},{-1,0},{1,1},{1,-1},{-1,1},{-1,-1},{0,0}};
const int INF = 1e18;

struct Node {
    int w, l, r, id;
};

void hyper() {
    int n; cin >> n;
    vi f(n);
    rep(i,0,n) cin >> f[i];
    if(n == 1) return cout << "0\n", void();

    vector<Node> v;
    rep(i,0,n) v.push_back({f[i], -1, -1, i});
    priority_queue<pii, vector<pii>, greater<pii>> pq;
    rep(i,0,n) pq.emplace(f[i], i);
    while(pq.size() > 1) {
        auto [w1, a] = pq.top(); pq.pop();
        auto [w2, b] = pq.top(); pq.pop();
        int i = v.size();
        v.push_back({w1 + w2, a, b, -1});
        pq.emplace(v[i].w, i);
    }

    vector<string> ans(n);
    function<void(int,string)> dfs = [&](int u, string s) {
        if(v[u].id != -1) return ans[v[u].id] = s, void();
        if(v[u].r != -1) dfs(v[u].r, s + '1');
        if(v[u].l != -1) dfs(v[u].l, s + '0');
    };
    dfs(pq.top().y, "");
    rep(i,0,n) cout << ans[i] << '\n';
}

signed main() {
    ios::sync_with_stdio(0), cin.tie(0);
    int t = 1;
    // cin >> t;
    while(t--) hyper();
}




#define y second
#define all(a) a.begin(),a.end()
template<typename T,typename U>ostream& operator<<(ostream&os,const pair<T,U>&p)
{return os<<"("<<p.first<<", "<<p.second<<")";}
template<typename T>ostream& operator<<(ostream&os,const vector<T>&v)
{os<<"[";rep(i,0,v.size())os<<v[i]<<(i==v.size()-1?"]":", ");return os;}
#ifdef DBG
template<typename T> void _dbg(T x){cerr<<x<<"\n";}
template<typename T,typename ...U> void _dbg(T x,U ...y){cerr<<x<<", ";_dbg(y...);}
#define dbg(...) do{cerr<<"\033[33m"<<#__VA_ARGS__<<" = ";_dbg(__VA_ARGS__);cerr<<"\033[0m";}while(0)
#else
#define dbg(...) (void(0))
#endif
using pii = pair<int,int>;
using vi = vector<int>;
using vvi = vector<vi>;
using vp = vector<pii>;
using vvp = vector<vp>;
const vp dirs = {{0,1},{1,0},{0,-1},{-1,0},{1,1},{1,-1},{-1,1},{-1,-1},{0,0}};
const int INF = 1e18;

struct Node {
    int w, l, r, id;
};

void hyper() {
    int n; cin >> n;
    vi f(n);
    rep(i,0,n) cin >> f[i];
    if(n == 1) return cout << "0\n", void();

    vector<Node> v;
    rep(i,0,n) v.push_back({f[i], -1, -1, i});
    priority_queue<pii, vector<pii>, greater<pii>> pq;
    rep(i,0,n) pq.emplace(f[i], i);
    while(pq.size() > 1) {
        auto [w1, a] = pq.top(); pq.pop();
        auto [w2, b] = pq.top(); pq.pop();
        int i = v.size();
        v.push_back({w1 + w2, a, b, -1});
        pq.emplace(v[i].w, i);
    }

    vector<string> ans(n);
    function<void(int,string)> dfs = [&](int u, string s) {
        if(v[u].id != -1) return ans[v[u].id] = s, void();
        if(v[u].r != -1) dfs(v[u].r, s + '1');
        if(v[u].l != -1) dfs(v[u].l, s + '0');
    };
    dfs(pq.top().y, "");
    rep(i,0,n) cout << ans[i] << '\n';
}

signed main() {
    ios::sync_with_stdio(0), cin.tie(0);
    int t = 1;
    // cin >> t;
    while(t--) hyper();
}

```
