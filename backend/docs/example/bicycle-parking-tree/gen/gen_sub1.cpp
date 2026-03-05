#include <cassert>
#include <cstdint>
#include <iostream>
#include <queue>
#include <map>
#include "jngen.h"
#include "GraphGen.h"
using namespace std;

enum Operation { PARK = 0, MOVE = 1, CLEAR = 2, REARRANGE = 3, FETCH = 4, REBUILD = 5 };
using min_heap = priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>>;

#define CAP_LIM(cap) (cap * 2)

struct RandomContainer {
    vector<int> v;
    vector<int> pos;
    RandomContainer(int n) : pos(n, -1) {}
    void insert(int x) {
        if (pos[x] != -1) return;
        pos[x] = v.size();
        v.push_back(x);
    }
    void erase(int x) {
        if (pos[x] == -1) return;
        int idx = pos[x];
        int last = v.back();
        v[idx] = last;
        pos[last] = idx;
        v.pop_back();
        pos[x] = -1;
    }
    int pick() {
        if (v.empty()) return -1;
        return v[rnd.next(0, int(v.size()) - 1)];
    }
    bool count(int x) { return pos[x] != -1; }
    bool empty() { return v.empty(); }
    size_t size() { return v.size(); }
};

void gen_commands(const int n, const int m, const int q, const vector<int> &cap, const vector<int> &fetch_delay) {
	int total_cap = 0;
	for (int i = 0; i < n; ++i) {
		total_cap += cap[i];
	}
	
	long long current_time = 0;
	//* student_location
	//*   1. 0~n-1, in bicycle slot
	//*   2. -1, their home
	//*   3. -2, chuiyuan
	map<int, int> student_location;
	RandomContainer available_students(m);
	RandomContainer parked_students(m);
	for (int i = 0; i < m; ++i) {
		available_students.insert(i);
	}

	vector<int> slot_usage(n, 0);
	RandomContainer availabile_slots(n);
	for (int i = 0; i < n; ++i) {
		availabile_slots.insert(i);
	}
	int bicycle_in_tree = 0;
	
	min_heap chuiyuan;
	assert(chuiyuan.empty());

	for (int i = 0; i < q; ++i) {
		cerr << "operation: ";
		int park_w = bicycle_in_tree >= CAP_LIM(total_cap) - 1 || available_students.empty() ? 0 : 5;
		int move_w = bicycle_in_tree == 0 || n == 1 || availabile_slots.empty() ? 0 : 50;
		int clear_w = 0;
		int rearrange_w = 0;
		int fetch_w = 0;
		int rebuild_w = 0;
		Operation op;
		op = static_cast<Operation>(rnd.nextByDistribution({park_w, move_w, clear_w, rearrange_w, fetch_w, rebuild_w}));
		cout << op << flush;
		switch (op) {
			case PARK: {
				bool find_vac = !availabile_slots.empty();
				if (!find_vac) cerr << "no vacancy\n", exit(-1);
				// Get the available student from set
				int s = available_students.pick();
				assert(!student_location.count(s) || student_location[s] == -1);

				int x = availabile_slots.pick();
				assert(slot_usage[x] < CAP_LIM(cap[x]));

				size_t p = rnd.next(1, cap[x]);
				cout << " " << s << " " << x << " " << p << "\n";

				slot_usage[x]++;
				if (slot_usage[x] == CAP_LIM(cap[x])) {
					availabile_slots.erase(x);
				}
				student_location[s] = x;
				available_students.erase(s);
				parked_students.insert(s);
				bicycle_in_tree++;
				break;
			}
			case MOVE: {
				int s = parked_students.pick();
				if (s == -1) cerr << "stuck in move\n", exit(-1);
				int x = student_location[s];
				assert(student_location.count(s) && x >= 0);
				assert(!availabile_slots.empty());				
				int y = availabile_slots.pick();
				assert(slot_usage[y] < CAP_LIM(cap[y]));

				size_t p = rnd.next(1, cap[y]);
				cout << " " << s << " " << y << " " << p << "\n";

				slot_usage[x]--;
				if (slot_usage[x] < CAP_LIM(cap[x])) {
					availabile_slots.insert(x);
				}
				slot_usage[y]++;
				if (slot_usage[y] == CAP_LIM(cap[y])) {
					availabile_slots.erase(y);
				}
				student_location[s] = y;
				assert(!available_students.count(s));
				break;
			}
			case CLEAR: {
				cerr << "subtask1 does not contain clear, since it is not useful\n";
				exit(-1);	
				break;
			}
			case REARRANGE: {
				cerr << "subtask1 does not contain rearrange, since it is not useful\n";
				exit(-1);
				break;
			}
			case FETCH: {
				cerr << "subtask1 does not contain fetch\n";
				exit(-1);
				break;
			}
			case REBUILD: {
				cerr << "subtask1 does not contain rebuild\n";
				exit(-1);
				break;
			}
			default: {
				fprintf(stderr, "invalid operation type");
				exit(-1);
			}
		}
	}
}

int main(int argc, char* argv[]) {
  registerGen(argc, argv, 1);
  // Line1
	int n = atoi(argv[1]), m = atoi(argv[2]), q = atoi(argv[3]);
  cout << n << " " << m << " " << q << "\n";
	// Line2
	vector<int> cap(n);
	for (int i = 0; i < n; ++i) {
		cap[i] = rnd.next(2, 15);
	}
	for (int i = 0; i < n; ++i) {
		cout << cap[i] << " \n"[i == n - 1];
	}
	// Line3
	vector<int> fetch_delay(m);
	for (int i = 0; i < m; ++i) {
		fetch_delay[i] = rnd.next(0, 1000000);
	}
	for (int i = 0; i < m; ++i) {
		cout << fetch_delay[i] << " \n"[i == m - 1];
	}
	// Tree
	vector<edge> edges = GraphGen::GenTree(n, 100000);
	for (auto e : edges) {
		cout << e.from << " " << e.to << " " << e.dis << "\n";
	}
	// Operations
	gen_commands(n, m, q, cap, fetch_delay);
  return 0;
}
