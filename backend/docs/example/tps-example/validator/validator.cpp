#include <cassert>

#include "testlib.h"

using namespace std;

const long long MAXN = 100;

int main() {
  registerValidation();
  const long long a = inf.readLong(0, MAXN, "a");
  inf.readSpace();
  const long long b = inf.readLong(0, MAXN, "b");
  inf.readEoln();
  inf.readEof();
}
