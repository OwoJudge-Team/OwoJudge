#include <cassert>
#include <iostream>

#include "jngen.h"

using namespace std;

int main(int argc, char *argv[]) {
  registerGen(argc, argv);
  parseArgs(argc, argv);

  cout << rnd.next(1, 100) << " " << rnd.next(1, 100) << "\n";

  return 0;
}
