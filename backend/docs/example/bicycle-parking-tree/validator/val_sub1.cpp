#include "testlib.h"
#include <string>
#include <queue>
#include <vector>
using namespace std;

#define CAP_LIM(cap) (cap)

constexpr int kMaxN = 300;
constexpr int kMaxM = 300;
constexpr int kMaxQ = 100000;
constexpr int kMaxC = 15;
constexpr int kMaxL = 1000000;
constexpr int kMaxD = 1000000;
constexpr long long kMaxT = 1000000000000000LL;

enum Operation {
  PARK = 0,
  MOVE = 1,
  CLEAR = 2,
  REARRANGE = 3,
  FETCH = 4,
  REBUILD = 5
};
using min_heap = priority_queue<pair<int64_t, int>, vector<pair<int64_t, int>>, greater<pair<int64_t, int>>>;

struct DSU{
  std::vector<int> dsu,rk;

  DSU(int n){
    dsu.resize(n+10);
    rk.resize(n+10);
    init();
  }

  void init(){
    for(int i=0;i<dsu.size();++i){
      dsu[i]=i;
    }
  }

  int find(int a){
    if(dsu[a]==a){
      return a;
    }else{
      return dsu[a]=find(dsu[a]);
    }
  }

  bool same(int a,int b){
    return find(a)==find(b);
  }

  void uni(int a,int b){
    if(same(a,b)){
      return;
    }

    if(rk[find(a)]==rk[find(b)]){
      dsu[find(b)]=find(a);
      rk[a]++;
    }else if(rk[find(a)]>rk[find(b)]){
      dsu[find(b)]=find(a);
    }else{
      dsu[find(a)]=find(b);
    }
  }
};

int main(int argc, char* argv[]) {
  registerValidation(argc, argv);
  
  int n = inf.readInt(1, kMaxN, "n");
  inf.readSpace();
  int m = inf.readInt(1, kMaxM, "m");
  inf.readSpace();
  int q = inf.readInt(1, kMaxQ, "q");
  inf.readEoln();

  // Read capacities for each parking slot; parking slots indexed 0..n-1.
  vector<int> cap(n);
  for (int i = 0; i < n; i++) {
    cap[i] = inf.readInt(2, kMaxC, "c[" + to_string(i) + "]");
    if(i < n - 1)
      inf.readSpace();
  }
  inf.readEoln();

  // Read fetch time for each student; students indexed 0..m-1.
  vector<int> fetch_delay(m);
  for (int i = 0; i < m; i++) {
    fetch_delay[i] = inf.readInt(0, kMaxL, "l[" + to_string(i) + "]");
    if(i < m - 1)
      inf.readSpace();
  }
  inf.readEoln();

  // Read tree edges: There are exactly n-1 lines.
  DSU dsu(n);
  for (int i = 0; i < n - 1; ++i) {
    int u = inf.readInt(0, n - 1, "u[" + to_string(i) + "]");
    inf.readSpace();
    int v = inf.readInt(0, n - 1, "v[" + to_string(i) + "]");
    inf.readSpace();
    int d = inf.readInt(0, kMaxD, "d[" + to_string(i) + "]");
    inf.readEoln();
    if (dsu.same(u, v)) {
      inf.quitf(_wa, "Cycle detected at edge (%d, %d)", u, v);
    }
    dsu.uni(u, v);
  }
  // Check connectivity: all nodes must be connected.
  for (int i = 1; i < n; ++i) {
    if (!dsu.same(0, i)) {
      inf.quitf(_wa, "Vertex %d is not connected to vertex 0", i);
    }
  }

  // Read operations
  int64_t current_time = -1;
	//* student_location
	//*   1. 0~n-1, in bicycle slot
	//*   2. -1, their home
	//*   3. -2, chuiyuan
	map<int, int> student_location;
	set<int> available_students;
	for (int i = 0; i < m; ++i) {
		available_students.insert(i);
	}

	vector<int> slot_usage(n, 0);
	set<int> availabile_slots;
	for (int i = 0; i < n; ++i) {
		availabile_slots.insert(i);
	}
	int bicycle_in_tree = 0;
	
	min_heap chuiyuan;
	ensure(chuiyuan.empty());

  for (int i = 0; i < q; ++i) {
    int op = inf.readInt(0, 5, "op[" + to_string(i) + "]");
    inf.readSpace();
    switch (op) {
      case PARK: {
        int s = inf.readInt(0, m - 1, "s[" + to_string(i) + "]");
        inf.readSpace();
        int x = inf.readInt(0, n - 1, "x[" + to_string(i) + "]");
        inf.readSpace();
        ensure(cap[x] * 2 > slot_usage[x]);
        int p = inf.readInt(1, cap[x], "p[" + to_string(i) + "]");
        inf.readEoln();
				
        slot_usage[x]++;
				if (slot_usage[x] == CAP_LIM(cap[x])) {
					availabile_slots.erase(x);
				}
				student_location[s] = x;
				available_students.erase(s);
				bicycle_in_tree++;
        break;
      }
      case MOVE: {
        int s = inf.readInt(0, m - 1, "s[" + to_string(i) + "]");
        inf.readSpace();
        int x = student_location[s];
        ensure(x >= 0);
        int y = inf.readInt(0, n - 1, "y[" + to_string(i) + "]");
        inf.readSpace();
        ensure(cap[y] * 2 > slot_usage[y]);
        int p = inf.readInt(1, cap[y], "p[" + to_string(i) + "]");
        inf.readEoln();
        
        slot_usage[x]--;
				if (slot_usage[x] < CAP_LIM(cap[x])) {
					availabile_slots.insert(x);
				}
				slot_usage[y]++;
				if (slot_usage[y] == CAP_LIM(cap[y])) {
					availabile_slots.erase(y);
				}
				student_location[s] = y;
				ensure(available_students.count(s) == 0);
        break;
      }
      case CLEAR: {
        int x = inf.readInt(0, n - 1, "x[" + to_string(i) + "]");
        inf.readSpace();
        long long t = inf.readLong(0, kMaxT, "t[" + to_string(i) + "]");
        inf.readEoln();
        
        current_time = t;
				for (auto [st, sl] : student_location) {
					if (sl == x) {
						student_location[st] = -2;
						slot_usage[x]--;
						chuiyuan.emplace(t + fetch_delay[st], st);
						bicycle_in_tree--;
					}
				}
				ensure(slot_usage[x] == 0);
				availabile_slots.insert(x);
        break;
      }
      case FETCH: {
        long long t = inf.readLong(0, kMaxT, "t[" + to_string(i) + "]");
        inf.readEoln();
        ensure(current_time < t);
        current_time = t;

        while (!chuiyuan.empty() && chuiyuan.top().first <= t) {
					auto [time, student] = chuiyuan.top();
					chuiyuan.pop();
					student_location[student] = -1;
					available_students.insert(student);
				}
        break;
      }
      default:
        inf.quitf(_fail, "Unknown operation %d", op);
    }
  }
  inf.readEof();
}