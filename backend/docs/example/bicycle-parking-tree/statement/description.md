# Bicycle Parking Tree

## Modification Notes

- **At any time, there's only one bicycle for each student in either Shuiyuan or the parking tree.**
- **The time $t$ in all operations are given in an strictly ascending order.**
- **At any time, the number `p/q` can be stored in two signed 64-bit integers.** 

These three constraints have been added to the problem description. However, if you have already received an AC on the judge, these changes will not affect your score.

## Problem Description

NTU has a high number of bikes, but parking spaces are limited. As a result, students often squeeze others' bikes into tight spots, leading to overcrowding. This not only makes it difficult for students to locate their bikes when leaving but also increases the risk of theft. To better understand the issue, NTU's General Affairs Office has decided to analyze students' parking patterns.

To simplify the analysis, each parking slot is considered a node, and these slots together form a tree connected by trails. That is, there will be a unique path of trails from one slot to any other slot. We represent $w(x, y)$ as the travel time through the trail that connects slots $x$ and $y$ in the tree structure. Then, for any unique path from slot $x$ to slot $z$, the total travel time is the sum of the times on the trails within the path.

There is a coordinate system $[1, c_x]$ in a parking slot $x$ with a designed capacity $c_x$. Each slot is designed to accommodate one or more bikes. Students are allowed to park their bikes in any slot and move them between slots as needed. However, to maintain order and cleanliness, the university periodically clears and rearranges the parking slots, relocating some bikes to Shuiyuan. The students need to go to Shuiyuan on school buses to rescue their bikes after being notified.

There are $5 + 1$ types of operations:

1. Park $s, x, p$: Student $s$ parks a bike at the parking slot $x$ with intended position $p$. The parking policy is as follows.
    - If the parking slot has an empty space at $p$, the student parks zir bike at $p$.
    - Otherwise, if there is another vacancy (i.e. an integer location $p'$ that is not occupied) in the same parking slot. Ze will select the nearest empty space in $x$. If there are two nearest vacancies, ze will choose the one with a smaller value.
    - Otherwise, $p$ (and other integer positions) must be occupied. If the left-most bike is not parked at $p$, ze will insert zir bike in the middle of two bikes that are to the left of $p$ and $p$. For example, if the parking slot with capacity $3$ has `1 2 3` occupied, and one wants to park at position `3`, ze will park at `5/2`. 
    - Otherwise, the left-most bike is parked at $p$. Then, ze will insert zir bike the middle of two bikes that are to the right of $p$ and $p$. For example, if the parking slot with capacity $3$ has `1 3/2 2 3` occupied, and one wants to park at position `1`, ze will park at `5/4`. 
2. Move $s, y, p$: Student $s$ moves zir bike from the parking slot that ze has parked (called $x$) to another parking slot $y$ with intended position $p$. Please calculate the travel time from $x$ to $y$. The parking policy is the same as the type-1 operation. If $x = y$, the bike **will not be moved at all** (i.e. the position will not be changed) and the travel time is $0$.
3. Clear $x, t$: At time $t$, clear a parking slot $x$ and relocate all bikes to Shuiyuan. Each student  $s$ of the relocated bikes will be notified at time $t + \ell_s$ that zir bike has been relocated.
4. Rearrange $x, t$: At time $t$, relocate all \textbf{rule-violating} bikes in slot $x$ to Shuiyuan. The rule-violating bikes are those parked in non-integer positions of $x$. Each student $s$ of the relocated bikes will be notified at time $t + \ell_s$ that zir bike has been relocated.
5. Fetch $t$: At time $t$, there is a school bus from the NTU to Shuiyuan. Students who have been notified to fetch their bikes, including those who have been notified at time $t$, will go to Shuiyuan by this bus together to rescue their bikes. After rescuing, the student will wander around on zir bike without parking them. That is, those bike will not be parked immediately---they will be parked with type-1 operation later.
6. Rebuild $x, y, d$ (bonus): Sometimes, the Dwellers and Student Affairs want to adjust the trail so that $w(x, y)$ is changed to $d > 0$. It is guaranteed that there is a trail between $x$ and $y$ within the original tree-structured slots.

## Illustration

<center>
<img src="https://live.staticflickr.com/65535/54409011118_2826e1fdfc_k.jpg" width=550>
</center>

## Input

- The first line contains three integers $n$, $m$, and $q$ representing the number of parking slots (tree nodes), the number of students (users), and the number of operations, respectively.
- The second line contains $n$ integers representing the capacity for each parking slot (tree nodes) $c_x$ for $x \in \{0, 1, \dots, n-1\}$.
- The third line contains $m$ integers representing the fetch time $\ell_s$ for each student (user) $s$ for $s \in \{0, 1, \dots, m-1\}$.
- The next $n-1$ lines contain three integers $x$, $y$, and $w$ representing the parking slots (tree nodes) $x$ and $y$ are connected by a trail (edge) with travel time (weight) $w$.
- The next $q$ lines contain the operations. For each operation:

1. Park: `0 s x p`
2. Move: `1 s y p`
3. Clear: `2 x t`
4. Rearrange: `3 x t`
5. Fetch: `4 t`
6. Rebuild: `5 x y d`

Both $\ell_u$ and $t$ are measured by seconds.

## Output

For each operation, output the following.
1. Park:
    <center>
    <code>[s] parked at ([x], [fp]).</code>
    </center>

    where $\text{fp}$ is the final location of the bike (the second part of the pair being inserted to $x$). Display $\text{fp}$ by an irreducible fraction of `p/q`. If $q = 1$, you should output only `p`.
2. Move:
    <center>
    <code>[s] moved to [y] in [t] seconds.</code>
    </center>

    You only need to output \texttt{seconds} in all cases, without changing to a singular form.
3. Clear: output nothing
4. Rearrange:
    <center>
    <code>
    Rearranged [n] bicycles in [x].
    </code>
    </center>

5. Fetch:
    <center>
    <code>
    At [t], [n] bicycles was fetched.
    </code>
    </center>
    
6. Rebuild: output nothing

## Constraint

- $1 \leq n, m \leq 3 \times 10^5$, $1 \leq q \leq 10^5$
- $0 \leq s < m$
- $0 \leq x, y < n$
- $0 \leq w(x, y) \leq 10^{5}$, $0 \leq d \leq 10^{5}$
- $0 \leq t \leq 10^{15}$
- $1 \leq p \leq c_x$ with $2 \leq c_x \leq 15$ for all $x \in \{0, 1, \dots, n-1\}$
- $0 \leq \ell_s \leq 10^6$ for all $s \in \{0, 1, \ldots, m-1\}$
- At any time, the number of bikes/elements in a single (parking slot/node) $x$ will not exceed $2 \times c_x$.
- The time $t$ in all operations are given in an strictly ascending order.
- **At any time, there's only one bicycle for each student in either Shuiyuan or the parking tree.**
- **At any time, the number `p/q` can be stored in two signed 64-bit integers.** 

For each operation:

1. Park: It is guaranteed that the bike of student $s$ is not in any of the parking slots.
1. Move: It is guaranteed that the bike of student $s$ is in a parking slot.
1. Clear: It is guaranteed that the parking slot $x$ is not empty.
1. Rearrange: It is guaranteed that the parking slot $x$ is not empty.
1. Fetch: It is guaranteed that the fetch time is in strictly ascending order.
1. Rebuild: It is guaranteed that the parking slot $x$ and $y$ are connected by an original trail.

## Subtask

### Subtask 1 (10pt)

- $1 \leq n, m \leq 3 \times 10^2$
- $1 \leq q \leq 3 \times 10^2$
- Only operations 1 and 2 are present.

### Subtask 2 (20pt)

- $1 \leq n, m \leq 3 \times 10^2$
- $1 \leq q \leq 10^3$
- Only operations 1, 2, 3, 4, and 5 are present.

### Subtask 3 (20pt)

- $1 \leq n \leq 3 \times 10^2$
- Only operations 1, 2, 3, 4, and 5 are present.

### Subtask 4 (50pt)

- Only operations 1, 2, 3, 4, and 5 are present.

<!-- ### Subtask 5 (Bonus: 30pt)

- $\forall j \in [0, n), 2 \leq c_j \leq 10 ^ 6$
- Only operations 1, 2, 3, 4, and 5 are valid. -->

### Subtask 5 (Bonus: Free Beverage)

- All operations are present.

## Sample Testcases

### Sample Input 1

```
1 5 3
3
0 0 0 0 0
0 0 0 2
0 1 0 2
0 2 0 2

```

### Sample Output 1

```
0 parked at (0, 2).
1 parked at (0, 1).
2 parked at (0, 3).

```

### Sample Input 2

```
1 5 6
3
0 0 0 0 0
0 0 0 1
0 1 0 2
0 2 0 3
0 3 0 3
3 0 1
0 4 0 3

```

### Sample Output 2

```
0 parked at (0, 1).
1 parked at (0, 2).
2 parked at (0, 3).
3 parked at (0, 5/2).
Rearranged 1 bicycles in 0.
4 parked at (0, 5/2).

```

### Sample Input 3

```
1 5 6
3
3 4 5 6 7
0 0 0 1
0 1 0 1
0 2 0 1
0 3 0 1
2 0 1
4 6

```

### Sample Output 3

```
0 parked at (0, 1).
1 parked at (0, 2).
2 parked at (0, 3).
3 parked at (0, 3/2).
At 6, 3 bicycles was fetched.

```

### Sample Input 4

```
6 5 6
3 3 3 4 4 4
3 4 5 6 7
0 2 1
0 5 4
1 5 7
2 3 2
4 5 3
0 0 0 1
1 0 1 1
1 0 4 1
1 0 2 1
1 0 3 1
1 0 2 1

```

### Sample Output 4

```
0 parked at (0, 1).
0 moved to 1 in 11 seconds.
0 moved to 4 in 10 seconds.
0 moved to 2 in 8 seconds.
0 moved to 3 in 2 seconds.
0 moved to 2 in 2 seconds.

```

### Sample Input 5
```
5 10 10
5 10 6 11 2
0 0 0 0 0 0 0 0 0 0
3 0 49410
3 2 54898
2 1 76874
4 1 14829
0 6 4 1
5 3 0 315398
0 0 4 1
0 3 4 2
0 2 4 1
2 4 18337236
0 7 2 4
1 7 2 5
0 4 0 3
2 2 37134602

```

### Sample Output 5
```
6 parked at (4, 1).
0 parked at (4, 2).
3 parked at (4, 3/2).
2 parked at (4, 5/4).
7 parked at (2, 4).
7 moved to 2 in 0 seconds.
4 parked at (0, 3).

```