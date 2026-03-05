#include <iostream>
#include <climits>
#include "testlib.h"
using namespace std;

const int maxn = 2e6;
const long long maxai = 1e12;

int main(int argc, char* argv[]) {
    registerValidation(argc, argv);

    int t = inf.readInt(1, 5, "t");
    inf.readEoln();
    while (t--) {
        int n = inf.readInt(1, maxn, "n");
        inf.readEoln();
        for (int i = 0; i < n; ++i) {
            inf.readLong(-maxai, maxai, "ai");
            if (i != n - 1) inf.readSpace();
        }
        inf.readEoln();
    }
    inf.readEof();
}
