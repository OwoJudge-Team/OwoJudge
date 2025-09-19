#include "testlib.h"
using namespace std;

int main(int argc, char* argv[]) {
	registerChecker("tps-example", argc, argv);
	compareRemainingLines();
}
