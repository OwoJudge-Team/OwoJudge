#include <assert.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#define int long long
#define MN 1005
#define MQ 1005
#define swap(a, b)    \
    {                 \
        int temp = a; \
        a = b;        \
        b = temp;     \
    }

// === Global variables ===

int n, q;

int group_count;
int c_virus[MN], c_damage[MN], c_gid[MN];
int v_level[MN], v_gid[MN];

// === History ===

typedef struct {
    int *ptr;
    int original_value;
} Modify;

typedef struct {
    int size;
    Modify m[MN * 5];
} History;

int top = 0;
History history[MQ];

// === Functions ===

void modify(int *ptr, int value) {
    History *h = &history[top];
    h->m[h->size].ptr = ptr;
    h->m[h->size].original_value = *ptr;
    h->size++;
    *ptr = value;
}

// === Operations ===

// operation 1
void connect(int c1, int c2) {
    int g1 = c_gid[c1], g2 = c_gid[c2];
    if (g1 == g2) return;

    for (int i = 1; i <= n; i++) {
        if (c_gid[i] == g2) {
            modify(&c_gid[i], g1);
        }
    }

    int v1 = c_virus[c1], v2 = c_virus[c2];
    if (v1 == v2) return;

    for (int i = 1; i <= n; i++) {
        if (c_gid[i] == g1) {
            if (v_level[v1] < v_level[v2]) {
                modify(&c_virus[i], v2);
            } else {
                modify(&c_virus[i], v1);
            }
        }
    }
}

// operation 2
void evolve(int t) {
    for (int i = 1; i <= n; i++) {
        if (v_gid[i] == v_gid[t]) {
            modify(&v_level[i], v_level[i] + 1);
        }
    }
}

// operation 3
void attack(int t) {
    for (int i = 1; i <= n; i++) {
        if (v_gid[c_virus[i]] == v_gid[t]) {
            modify(&c_damage[i], c_damage[i] + v_level[c_virus[i]]);
        }
    }
}

// operation 4
void reinstall(int k, int s) {
    modify(&c_virus[k], s);
    modify(&c_damage[k], 0);
    modify(&c_gid[k], ++group_count);
}

// operation 5
void fusion(int v1, int v2) {
    int g1 = v_gid[v1], g2 = v_gid[v2];
    if (g1 == g2) return;
    int level_sum = v_level[v1] + v_level[v2];
    for (int i = 1; i <= n; i++) {
        if (v_gid[i] == g1) {
            modify(&v_level[i], level_sum);
        } else if (v_gid[i] == g2) {
            modify(&v_gid[i], g1);
            modify(&v_level[i], level_sum);
        }
    }
}

// operation 6
void status(int k) {
    int v = c_virus[k];
    int count = 0;
    for (int i = 1; i <= n; i++) {
        if (v_gid[c_virus[i]] == v_gid[v]) {
            count++;
        }
    }
    printf("%lld %lld %lld\n", c_damage[k], v_level[v], count);
}

// operation 7
void revert() {
    if (top == 0) return;
    top--;
    History *h = &history[top];
    for (int i = h->size - 1; i >= 0; i--) {
        Modify *m = &h->m[i];
        *(m->ptr) = m->original_value;
    }
    h->size = 0;
}

void print(int t, int a, int b) {
    printf("\n=== DEBUG START ===\n");

    printf("\nafter operation %lld %lld %lld\n", t, a, b);

    printf("\nc_gid:    ");
    for (int i = 1; i <= n; i++) {
        printf("%2lld ", c_gid[i]);
    }
    printf("\nc_virus:  ");
    for (int i = 1; i <= n; i++) {
        printf("%2lld ", c_virus[i]);
    }
    printf("\nc_damage: ");
    for (int i = 1; i <= n; i++) {
        printf("%2lld ", c_damage[i]);
    }
    printf("\nv_level:  ");
    for (int i = 1; i <= n; i++) {
        printf("%2lld ", v_level[i]);
    }
    printf("\nv_gid:    ");
    for (int i = 1; i <= n; i++) {
        printf("%2lld ", v_gid[i]);
    }

    printf("\n\n=== DEBUG END ===\n\n");
}

signed main() {
    assert(scanf("%lld %lld", &n, &q) == 2);

    group_count = n;
    for (int i = 1; i <= n; i++) {
        c_virus[i] = i;
        c_damage[i] = 0;
        c_gid[i] = i;
        v_level[i] = 1;
        v_gid[i] = i;
    }

    for (int i = 1; i <= q; i++) {
        int t, a, b;
        assert(scanf("%lld", &t) == 1);
        if (t == 1) {
            assert(scanf("%lld %lld", &a, &b) == 2);
            connect(a, b);
        } else if (t == 2) {
            assert(scanf("%lld", &a) == 1);
            evolve(a);
        } else if (t == 3) {
            assert(scanf("%lld", &a) == 1);
            attack(a);
        } else if (t == 4) {
            assert(scanf("%lld %lld", &a, &b) == 2);
            reinstall(a, b);
        } else if (t == 5) {
            assert(scanf("%lld %lld", &a, &b) == 2);
            fusion(a, b);
        } else if (t == 6) {
            assert(scanf("%lld", &a) == 1);
            status(a);
        } else if (t == 7) {
            revert();
        }
        // print(t, a, b);
        if (t <= 5) top++;
    }

    return 0;
}
