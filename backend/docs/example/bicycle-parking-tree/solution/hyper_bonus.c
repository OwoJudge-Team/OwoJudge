#include <assert.h>
#include <math.h>
#include <stdarg.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#define rep(i, a, b) for (int i = a; i < b; i++)
#define rep1(i, a, b) for (int i = a; i <= b; i++)
#define int long long
#define MN 300005
#define SQRTC 500
typedef struct Info {
    int s, t;  // student, available time
} Info;
void swap(Info *a, Info *b) {
    Info t = *a;
    *a = *b;
    *b = t;
}
typedef struct PriorityQueue {
    Info *data;
    int size;
    int capacity;
} PriorityQueue;
PriorityQueue *pq;
PriorityQueue *pq_new(int capacity) {
    PriorityQueue *pq = (PriorityQueue *)malloc(sizeof(PriorityQueue));
    pq->size = 0;
    pq->capacity = capacity;
    pq->data = (Info *)malloc(capacity * sizeof(Info));
    return pq;
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
    int sm = i, l = 2 * i + 1, r = 2 * i + 2;
    if (l < pq->size && pq->data[l].t < pq->data[sm].t) sm = l;
    if (r < pq->size && pq->data[r].t < pq->data[sm].t) sm = r;
    if (sm != i) {
        swap(&pq->data[i], &pq->data[sm]);
        heapify(pq, sm);
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
typedef struct Frac {
    int p, q;
} Frac;
static int gcd(int a, int b) { return b == 0 ? a : gcd(b, a % b); }
Frac frac_new(int p, int q) {
    Frac f = {p, q};
    int r = gcd(f.p, f.q);
    f.p /= r, f.q /= r;
    if (f.q < 0) f.p = -f.p, f.q = -f.q;
    return f;
}
Frac frac_ave(Frac a, Frac b) {
    int p = a.p * b.q + b.p * a.q;
    int q = a.q * b.q * 2;
    return frac_new(p, q);
}
int frac_cmp(Frac a, Frac b) { return a.p * b.q - b.p * a.q; }
bool frac_is_int(Frac f) { return f.q == 1; }
void frac_print(Frac f) {
    if (f.q == 1)
        printf("%lld", f.p);
    else
        printf("%lld/%lld", f.p, f.q);
}
typedef struct Bike {
    int owner;
    Frac pos;
} Bike;
typedef struct BikeNode {
    struct BikeNode *next, *prev;
    Bike bike;
} BikeNode;
typedef struct HeadNode {
    struct HeadNode *next, *prev;
    BikeNode *head, *tail;
    int cap, len;
} HeadNode;
typedef struct Slot {
    int cap, int_num;
    HeadNode *head, *tail;
} Slot;
BikeNode *bikenode_new(Bike bike) {
    BikeNode *node = (BikeNode *)malloc(sizeof(BikeNode));
    node->next = node->prev = NULL;
    node->bike = bike;
    return node;
}
HeadNode *headnode_new(int cap) {
    HeadNode *node = (HeadNode *)malloc(sizeof(HeadNode));
    node->head = node->tail = NULL;
    node->next = node->prev = NULL;
    node->cap = cap;
    node->len = 0;
    return node;
}
Slot *slot_new() {
    Slot *slot = (Slot *)malloc(sizeof(Slot));
    slot->cap = slot->int_num = 0;
    slot->head = slot->tail = headnode_new(SQRTC);
    return slot;
}
BikeNode *list_insert(HeadNode *h, BikeNode *b) {
    h->len++;
    if (h->head == NULL) {
        h->head = h->tail = b;
        return NULL;
    }
    if (frac_cmp(h->head->bike.pos, b->bike.pos) > 0) {
        b->next = h->head;
        h->head = h->head->prev = b;
    } else {
        BikeNode *cur = h->head;
        while (cur->next != NULL && frac_cmp(cur->next->bike.pos, b->bike.pos) < 0) cur = cur->next;
        b->prev = cur;
        b->next = cur->next;
        if (cur->next != NULL)
            cur->next->prev = b;
        else
            h->tail = b;
        cur->next = b;
    }
    if (h->len > h->cap) {
        BikeNode *last = h->tail;
        h->tail = h->tail->prev;
        h->tail->next = NULL;
        h->len--;
        return last;
    }
    return NULL;
}
BikeNode *list_has(HeadNode *h, Frac pos) {
    for (BikeNode *cur = h->head; cur != NULL; cur = cur->next)
        if (frac_cmp(cur->bike.pos, pos) == 0) return cur;
    return NULL;
}
int find_before(int p, BikeNode *x, HeadNode *h) {
    bool found = false;
    while (x != NULL) {
        int res = frac_cmp(x->bike.pos, frac_new(p, 1));
        if (res < 0) {
            found = true;
            break;
        } else if (res == 0) {
            p--, x = x->prev;
        } else
            x = x->prev;
    }
    if (!found && h->prev != NULL && h->prev->tail->bike.pos.p == p) return -1;
    return p;
}
int find_after(int p, BikeNode *x, HeadNode *h) {
    bool found = false;
    while (x != NULL) {
        int res = frac_cmp(x->bike.pos, frac_new(p, 1));
        if (res > 0) {
            found = true;
            break;
        } else if (res == 0) {
            p++, x = x->next;
        } else
            x = x->next;
    }
    if (!found && h->next != NULL && h->next->head->bike.pos.p == p) return -1;
    return p;
}
int find_nearest_smaller_int(int p, BikeNode *x, HeadNode *h, int cap) {
    p = find_before(p, x, h);
    if (p != -1) return p;
    HeadNode *tmp = h;
    h = h->prev;
    while (h != NULL && (tmp->head->bike.pos.p - h->head->bike.pos.p) == cap) tmp = h, h = h->prev;
    if (h == NULL) return -1;
    x = h->tail;
    p = x->bike.pos.p;
    p = find_before(p, x, h);
    if (p != -1) return p;  // FIXME: ELSE ERROR
}
int find_nearest_bigger_int(int p, BikeNode *x, HeadNode *h, int cap) {
    p = find_after(p, x, h);
    if (p != -1) return p;
    HeadNode *tmp = h;
    h = h->next;
    while (h != NULL && (h->tail->bike.pos.p - tmp->tail->bike.pos.p) == cap) tmp = h, h = h->next;
    if (h == NULL) return -1;
    x = h->head;
    p = x->bike.pos.p;
    p = find_after(p, x, h);
    if (p != -1) return p;  // FIXME: ELSE ERROR
}
Frac slot_insert(Slot *slot, int p, int owner) {
    Bike final_bike = {owner, frac_new(p, 1)};
    HeadNode *cur = slot->head;
    while (cur->next != NULL && frac_cmp(cur->next->head->bike.pos, final_bike.pos) <= 0) cur = cur->next;
    BikeNode *exact = list_has(cur, final_bike.pos);
    if (slot->int_num == slot->cap) {
        if (p == 1) {
            if (exact->next != NULL)
                final_bike.pos = frac_ave(final_bike.pos, exact->next->bike.pos);
            else
                final_bike.pos = frac_ave(final_bike.pos, cur->next->head->bike.pos);
        } else {
            if (exact->prev != NULL)
                final_bike.pos = frac_ave(final_bike.pos, exact->prev->bike.pos);
            else
                final_bike.pos = frac_ave(final_bike.pos, cur->prev->tail->bike.pos);
        }
    } else if (exact != NULL) {
        int l = find_nearest_smaller_int(p - 1, exact, cur, SQRTC);
        int r = find_nearest_bigger_int(p + 1, exact, cur, SQRTC);
        if (l == -1) l = slot->head->head->bike.pos.p - 1;
        if (r == -1) r = slot->tail->tail->bike.pos.p + 1;
        int pos = (p - l <= r - p) ? l : r;
        if (l <= 0) pos = r;
        if (r >= slot->cap + 1) pos = l;
        final_bike.pos = frac_new(pos, 1);
    }
    if (frac_is_int(final_bike.pos)) slot->int_num++;
    cur = slot->head;
    while (cur->next != NULL && frac_cmp(cur->next->head->bike.pos, final_bike.pos) <= 0) cur = cur->next;
    BikeNode *last = list_insert(cur, bikenode_new(final_bike));
    while (last != NULL) {
        if (cur->next == NULL) {
            cur->next = headnode_new(SQRTC);
            cur->next->prev = cur;
            slot->tail = cur->next;
        }
        cur = cur->next;
        last->next = last->prev = NULL;
        last = list_insert(cur, last);
    }
    return final_bike.pos;
}
void slot_erase(Slot *slot, Frac pos) {
    HeadNode *cur = slot->head;
    while (cur->next != NULL && frac_cmp(cur->next->head->bike.pos, pos) <= 0) cur = cur->next;
    BikeNode *x = list_has(cur, pos);
    if (frac_is_int(x->bike.pos)) slot->int_num--;
    cur->len--;
    if (x->prev != NULL) x->prev->next = x->next;
    if (x->next != NULL) x->next->prev = x->prev;
    if (cur->head == x) cur->head = x->next;
    if (cur->tail == x) cur->tail = x->prev;
    free(x);
    if (cur->len == 0) {
        if (cur->prev != NULL) cur->prev->next = cur->next;
        if (cur->next != NULL) cur->next->prev = cur->prev;
        if (slot->head == cur) slot->head = cur->next;
        if (slot->tail == cur) slot->tail = cur->prev;
        free(cur);
    }
    if (slot->head == NULL) {
        slot->head = headnode_new(SQRTC);
        slot->tail = slot->head;
    }
}
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
pii vec_at(const Vec *v, const int index) { return v->arr[index]; }
int par_num, stu_num, q, delay[MN], prev_slot[MN], chain_top[MN], order[MN], parent[MN], tree_sz[MN], link[MN], depth[MN], bit[MN + 1];
Slot *slots[MN];
Frac prev_pos[MN];
Vec *graph[MN];
int bit_ps(int index) {
    int ret = 0;
    for (int i = index; i > 0; i -= (i & -i)) ret += bit[i];
    return ret;
}
int bit_query(int left, int right) { return bit_ps(right) - bit_ps(left - 1); }
void bit_update(int idx, int val) {
    for (int i = idx, v = bit_query(idx, idx); i <= par_num; i += (i & -i)) bit[i] += val - v;
}
void find_parent(int now, int par) {
    parent[now] = par;
    tree_sz[now] = 1;
    link[now] = -1;
    depth[now] = depth[par] + 1;
    int max_tree_sz = 0;
    for (int i = 0; i < graph[now]->size; ++i) {
        pii next = vec_at(graph[now], i);
        if (next.x == par) continue;
        find_parent(next.x, now);
        tree_sz[now] += tree_sz[next.x];
        if (tree_sz[next.x] > max_tree_sz) {
            max_tree_sz = tree_sz[next.x];
            link[now] = next.x;
        }
    }
}
void build_chain(int now, int ct) {
    static int stamp = 1;
    order[now] = stamp++;
    chain_top[now] = ct;
    if (link[now] != -1) build_chain(link[now], ct);
    for (int i = 0; i < graph[now]->size; ++i) {
        pii next = vec_at(graph[now], i);
        if (order[next.x] == 0) build_chain(next.x, next.x);
    }
}
void build_bit(int now, int par) {
    for (int i = 0; i < graph[now]->size; ++i) {
        pii next = vec_at(graph[now], i);
        if (next.x == par) continue;
        bit_update(order[next.x], next.y);
        build_bit(next.x, now);
    }
}
void swap_int(int *x, int *y) {
    int t = *x;
    *x = *y, *y = t;
}
int find_dis(int u, int v) {
    int ret = 0;
    while (chain_top[u] != chain_top[v]) {
        if (depth[chain_top[u]] < depth[chain_top[v]]) swap_int(&u, &v);
        ret += bit_query(order[chain_top[u]], order[u]);
        u = parent[chain_top[u]];
    }
    if (depth[u] > depth[v]) swap_int(&u, &v);
    return ret + bit_query(order[u], order[v]) - bit_query(order[u], order[u]);
}
void park(int s, int x, int p) {
    Slot *slot = slots[x];
    Frac pos = slot_insert(slot, p, s);
    prev_slot[s] = x;
    prev_pos[s] = pos;
    printf("%lld parked at (%lld, ", s, x);
    frac_print(pos);
    printf(").\n");
}
void move(int s, int y, int p) {
    int x = prev_slot[s];
    if (x == y) {
        printf("%lld moved to %lld in 0 seconds.\n", s, y);
        return;
    }
    int t = find_dis(x, y);
    printf("%lld moved to %lld in %lld seconds.\n", s, y, t);
    slot_erase(slots[x], prev_pos[s]);
    Frac pos = slot_insert(slots[y], p, s);
    prev_slot[s] = y;
    prev_pos[s] = pos;
}
void clear(int x, int t) {
    Slot *slot = slots[x];
    HeadNode *cur = slot->head;
    while (cur != NULL) {
        BikeNode *x = cur->head;
        while (x != NULL) {
            pq_push(pq, (Info){x->bike.owner, t + delay[x->bike.owner]});
            BikeNode *tmp = x;
            x = x->next;
            free(tmp);
        }
        HeadNode *tmp = cur;
        cur = cur->next;
        free(tmp);
    }
    slot->head = headnode_new(SQRTC);
    slot->tail = slot->head;
    slot->int_num = 0;
}
void rearrange(int x, int t) {
    Slot *slot = slots[x];
    int cnt = 0;
    HeadNode *cur = slot->head;
    while (cur != NULL) {
        HeadNode *next_block = cur->next;
        BikeNode *x = cur->head;
        while (x != NULL) {
            if (x->bike.pos.q != 1) {
                Bike b = x->bike;
                pq_push(pq, (Info){x->bike.owner, t + delay[x->bike.owner]});
                cnt++;
                x = x->next;
                slot_erase(slot, b.pos);
                continue;
            }
            x = x->next;
        }
        cur = next_block;
    }
    printf("Rearranged %lld bicycles in %lld.\n", cnt, x);
}
void fetch(int t) {
    int cnt = 0;
    while (pq->size != 0 && pq->data[0].t <= t) {
        pq_pop(pq);
        cnt++;
    }
    printf("At %lld, %lld bicycles was fetched.\n", t, cnt);
}
void rebuild(int x, int y, int d) {
    if (depth[x] > depth[y]) swap_int(&x, &y);
    bit_update(order[y], d);
}
signed main() {
    rep(i, 0, MN) slots[i] = slot_new();
    scanf("%lld%lld%lld", &par_num, &stu_num, &q);
    rep(i, 0, par_num) scanf("%lld", &slots[i]->cap);
    rep(i, 0, stu_num) scanf("%lld", &delay[i]);
    rep(i, 0, par_num) graph[i] = vec_new();
    rep(i, 0, par_num - 1) {
        int u, v, w;
        scanf("%lld%lld%lld", &u, &v, &w);
        vec_push_back(graph[u], (pii){v, w});
        vec_push_back(graph[v], (pii){u, w});
    }
    find_parent(0, 0);
    build_chain(0, 0);
    build_bit(0, 0);
    pq = pq_new(stu_num);
    while (q--) {
        int type, x, y, z;
        scanf("%lld", &type);
        if (type == 0) {
            scanf("%lld%lld%lld", &x, &y, &z);
            park(x, y, z);
        } else if (type == 1) {
            scanf("%lld%lld%lld", &x, &y, &z);
            move(x, y, z);
        } else if (type == 2) {
            scanf("%lld%lld", &x, &y);
            clear(x, y);
        } else if (type == 3) {
            scanf("%lld%lld", &x, &y);
            rearrange(x, y);
        } else if (type == 4) {
            scanf("%lld", &x);
            fetch(x);
        } else if (type == 5) {
            scanf("%lld%lld%lld", &x, &y, &z);
            rebuild(x, y, z);
        }
    }
}
