#include <cassert>
#include <cstdint>
#include <iostream>
#include <map>
#include <queue>
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
	
	long long current_time = 0;
	//* student_location
	//*   1. 0~n-1, in bicycle slot
	//*   2. -1, their home
	//*   3. -2, chuiyuan
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
		cerr << "op: ";
		int park_w = bicycle_in_tree >= CAP_LIM(total_cap) || available_students.empty() ? 0 : 20;
		int move_w = bicycle_in_tree == 0 || n == 1 || availabile_slots.empty() ? 0 : 10;
		int clear_w = bicycle_in_tree > 0 ? 2 : 0;
		int rearrange_w = overfilled_slots > 0 ? 2 : 0;
		int fetch_w = chuiyuan.empty() ? 0 : 2;
		int rebuild_w = 0;
		Operation op;
		op = static_cast<Operation>(rnd.nextByDistribution({park_w, move_w, clear_w, rearrange_w, fetch_w, rebuild_w}));
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
			case MOVE: {
				int s = rnd.next(0, m - 1);
				int iter = 0;
				while (!student_location.count(s) || student_location[s] == -1 || student_location[s] == -2) {
					s = rnd.next(0, m - 1);
					iter++;
					if (iter > 500000) cerr << "stuck in move\n", exit(-1);
				}
				int x = student_location[s];
				assert(student_location.count(s) && x >= 0);
				assert(availabile_slots.size() > 0);				
				int yindex = rnd.next(0, int(availabile_slots.size() - 1));
				auto yit = availabile_slots.begin();
				for (int i = 0; i < yindex; ++i) yit++;
				int y = *yit;
				assert(slot_usage[y] < CAP_LIM(cap[y]));

				size_t p = rnd.next(1, cap[y]);
				cout << " " << s << " " << y << " " << p << "\n";

				slot_usage[x]--;
				if (rule_voilated_students.count(s)) {
					rule_voilated_students.erase(s);
				}
				if (slot_usage[x] < CAP_LIM(cap[x])) {
					availabile_slots.insert(x);
				}
				if (slot_usage[x] <= cap[x]) {
					overfilled_slots--;
				}
				if (slot_usage[y] >= cap[y]) {
					rule_voilated_students.insert(y);
				}
				if (slot_usage[y] == cap[y]) {
					overfilled_slots++;
				}
				slot_usage[y]++;
				if (slot_usage[y] == CAP_LIM(cap[y])) {
					availabile_slots.erase(y);
				}
				student_location[s] = y;
				assert(available_students.count(s) == 0);
				break;
			}
			case CLEAR: {
				int x = rnd.next(0, n - 1);
				int iter = 0;
				while (slot_usage[x] == 0) {
					x = rnd.next(0, n - 1);
					iter++;
					if (iter > 500000) cerr << "stuck in clear\n", exit(-1);
				}

				long long t = rnd.next(current_time + 1, current_time + 100000000);
				cout << " " << x << " " << t << "\n";
				
				current_time = t;
				for (auto [st, sl] : student_location) {
					if (sl == x) {
						student_location[st] = -2;
						slot_usage[x]--;
						chuiyuan.emplace(t + fetch_delay[st], st);
						bicycle_in_tree--;
						if (rule_voilated_students.count(st)) {
							rule_voilated_students.erase(st);
						}
					}
				}
				assert(slot_usage[x] == 0);
				availabile_slots.insert(x);
				break;
			}
			case REARRANGE: {
				int x = rnd.next(0, n - 1);
				int iter = 0;
				while (slot_usage[x] <= cap[x]) {
					x = rnd.next(0, n - 1);
					iter++;
					if (iter > 500000) cerr << "stuck in rearrange\n", exit(-1);
				}
				
				long long t = rnd.next(current_time + 1, current_time + 100000000);
				cout << " " << x << " " << t << "\n";

				current_time = t;
				for (auto [st, sl] : student_location) {
					if (sl == x && rule_voilated_students.count(st)) {
						student_location[st] = -2;
						slot_usage[x]--;
						chuiyuan.emplace(t + fetch_delay[st], st);
						rule_voilated_students.erase(st);
						bicycle_in_tree--;
					}
				}
				assert(slot_usage[x] <= cap[x]);
				availabile_slots.insert(x);
				break;
			}
			case FETCH: {
				long long t = rnd.next(current_time + 1, current_time + 100000000);
				current_time = t;
				
				cout << " " << t << "\n";

				while (!chuiyuan.empty() && chuiyuan.top().first <= t) {
					auto [time, student] = chuiyuan.top();
					// assert(rule_voilated_students.count(student) == 0);
					chuiyuan.pop();
					student_location[student] = -1;
					available_students.insert(student);
				}
				break;
			}
			case REBUILD: {
				cerr << "subtask234 does not contain rebuild\n";
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
