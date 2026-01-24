# Task Preparation System (TPS) Tutorial

This tutorial explains how to use the Task Preparation System (TPS) to create and package problems for OwoJudge. TPS is a standard tool used for preparing competitive programming problems (tasks), often used in IOI-style contests.

This guide refers to the example problem located in `tps-example/` to illustrate the concepts.

## 1. Directory Structure

A standard TPS problem package has the following structure:

```text
problem_root/
├── problem.json        # Basic problem metadata (time limit, memory limit, type)
├── judgemeta.json      # OwoJudge specific metadata (tags, daily quota, etc.)
├── subtasks.json       # Subtask definitions and scoring
├── solutions.json      # List of solutions and their expected verdicts
├── samples.json        # Mapping of sample inputs/outputs
├── statement/
│   └── description.md  # Problem statement in Markdown
├── gen/                # Test case generators
│   ├── data            # Script defining how to generate tests
│   ├── gen.cpp         # Generator source code
│   └── manual/         # Manual test cases (e.g., samples)
├── validator/          # Input validator
│   └── validator.cpp   # Validator source code using testlib
├── checker/            # Output checker
│   └── checker.cpp     # Checker source code using testlib
└── solution/           # Solution files
    ├── sol.cpp
    └── sol.c
```

## 2. Metadata Files

### `problem.json`
Contains standard problem information.
```json
{
    "name": "Problem",
    "code": "tps-example",
    "title": "Problem Title",
    "type": "Batch",          // Usually "Batch", "Communication", or "OutputOnly"
    "time_limit": 1.0,        // Seconds
    "memory_limit": 2048,     // Megabytes
    "score_policy": "sum"     // How subtask scores are aggregated
}
```

### `judgemeta.json` (OwoJudge Specific)
Contains settings specific to the OwoJudge platform.
```json
{
  "full_score": 100,
  "tags": ["basic"],
  "problemRelatedTags": ["math"],
  "allowed_languages": ["gcc c17", "g++ c++17", "python3"],
  "process_limit": 1,
  "dailyQuota": 5
}
```

### `subtasks.json`
Defines the subtasks, their scores, and validators.
```json
{
    "global_validators": ["validator.cpp"],
    "subtasks": {
        "samples": {
            "index": 0,
            "score": 0,
            "validators": []
        },
        "full": {
            "index": 1,
            "score": 100,
            "validators": []
        }
    }
}
```

### `solutions.json`
Lists available solutions and their expected verdicts. Used for verification.
```json
{
    "sol.c": { "verdict": "model_solution" },
    "sol.cpp": { "verdict": "correct" }
}
```
*   `model_solution`: The correct reference solution used to generate outputs.
*   `correct`: Solutions expected to pass.
*   `time_limit`, `wrong_answer`, etc., can also be specified for incorrect solutions.

## 3. Test Generation (`gen/`)

The `gen/` directory handles test case generation. It typically uses [testlib.h](https://github.com/MikeMirzayanov/testlib).

### `gen/data`
This file acts as a script to define which tests to generate. It supports commands like:
*   `@subtask <name>`: Starts a new subtask.
*   `manual <filename>`: Uses a manual file from `gen/manual/`.
*   `gen <args>`: Runs the generator executable (compiled from `gen.cpp`) with arguments.
*   `@include <subtask>`: Includes tests from another subtask.

**Example `gen/data`:**
```text
@subtask samples
manual sample-01.in

@subtask full
@include samples
gen -n=10 -k=5
gen -n=100 -k=50
```

### Generators (`gen.cpp`)
C++ programs using `testlib.h` to output a single test case to stdout based on command-line arguments.

## 4. Validation (`validator/`)

### `validator.cpp`
This program verifies that input files strictly adhere to the problem constraints. It reads from stdin (the generated test case) and exits with code 0 if valid, or crashes/asserts if invalid.

**Example:**
```cpp
#include "testlib.h"
using namespace std;
int main(int argc, char* argv[]) {
    registerValidation(argc, argv);
    int n = inf.readInt(1, 100, "n");
    inf.readEoln();
    inf.readEof();
}
```

## 5. Checker (`checker/`)

### `checker.cpp`
This program verifies the user's output against the input and the model solution's output (or simply checks validity for problems with multiple correct answers).

It takes three arguments (paths to files):
1.  Input file
2.  Output file (User's output)
3.  Answer file (Model output)

**Example:**
```cpp
#include "testlib.h"
using namespace std;
int main(int argc, char* argv[]) {
    registerChecker("tps-example", argc, argv);
    // compareRemainingLines() is a helper to diff strict outputs
    compareRemainingLines(); 
}
```

## 6. Statement (`statement/`)

The statement is written in Markdown format in `statement/description.md`. It usually includes sections like "Description", "Input", "Output", "Constraints", and "Examples".

## 7. Common TPS Commands

You should run these commands from the problem root directory.

### `tps compile <path/to/solution>`
Compiles a solution file.
```bash
tps compile solution/sol.cpp
```

### `tps gen`
Generates all test cases (inputs and outputs) defined in `gen/data`.
1.  Compiles generators and validator.
2.  Compiles the model solution.
3.  Runs generators to create inputs.
4.  Runs validator on inputs.
5.  Runs model solution on inputs to create `.out` files.

### `tps invoke <path/to/solution>`
Runs a specific solution against the generated test cases and checks the results using the checker.
```bash
tps invoke solution/sol.cpp
```
Use `-r` to show reasons for failure (checker output) and `-v` for verbose output.

### `tps verify`
Performs a sanity check on the problem package. Checks if:
*   Required files exist.
*   JSON structures are valid.
*   Problem statement title matches metadata.
*   Solutions match their expected verdicts.

### `tps stress <solution> <gen-script>`
Runs a "stress test" by repeatedly generating random test cases using a script and running the solution against the model solution until a mismatch is found. Useful for debugging.

## Workflow Summary

1.  **Draft**: Write `problem.json` and `statement/description.md`.
2.  **Code**: Write `gen/gen.cpp`, `validator/validator.cpp`, `checker/checker.cpp`, and a model `solution/sol.cpp`.
3.  **Plan**: Edit `gen/data` to define test cases.
4.  **Generate**: Run `tps gen` to create inputs/outputs.
5.  **Test**: Add more solutions (e.g., slow or wrong ones) to `solution/` and `solutions.json`, then run `tps verify` or `tps invoke` to ensure they get expected results.
6.  **Package**: The directory is now ready for deployment (e.g., using `tps export`).
