#import "@preview/fontawesome:0.6.0": *
#import "../../../config.typ": conf
#import "../../../template.typ": *

#show: conf

#let title = problem-title("A9", "Reverse an Array", 6)

#let short-desc = [
  Implement the `reverse_array()` function that reverses an array.
  You should submit only the file #fa-file-code() `a9.c`.
  Your implementation will be tested using the provided #fa-file-code() `main.c` and #fa-file-code() `a9.h`.

  _Note_: Be mindful of memory usage limits!
]

#title
Reversing an array is not a difficult task, but handling dynamic memory allocation properly is crucial in C programming.

In this task, you will implement a function that performs this reversal.
The judging system will automatically compile your code together with the provided main program, so your submission should *only contain the function implementation*.

#problem-task[
  1. Download the files #fa-file-code() `a9.c`, #fa-file-code() `a9.h`, and #fa-file-code() `main.c` from the site.
  2. Implement the function `reverse_array()` as described.
  3. Submit only your modified #fa-file-code() `a9.c` file.

  Please make sure the directory structure looks like this before compiling on your computer:
  #information-block(
    backgroundColor: tail-color("stone", 200),
    sideBarColor: tail-color("stone", 200),
  )[
    ```
    .
    ├── a9.c
    ├── a9.h
    └── main.c
    ```
  ]
  You can compile the code using the command:
  #align(center)[
    ```bash
    gcc -std=c2x -o a9.exe main.c a9.c -lm
    ```
  ]
  Since you can only upload `a9.c` to the online judge, modifying `main.c` and `a9.h` is *not allowed*.
]

#problem-program-description[
  You are required to implement the following function defined in `a9.h`:

  #align(center)[
    ```c
    void reverse_array(const int n);
    ```
  ]

  which takes a length $n$, allocates the array with size $n$, reads the array from standard input and prints the reversed array.
]

// long long = 8 bytes
// 16 MB for array of 2 times 10^6 long longs
#problem-constraints[
  - The number of testcases $1 <= t <= 5$
  - The array length $1 <= n <= 2 times 10^6$
  - Each element value $-10^12 <= "val" <= 10^12$
  - Take your own risk to use global arrays.
  - Take care of the memory limit!
  - You may define helper functions inside `a9.c` if needed.
]

#problem-input-format([
  - The first line contains one integers $t$, the number of testcases.
  - For each testcase:
    - The first line contains two integer $n$, the length of the array.
    - The second line contains $n$ integers, the elements of the array separated by spaces.
])

#pagebreak()

#problem-output-format([
  - There are $t$ testcases. For each testcase:
    - The output should be a single line with the reversed array elements separated by spaces.
])


#problem-samples("A9-reverse")
