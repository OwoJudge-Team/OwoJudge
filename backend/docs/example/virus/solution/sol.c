#include <assert.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#define int long long
#define MN 500005
#define MQ 500005
#define swap(a, b)    \
    {                 \
        int temp = a; \
        a = b;        \
        b = temp;     \
    }

// === Global variables ===

int n, q;

int id[MN], node_count;
int c_size[MN + MQ], c_delete[MN + MQ], c_parent[MN + MQ];
int v_size[MN], v_parent[MN];

int c_virus[MN + MQ], c_damage[MN + MQ];
int v_count[MN], v_level[MN], v_damage[MN];

bool debug_mode = 0;

void print_all(int t, int a, int b);

#define COLOR_DEBUG "\033[1;36m"
#define COLOR_RESET "\033[0m"

void debug(const char *format, ...) {
    if (!debug_mode) return;
    va_list args;
    va_start(args, format);
    printf(COLOR_DEBUG);
    vprintf(format, args);
    printf(COLOR_RESET);
    va_end(args);
}

// === History ===

typedef struct {
    int *ptr;
    int original_value;
} Modify;

typedef struct {
    int size;
    Modify m[10];
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

int find_root(int *p, int x) {
    while (p[x] != x) x = p[x];
    return x;
}

int get_damage_virus(int k) {
    int damage = 0;
    while (v_parent[k] != k) {
        damage += v_damage[k];
        k = v_parent[k];
    }
    damage += v_damage[k];
    return damage;
}

int get_damage(int k) {
    int damage = 0;
    k = id[k];
    while (c_parent[k] != k) {
        damage += c_damage[k];
        k = c_parent[k];
    }
    damage += c_damage[k];
    damage += get_damage_virus(c_virus[k]);
    return damage;
}

// === Operations ===

// operation 1
void connect(int c1, int c2) {
    int rc1 = find_root(c_parent, id[c1]);
    int rc2 = find_root(c_parent, id[c2]);
    if (rc1 == rc2) return;

    int size1 = c_size[rc1] - c_delete[rc1];
    int size2 = c_size[rc2] - c_delete[rc2];

    bool is_c1 = true;
    if (c_size[rc1] < c_size[rc2]) is_c1 = false;
    if (is_c1) {
        modify(&c_parent[rc2], rc1);
        modify(&c_size[rc1], c_size[rc1] + c_size[rc2]);
        modify(&c_delete[rc1], c_delete[rc1] + c_delete[rc2]);
    } else {
        modify(&c_parent[rc1], rc2);
        modify(&c_size[rc2], c_size[rc1] + c_size[rc2]);
        modify(&c_delete[rc2], c_delete[rc1] + c_delete[rc2]);
    }

    int rv1 = find_root(v_parent, c_virus[rc1]);
    int rv2 = find_root(v_parent, c_virus[rc2]);

    int damage1 = get_damage_virus(c_virus[rc1]);
    int damage2 = get_damage_virus(c_virus[rc2]);

    if (rv1 == rv2) {
        if (is_c1) {
            modify(&c_damage[rc2], c_damage[rc2] + damage2 - damage1 - c_damage[rc1]);
        } else {
            modify(&c_damage[rc1], c_damage[rc1] + damage1 - damage2 - c_damage[rc2]);
        }
        return;
    }

    bool is_v1 = true;
    if (v_level[rv1] < v_level[rv2]) is_v1 = false;

    if (is_c1 && is_v1) {
        modify(&c_damage[rc2], c_damage[rc2] + damage2 - damage1 - c_damage[rc1]);
        modify(&v_count[rv1], v_count[rv1] + size2);
        modify(&v_count[rv2], v_count[rv2] - size2);
    } else if (is_c1 && !is_v1) {
        modify(&c_virus[rc1], rv2);
        modify(&c_damage[rc1], c_damage[rc1] + damage1 - v_damage[rv2]);
        modify(&c_damage[rc2], c_damage[rc2] - c_damage[rc1] + damage2 - v_damage[rv2]);
        modify(&v_count[rv2], v_count[rv2] + size1);
        modify(&v_count[rv1], v_count[rv1] - size1);
    } else if (!is_c1 && is_v1) {
        modify(&c_virus[rc2], rv1);
        modify(&c_damage[rc2], c_damage[rc2] + damage2 - v_damage[rv1]);
        modify(&c_damage[rc1], c_damage[rc1] - c_damage[rc2] + damage1 - v_damage[rv1]);
        modify(&v_count[rv1], v_count[rv1] + size2);
        modify(&v_count[rv2], v_count[rv2] - size2);
    } else {
        modify(&c_damage[rc1], c_damage[rc1] + damage1 - damage2 - c_damage[rc2]);
        modify(&v_count[rv2], v_count[rv2] + size1);
        modify(&v_count[rv1], v_count[rv1] - size1);
    }
}

// operation 2
void evolve(int t) {
    t = find_root(v_parent, t);
    modify(&v_level[t], v_level[t] + 1);
}

// operation 3
void attack(int t) {
    t = find_root(v_parent, t);
    modify(&v_damage[t], v_damage[t] + v_level[t]);
}

// operation 4
void reinstall(int k, int s) {
    int rck = find_root(c_parent, id[k]);
    modify(&c_delete[rck], c_delete[rck] + 1);

    modify(&node_count, node_count + 1);
    modify(&id[k], node_count);

    int rvk = find_root(v_parent, c_virus[rck]);
    int rvs = find_root(v_parent, s);
    if (rvk != rvs) {
        modify(&v_count[rvk], v_count[rvk] - 1);
        modify(&v_count[rvs], v_count[rvs] + 1);
    }

    k = id[k];
    modify(&c_virus[k], s);
    modify(&c_damage[k], -get_damage_virus(s));
}

// operation 5
void fusion(int v1, int v2) {
    int rv1 = find_root(v_parent, v1);
    int rv2 = find_root(v_parent, v2);
    if (rv1 == rv2) return;

    if (v_size[rv1] < v_size[rv2]) swap(rv1, rv2);
    modify(&v_parent[rv2], rv1);
    modify(&v_size[rv1], v_size[rv1] + v_size[rv2]);

    modify(&v_count[rv1], v_count[rv1] + v_count[rv2]);
    modify(&v_count[rv2], 0);
    modify(&v_level[rv1], v_level[rv1] + v_level[rv2]);
    modify(&v_damage[rv2], v_damage[rv2] - v_damage[rv1]);
}

// operation 6
void status(int k) {
    int damage = get_damage(k);
    int rck = find_root(c_parent, id[k]);
    int rvk = find_root(v_parent, c_virus[rck]);
    printf("%lld %lld %lld\n", damage, v_level[rvk], v_count[rvk]);

    if (damage < 0 || v_count[rvk] < 0) {
        debug_mode = 1;
        print_all(6, k, 0);
        printf("\n\nERROR\n\n");
        exit(1);
    }
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

void init() {
    node_count = n;

    for (int i = 1; i <= n + q; i++) {
        c_size[i] = 1;
        c_parent[i] = i;
        c_delete[i] = 0;
    }

    for (int i = 1; i <= n; i++) {
        v_size[i] = 1;
        v_parent[i] = i;
    }

    for (int i = 1; i <= n; i++) {
        id[i] = i;
        c_virus[i] = i;
        c_damage[i] = 0;
        v_count[i] = 1;
        v_level[i] = 1;
        v_damage[i] = 0;
    }

    for (int i = 0; i < q; i++) {
        history[i].size = 0;
    }
}

signed main() {
    assert(scanf("%lld %lld", &n, &q) == 2);

    init();

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
        if (t != 6) print_all(t, a, b);
        if (t <= 5) top++;
    }

    return 0;
}

void print_all(int t, int a, int b) {
    if (!debug_mode) return;

    bool bug = false;

    printf("\n=== DEBUG ===\n\n");

    printf(">>> after operation %lld ", t);
    if (t == 1 || t == 4 || t == 5) {
        printf("%lld %lld", a, b);
    } else if (t == 2 || t == 3 || t == 6) {
        printf("%lld", a);
    }
    printf("\n\n");

    printf("id           ");
    for (int i = 1; i <= n; i++) {
        printf("%3lld ", id[i]);
    }
    printf("\n");

    printf("real dmg     ");
    for (int i = 1; i <= n; i++) {
        int damage = get_damage(i);
        printf("%3lld ", damage);
        if (damage < 0) bug = true;
    }
    printf("\n\n");

    printf("c_size       ");
    for (int i = 1; i <= n + 20; i++) {
        printf("%3lld ", c_size[i]);
    }
    printf("\n");

    printf("c_parent     ");
    for (int i = 1; i <= n + 20; i++) {
        printf("%3lld ", c_parent[i]);
    }
    printf("\n");

    printf("c_delete     ");
    for (int i = 1; i <= n + 20; i++) {
        printf("%3lld ", c_delete[i]);
    }
    printf("\n\n");

    printf("c_virus      ");
    for (int i = 1; i <= n + 20; i++) {
        printf("%3lld ", c_virus[i]);
    }
    printf("\n");

    printf("c_damage     ");
    for (int i = 1; i <= n + 20; i++) {
        printf("%3lld ", c_damage[i]);
    }
    printf("\n\n");

    printf("v_size       ");
    for (int i = 1; i <= n; i++) {
        printf("%3lld ", v_size[i]);
    }
    printf("\n");

    printf("v_parent     ");
    for (int i = 1; i <= n; i++) {
        printf("%3lld ", v_parent[i]);
    }
    printf("\n\n");

    printf("v_count      ");
    for (int i = 1; i <= n; i++) {
        printf("%3lld ", v_count[i]);
        if (v_count[i] < 0) bug = true;
    }
    printf("\n");

    printf("v_level      ");
    for (int i = 1; i <= n; i++) {
        printf("%3lld ", v_level[i]);
    }
    printf("\n");

    printf("v_damage     ");
    for (int i = 1; i <= n; i++) {
        printf("%3lld ", v_damage[i]);
    }
    printf("\n\n");

    printf("history    size = %lld    ", top + 1);
    History *h = &history[top];
    for (int i = 0; i < h->size; i++) {
        Modify *m = &h->m[i];
        printf("(%lld -> %lld) ", m->original_value, *(m->ptr));
    }
    printf("\n");

    printf("\n=== DEBUG END ===\n\n");

    if (bug) {
        printf("\n\nERROR\n\n");
        exit(1);
    }
}