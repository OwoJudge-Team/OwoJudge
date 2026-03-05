#include "testlib.h"
using namespace std;

int main(int argc, char* argv[]) {
	registerChecker("A9", argc, argv);
	readBothGraderResults();
	compareRemainingLines(2);
}
