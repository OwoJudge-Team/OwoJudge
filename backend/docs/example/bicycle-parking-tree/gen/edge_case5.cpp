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

void gen_commands(const int n, const int m, const int q, const vector<int> &cap, const vector<int> &fetch_delay) {
	int total_cap = 0;
	for (int i = 0; i < n; ++i) {
		total_cap += cap[i];
	}
	
	map<int, int> student_location;
	set<int> available_students;
	set<int> rule_voilated_students;
	for (int i = 0; i < m; ++i) {
		available_students.insert(i);
	}

	vector<int> slot_usage(n, 0);
	set<int> availabile_slots;
	for (int i = 0; i < n; ++i) {
		availabile_slots.insert(i);
	}
	int bicycle_in_tree = 0, overfilled_slots = 0;
	
	min_heap chuiyuan;
	assert(chuiyuan.empty());

	for (int i = 0; i < q; ++i) {
		// cerr << "op: ";
		Operation op;
		op = PARK;
		cout << op << flush;
		switch (op) {
			case PARK: {
				bool find_vac = false;
				for (int i = 0; i < n; ++i) {
					if (CAP_LIM(cap[i]) > slot_usage[i]) {
						find_vac = true;
					}
				}
				if (!find_vac) cerr << "no vacancy\n", exit(-1);
				// Get the available student from set
				int sindex = rnd.next(0, int(available_students.size() - 1));
				auto sit = available_students.begin();
				for (int i = 0; i < sindex; ++i) sit++;
				int s = *sit;
				assert(!student_location.count(s) || student_location[s] == -1);

				int xindex = rnd.next(0, int(availabile_slots.size() - 1));
				auto xit = availabile_slots.begin();
				for (int i = 0; i < xindex; ++i) xit++;
				int x = *xit;
				assert(slot_usage[x] < CAP_LIM(cap[x]));

				size_t p = rnd.next(1, cap[x]);
				cout << " " << s << " " << x << " " << p << "\n";

				if (slot_usage[x] >= cap[x]) {
					rule_voilated_students.insert(s);
				}
				if (slot_usage[x] == cap[x]) {
					overfilled_slots++;
				}
				slot_usage[x]++;
				if (slot_usage[x] == CAP_LIM(cap[x])) {
					availabile_slots.erase(x);
				}
				student_location[s] = x;
				available_students.erase(s);
				bicycle_in_tree++;
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
	int n = 1, m = 300000, q = 100000;
  cout << n << " " << m << " " << q << "\n";
	// Line2
	vector<int> cap(n);
	for (int i = 0; i < n; ++i) {
		cap[i] = 50000;
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
