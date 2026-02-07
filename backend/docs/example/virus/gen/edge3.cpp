/*
Test for undo many times.
*/

#include <iostream>
#include <vector>
#include <algorithm>
#include <numeric>
#include <cstdlib>
#include <ctime>
#include <cassert>
#include <cmath>
#include <string>
#include <cstring>
#include <cstdio>
#include <set>
#include <map>
#include <unordered_map>
#include <unordered_set>
#include <queue>
#include <stack>
#include <list>
#include <utility>
#include <functional>
#include <bitset>
#include <iomanip>
#include <sstream>
#include <limits>
#include <complex>
#include <random>
#include <chrono>
#include <thread>
#include <cassert>
#include <stdexcept>
#include <exception>
#include <type_traits>
#include <initializer_list>
#include <iterator>
#include <memory>

#include "const.h"
#include "testlib.h"
using namespace std;

int main(int argc, char* argv[]) {
    registerGen(argc, argv, 1);

    int n = atoi(argv[1]);          // number of computers
    int q = atoi(argv[2]);          // number of queries
    int preset_id = atoi(argv[3]);  // preset id
    int max_times = atoi(argv[4]);  // max times

    vector<int> distri = preset[preset_id];
    vector<double> accum_prob = {0, 0, 0, 0, 0, 0, 0};

    int sum = accumulate(distri.begin(), distri.end(), 0);
    for (int i = 0; i < (int)distri.size(); ++i) {
        accum_prob[i] = (i == 0 ? 0 : accum_prob[i - 1]) + static_cast<double>(distri[i]) / sum;
    }

    cout << n << " " << q << "\n";

    int op7_count = 0;

    for (int i = 0; i < q; ++i) {
        double r = rnd.next(0.0, 1.0);
        int type = 1;
        while (accum_prob[type - 1] < r) type++;

        if ((type == 6 || type == 7) && i < q / 5) {
            type = rnd.next(1, 5);
        }

        switch (type) {
            case 1: {  // connect x y
                int x = rnd.next(1, n);
                int y = rnd.next(1, n);
                while (y == x) y = rnd.next(1, n);
                cout << "1 " << x << " " << y << "\n";
                break;
            }
            case 2: {  // evolve t
                int t = rnd.next(1, n);
                cout << "2 " << t << "\n";
                break;
            }
            case 3: {  // attack t
                int t = rnd.next(1, n);
                cout << "3 " << t << "\n";
                break;
            }
            case 4: {  // reinstall k s
                int k = rnd.next(1, n);
                int s = rnd.next(1, n);
                cout << "4 " << k << " " << s << "\n";
                break;
            }
            case 5: {  // fusion a b
                int a = rnd.next(1, n);
                int b = rnd.next(1, n);
                while (b == a) b = rnd.next(1, n);
                cout << "5 " << a << " " << b << "\n";
                break;
            }
            case 6: {  // status k
                int k = rnd.next(1, n);
                cout << "6 " << k << "\n";
                break;
            }
            case 7: {  // revert
                if (op7_count < q / 5) {
                    int times = rnd.next(5, max_times);
                    i--;
                    for (int j = 0; j < times; ++j) {
                        cout << "7\n";
                        i++;
                        op7_count++;
                        if (i >= q) break;
                    }
                } else {
                    cout << "7\n";
                }
            }
        }
    }

    return 0;
}
