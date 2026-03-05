# Virus

## Problem Description

You are to simulate the infection of $N$ computers by various viruses. The computers are labeled $C_1, C_2, \dots, C_N$, and initially, each computer $C_i$ is infected with a unique virus $V_i$. Every virus starts with a level $r_i = 1$. Each computer also has a damage level $d_k$, initially 0, representing the extent of damage caused by the virus.

Throughout the simulation, computers can be connected into networks, viruses can evolve or fuse, computers can be reinstalled, and the simulation must support undoing operations to revert to a previous state.

## Operations

You must support the following operations:

1. **Network Merge (`connect`)**: `1 x y`  
   Connect the networks to which computers $C_x$ and $C_y$ belong. The stronger virus will overwrite the weaker one. Suppose $C_x$ and $C_y$ are infected with viruses $V_a$ and $V_b$, respectively. If $r_a \ge r_b$, then all computers in the merged network will be infected with $V_a$; otherwise, they will be infected with $V_b$.

   - If $C_x$ and $C_y$ are already in the same network, do nothing (but still count as a valid operation for `revert`).
   - If they are infected by the same virus, just merge the networks without changing the infection.
   - The weaker virus will still exist in the system and its level will remain unchanged. It may still appear in future operations.

2. **Virus Evolution (`evolve`)**: `2 t`  
   Virus $V_t$ evolves, increasing its level $r_t$ by 1.

3. **Virus Attack (`attack`)**: `3 t`  
   Virus $V_t$ attacks. Every computer infected with $V_t$ increases its damage $d_i$ by $r_t$.

4. **Reinstall Computer (`reinstall`)**: `4 k s`  
   Computer $C_k$ is reformatted: removed from its current network, damage reset to $0$, and re-infected with virus $V_s$.

   - $V_s$ retains its current level.

5. **Virus Fusion (`fusion`)**: `5 a b`  
   Viruses $V_a$ and $V_b$ fuse into one. The resulting virus has level $r_a + r_b$, and from now on, $V_a$ and $V_b$ are considered **the same virus**.

   - For example, an evolution of $V_a$ is equivalent to an evolution of $V_b$.
   - If they are already fused, do nothing (still counts for `revert`).

6. **Query Computer Status (`status`)**: `6 k`  
   Query the state of computer $C_k$:  
   Output three integers: the damage level $d_k$, the level of its virus $r_t$, and the number of computers infected by that virus.

7. **Undo Last Operation (`revert`)**: `7`  
   Undo the most recent operation that is **not** `status` or `revert`. Revert all states (networks, virus types/levels, damage, etc.) to how they were before that operation.
   - If no operation can be undone, do nothing.

## Constraints

- $1 \leq N \leq 5 \times 10^5$: Number of computers (and initial virus types)
- $1 \leq Q \leq 5 \times 10^5$: Number of operations
- $1 \leq x, y, k \leq N$: ID of a computer
- $1 \leq a, b, t, s \leq N$: ID of a virus
- $x \ne y,\; a \ne b$

## Subtasks

1. **(10%)**

   - $1 \leq N, Q \leq 1000$
   - Includes all operations

2. **(10%)**

   - $1 \leq N, Q \leq 5 \times 10^5$
   - Only includes operations 1, 2, 3, 6

3. **(20%)**

   - $1 \leq N, Q \leq 5 \times 10^5$
   - Only includes operations 1, 2, 3, 4, 6, 7

4. **(60%)**

   - $1 \leq N, Q \leq 5 \times 10^5$
   - Includes all operations

## Input Format

The first line contains two integers $N$ and $Q$, the number of computers and operations.  
Each of the next $Q$ lines contains one operation as described above.

## Output Format

For each status query `7 k`, output a line with three space-separated integers:

- The damage level of the computer $d_k$
- The level of the virus $r_t$ infecting it
- The number of computers infected by that kind of virus

## Samples

### Sample Input 1

```
5 15
1 1 2
3 1
3 4
6 2
2 4
1 3 4
3 4
6 4
1 5 2
3 5
2 4
3 4
6 1
6 3
6 5
```

### Sample Output 1

```
1 1 2
3 2 2
2 1 3
5 3 2
1 1 3
```

### Sample Input 2

```
5 12
1 1 2
3 1
3 4
2 2
2 4
1 3 4
3 4
5 4 5
3 4
4 4 2
6 1
6 4
```

### Sample Output 2

```
1 1 2
0 2 1
```

### Sample Input 3

```
5 37
1 1 2
3 1
3 4
6 2
2 4
1 3 4
3 4
6 4
1 5 2
3 5
2 4
3 4
6 1
6 3
6 5
7
7
7
7
5 4 5
3 4
6 1
6 3
6 5
4 4 1
6 1
2 1
3 1
6 2
6 3
6 4
7
7
7
4 4 2
6 1
6 4
```

### Sample Output 3

```
1 1 2
3 2 2
2 1 3
5 3 2
1 1 3
1 1 2
5 3 3
3 3 3
1 1 3
3 2 3
5 3 2
2 2 3
1 1 2
0 1 1
```

## Notes

- A computer can only be infected by one virus at a time.
- A virus can infect multiple disconnected networks.
- A network refers to a group of computers that are connected directly or indirectly.
- The Disjoint Set Union (DSU) data structure is likely essential for the implementation. You might find this helpful: [OI Wiki - DSU](https://oi-wiki.org/ds/dsu/)
