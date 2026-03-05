/*
Two networks of size n / 2 merge and undo many times.

Achieve worst case O(n log n) DSU.
Prevent from not using DSU for virus merge.
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

int n, q, preset_id;
vector<int> distri;
vector<double> accum_prob;

void random_op() {
    double r = rnd.next(0.0, 1.0);
    int type = 1;
    while (accum_prob[type - 1] < r) type++;

    switch (type) {
        case 1: {  // connect x y
            int x = rnd.next(1, n);
            int y = rnd.next(1, n);
            while (y == x) y = rnd.next(1, n);
            cout << "1 " << x << " " << y << "\n";
            break;
        }
        case 2: {  // evolve t
            int t = rnd.next(1, 2);
            cout << "2 " << t << "\n";
            break;
        }
        case 3: {  // attack t
            int t = rnd.next(1, 2);
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
        default: {
            assert(false);
            break;
        }
    }
}

int main(int argc, char* argv[]) {
    registerGen(argc, argv, 1);

    n = atoi(argv[1]);          // number of computers
    q = atoi(argv[2]);          // number of queries
    preset_id = atoi(argv[3]);  // preset id

    distri = preset[preset_id];
    accum_prob = {0, 0, 0, 0, 0, 0, 0};

    int sum = accumulate(distri.begin(), distri.end(), 0);
    for (int i = 0; i < (int)distri.size(); ++i) {
        accum_prob[i] = (i == 0 ? 0 : accum_prob[i - 1]) + static_cast<double>(distri[i]) / sum;
    }

    cout << n << " " << q << "\n";

    // create two networks of size n / 2
    for (int i = 1; i < n / 2; i *= 2) {
        for (int j = 1; j <= n; j += i * 2) {
            cout << "1 " << j << " " << j + i << "\n";
            q--;
        }
    }

    while (1) {
        int r = rnd.next(1, 10);

        for (int i = 0; i < r - 1; ++i) {
            random_op();
            if (--q == 0) return 0;
        }

        int k = rnd.next(1, n);
        cout << "6 " << k << "\n";
        if (--q == 0) return 0;

        for (int i = 0; i < r; ++i) {
            cout << "7\n";
            if (--q == 0) return 0;
        }
    }

    return 0;
}
