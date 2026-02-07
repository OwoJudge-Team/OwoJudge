#include <stdarg.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define rep(i, a, b) for (int i = a; i < b; i++)
#define rep1(i, a, b) for (int i = a; i <= b; i++)
#define int long long
#define MN 300005
#define LOGN 20

void debug(const char *fmt, ...) {
    return;
    va_list args;
    va_start(args, fmt);
    vprintf(fmt, args);
    va_end(args);
}

/*
------------------------------
Vector structure and functions
------------------------------
*/

typedef struct pii {
    int x, y;
} pii;

typedef struct Vec {
    pii *arr;
    int size, capacity;
} Vec;

Vec *vec_new() {
    Vec *v = (Vec *)malloc(sizeof(Vec));
    v->size = 0;
    v->capacity = 1;
    v->arr = (pii *)malloc(sizeof(pii) * v->capacity);
    return v;
}

void vec_push_back(Vec *v, const pii data) {
    if (v->size == v->capacity) {
        v->capacity <<= 1;
        v->arr = (pii *)realloc(v->arr, sizeof(pii) * v->capacity);
    }
    v->arr[v->size++] = data;
}

pii vec_at(const Vec *v, const int index) {
    return v->arr[index];
}

/*
------------------------------
End of vector structure
------------------------------
*/

/*
------------------------------
Fraction structure and functions
------------------------------
*/

typedef struct Frac {
    int p, q;
} Frac;

int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}

void frac_reduce(Frac *frac) {
    int r = gcd(frac->p, frac->q);
    frac->p /= r, frac->q /= r;
    if (frac->q < 0) frac->p = -frac->p, frac->q = -frac->q;
}

Frac frac_new(int numerator, int denominator) {
    Frac frac = {numerator, denominator};
    frac_reduce(&frac);
    return frac;
}

Frac frac_ave(Frac a, Frac b) {
    int num = a.p * b.q + b.p * a.q;
    int den = a.q * b.q * 2;
    return frac_new(num, den);
}

int frac_cmp(Frac a, Frac b) {
    return a.p * b.q - b.p * a.q;
}

/*
------------------------------
End of fraction structure
------------------------------
*/

int par_num, stu_num, q;
int cap[MN];
int delay[MN];
Vec *graph[MN];

int prev_slot[MN];

typedef struct Bike {
    int owner;
    Frac pos;
} Bike;

/*
------------------------------
Priority queue structure and functions
------------------------------
*/

typedef struct Info {
    int s, t;  // student, available time
} Info;

typedef struct PriorityQueue {
    Info *data;
    int size;
    int capacity;
} PriorityQueue;

PriorityQueue *pq_new(int capacity) {
    PriorityQueue *pq = (PriorityQueue *)malloc(sizeof(PriorityQueue));
    pq->size = 0;
    pq->capacity = capacity;
    pq->data = (Info *)malloc(capacity * sizeof(Info));
    return pq;
}

void swap(Info *a, Info *b) {
    Info t = *a;
    *a = *b;
    *b = t;
}

void pq_push(PriorityQueue *pq, Info info) {
    pq->size++;
    int i = pq->size - 1;
    pq->data[i] = info;
    while (i != 0 && pq->data[(i - 1) / 2].t > pq->data[i].t) {
        swap(&pq->data[i], &pq->data[(i - 1) / 2]);
        i = (i - 1) / 2;
    }
}

void heapify(PriorityQueue *pq, int i) {
    int smallest = i;
    int left = 2 * i + 1;
    int right = 2 * i + 2;
    if (left < pq->size && pq->data[left].t < pq->data[smallest].t) smallest = left;
    if (right < pq->size && pq->data[right].t < pq->data[smallest].t) smallest = right;
    if (smallest != i) {
        swap(&pq->data[i], &pq->data[smallest]);
        heapify(pq, smallest);
    }
}

void pq_pop(PriorityQueue *pq) {
    if (pq->size == 1) {
        pq->size--;
        return;
    }
    pq->data[0] = pq->data[pq->size - 1];
    pq->size--;
    heapify(pq, 0);
}

int pq_top_t(PriorityQueue *pq) {
    return pq->data[0].t;
}

int pq_empty(PriorityQueue *pq) {
    return pq->size == 0;
}

PriorityQueue *pq;

/*
------------------------------
End of priority queue structure
------------------------------
*/

/*
------------------------------
Handle tree distance
------------------------------
*/

int parent[MN][LOGN], depth[MN], dist[MN];

void dfs(int u, int p) {
    for (int i = 0; i < graph[u]->size; i++) {
        pii v = vec_at(graph[u], i);
        if (v.x != p) {
            parent[v.x][0] = u;
            dist[v.x] = dist[u] + v.y;
            depth[v.x] = depth[u] + 1;
            dfs(v.x, u);
        }
    }
}

void preprocess_lca() {
    dfs(0, -1);
    for (int j = 1; j < LOGN; j++) {
        for (int i = 0; i < par_num; i++) {
            if (parent[i][j - 1] != -1) {
                parent[i][j] = parent[parent[i][j - 1]][j - 1];
            }
        }
    }
}

int lca(int u, int v) {
    if (depth[u] < depth[v]) {
        int t = u;
        u = v;
        v = t;
    }
    for (int i = LOGN - 1; i >= 0; i--) {
        if (parent[u][i] != -1 && depth[parent[u][i]] >= depth[v]) {
            u = parent[u][i];
        }
    }
    if (u == v) return u;
    for (int i = LOGN - 1; i >= 0; i--) {
        if (parent[u][i] != parent[v][i]) {
            u = parent[u][i];
            v = parent[v][i];
        }
    }
    return parent[u][0];
}

int distance(int u, int v) {
    return dist[u] + dist[v] - 2 * dist[lca(u, v)];
}

/*
------------------------------
End of tree distance
------------------------------
*/

/*
------------------------------
Slot structure and functions
------------------------------
*/

typedef struct Slot {
    int cap;
    int bike_num;
    Bike bikes[32];
    bool occupied[16];
} Slot;

Slot slots[MN];

// this function maintain the order of bikes in the slot
void slot_insert_bike(Slot *slot, int owner, Frac pos) {
    int i = 0;
    while (i < slot->bike_num && frac_cmp(pos, slot->bikes[i].pos) > 0) i++;
    for (int j = slot->bike_num; j > i; j--) {
        slot->bikes[j] = slot->bikes[j - 1];
    }
    slot->bikes[i] = (Bike){owner, pos};
    slot->bike_num++;
}

/*
------------------------------
End of slot structure
------------------------------
*/

Frac park_bike(int s, int x, int p) {
    Slot *slot = &slots[x];
    prev_slot[s] = x;

    // has empty space at p
    if (!slot->occupied[p]) {
        Frac pos = frac_new(p, 1);
        slot->occupied[p] = true;
        slot_insert_bike(slot, s, pos);
        debug(">>> insert at empty space\n");
        return pos;
    }

    // find nearest empty space
    int l = p, r = p;
    while (l >= 1 && slot->occupied[l]) l--;
    while (r <= slot->cap && slot->occupied[r]) r++;
    debug(">>> l = %lld, r = %lld\n", l, r);

    // no integer empty space
    if (l == 0 && r == slot->cap + 1) {
        // find the bike index at position p
        int idx = 0;
        while (idx < slot->bike_num && frac_cmp(slot->bikes[idx].pos, frac_new(p, 1)) < 0) idx++;
        Frac pos = frac_ave(slot->bikes[idx - 1].pos, slot->bikes[idx].pos);
        if (idx == 0) pos = frac_ave(slot->bikes[idx].pos, slot->bikes[idx + 1].pos);
        slot_insert_bike(slot, s, pos);
        debug(">>> insert at middle\n");
        return pos;
    }

    // insert at the nearest empty space
    int pos = (p - l <= r - p) ? l : r;
    if (l == 0) pos = r;
    if (r == slot->cap + 1) pos = l;
    Frac frac_pos = frac_new(pos, 1);
    slot_insert_bike(slot, s, frac_pos);
    slot->occupied[pos] = true;
    debug(">>> insert at nearest empty space %lld.\n", pos);
    return frac_pos;
}

void park(int s, int x, int p) {
    Frac pos = park_bike(s, x, p);

    printf("%lld parked at (%lld, ", s, x);
    if (pos.q == 1) {
        printf("%lld).\n", pos.p);
    } else {
        printf("%lld/%lld).\n", pos.p, pos.q);
    }
}

void move(int s, int y, int p) {
    int x = prev_slot[s];
    if (x == y) {
        printf("%lld moved to %lld in 0 seconds.\n", s, y);
        return;
    }

    // remove from previous slot
    Slot *slot = &slots[x];
    for (int i = 0; i < slot->bike_num; i++) {
        if (slot->bikes[i].owner == s) {
            if (slot->bikes[i].pos.q == 1) {
                slot->occupied[slot->bikes[i].pos.p] = false;
            }
            // remove bike from slot
            for (int j = i; j < slot->bike_num - 1; j++) {
                slot->bikes[j] = slot->bikes[j + 1];
            }
            slot->bike_num--;
            break;
        }
    }

    int t = distance(x, y);
    printf("%lld moved to %lld in %lld seconds.\n", s, y, t);

    park_bike(s, y, p);
}

void clear(int x, int t) {
    Slot *slot = &slots[x];
    for (int i = 0; i < slot->bike_num; i++) {
        pq_push(pq, (Info){slot->bikes[i].owner, t + delay[slot->bikes[i].owner]});
    }
    memset(slot->occupied, false, sizeof(slot->occupied));
    slot->bike_num = 0;
}

void rearrange(int x, int t) {
    Slot *slot = &slots[x];
    int cnt = 0;
    Bike non_integer_bikes[32];
    int nn = 0;
    for (int i = 0; i < slot->bike_num; i++) {
        Bike bike = slot->bikes[i];
        if (bike.pos.q != 1) {
            pq_push(pq, (Info){bike.owner, t + delay[bike.owner]});
            cnt++;
        } else {
            non_integer_bikes[nn++] = bike;
        }
    }

    // copy back
    for (int i = 0; i < nn; i++) {
        slot->bikes[i] = non_integer_bikes[i];
    }
    slot->bike_num = nn;
    printf("Rearranged %lld bicycles in %lld.\n", cnt, x);
}

void fetch(int t) {
    int cnt = 0;
    while (!pq_empty(pq) && pq_top_t(pq) <= t) {
        pq_pop(pq);
        cnt++;
    }
    printf("At %lld, %lld bicycles was fetched.\n", t, cnt);
}

void rebuild(int x, int y, int d) {
}

signed main() {
    scanf("%lld%lld%lld", &par_num, &stu_num, &q);
    rep(i, 0, par_num) scanf("%lld", &slots[i].cap);
    rep(i, 0, stu_num) scanf("%lld", &delay[i]);

    rep(i, 0, par_num) graph[i] = vec_new();
    rep(i, 0, par_num - 1) {
        int u, v, w;
        scanf("%lld%lld%lld", &u, &v, &w);
        vec_push_back(graph[u], (pii){v, w});
        vec_push_back(graph[v], (pii){u, w});
    }

    preprocess_lca();
    pq = pq_new(stu_num);

    while (q--) {
        int type;
        scanf("%lld", &type);
        if (type == 0) {
            int s, y, p;
            scanf("%lld%lld%lld", &s, &y, &p);
            park(s, y, p);
        } else if (type == 1) {
            int s, y, p;
            scanf("%lld%lld%lld", &s, &y, &p);
            move(s, y, p);
        } else if (type == 2) {
            int x, t;
            scanf("%lld%lld", &x, &t);
            clear(x, t);
        } else if (type == 3) {
            int x, t;
            scanf("%lld%lld", &x, &t);
            rearrange(x, t);
        } else if (type == 4) {
            int t;
            scanf("%lld", &t);
            fetch(t);
        } else if (type == 5) {
            int x, y, d;
            scanf("%lld%lld%lld", &x, &y, &d);
            rebuild(x, y, d);
        }
    }
}