/*
First reinstall many computers to same virus.

Prevent from not using DSU for virus merge.
Test for DSU node deletion.
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

    int reinstall = atoi(argv[4]);  // number of reinstall queries
    int reinstall_to_virus = 3;     // number of different viruses to reinstall

    vector<int> distri = preset[preset_id];
    vector<double> accum_prob = {0, 0, 0, 0, 0, 0, 0};

    int sum = accumulate(distri.begin(), distri.end(), 0);
    for (int i = 0; i < (int)distri.size(); ++i) {
        accum_prob[i] = (i == 0 ? 0 : accum_prob[i - 1]) + static_cast<double>(distri[i]) / sum;
    }

    cout << n << " " << q << "\n";

    // Generate reinstall queries
    for (int i = 0; i < reinstall; ++i) {
        int k = rnd.next(1, n);
        int s = rnd.next(1, reinstall_to_virus);
        cout << "4 " << k << " " << s << "\n";
    }
    q -= reinstall;

    // Generate other queries
    for (int i = 0; i < q; ++i) {
        double r = rnd.next(0.0, 1.0);
        int type = 1;
        while (accum_prob[type - 1] < r) type++;

        // Avoid generating status queries in the first 10% of queries
        if (type == 6 && i < q / 5) {
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
                cout << "7\n";
            }
        }
    }

    return 0;
}
