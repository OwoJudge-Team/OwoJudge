#include <cassert>
#include <iostream>

#include "jngen.h"

using namespace std;

const int maxn = 2e6;
const long long maxai = 1e4;

int main(int argc, char* argv[]) {
    registerGen(argc, argv);
    parseArgs(argc, argv);

    ios::sync_with_stdio(0);
    cin.tie(0);

    int t = atoi(argv[1]);
    cout << t << "\n";
    for (int i = 0; i < t; ++i) {
        int n = atoi(argv[2]);
        cout << n << "\n";
        assert(n <= maxn);
        int pw = atoi(argv[3]);
        for (int j = 0; j < n; ++j) {
            cout << rnd.next(1LL, static_cast<long long>(pw == 9    ? 1e9
                                                         : pw == 12 ? 1e12
                                                         : pw == 2  ? 100
                                                                    : maxai))
                 << " \n"[j == n - 1];
        }
    }
}
