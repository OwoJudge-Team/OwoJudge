#include <math.h>
#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <stddef.h>
#include <stdbool.h>
#include <inttypes.h>
#include <assert.h>

enum Operation {
  PARK = 0,
  MOVE = 1,
  CLEAR = 2,
  REARRANGE = 3,
  FETCH = 4,
  REBUILD = 5
};

long long gcd(long long a, long long b);
long long lcm(long long a, long long b);

struct rational {
  long long p, q;
};

struct rational rational_new(long long p, long long q);
struct rational rational_from(long long p);
void rational_simplify(struct rational *num);
struct rational rational_add(struct rational a, struct rational b);
struct rational rational_sub(struct rational a, struct rational b);
struct rational rational_mul(struct rational a, struct rational b);
struct rational rational_div(struct rational a, struct rational b);
int rational_cmp(struct rational *a, struct rational *b);
struct rational rational_abs(struct rational a);

struct cds_array {
  char *data;
  size_t size, capacity, element_size;
};

struct cds_array cds_array_new(size_t element_size);
void cds_array_delete(struct cds_array *array);
int cds_array_push_back(struct cds_array *array, const void *new_element);
int cds_array_pop_back(struct cds_array *array);
void* cds_array_at(const struct cds_array *array, size_t index);
void *cds_array_get(const struct cds_array *array, size_t index);
size_t cds_array_size(const struct cds_array *array);
bool cds_array_empty(const struct cds_array *array);
int cds_array_insert(struct cds_array *array, const size_t at_index, const void *new_element);
int cds_array_erase(struct cds_array *array, const size_t at_index);

struct bicycle {
  struct rational location;
  int owner;
};

int bicycle_cmp(const void *a, const void *b);

struct parking_slot {
  struct cds_array bicycles;
  size_t capacity;
};

struct parking_slot parking_slot_new(size_t capacity);
void parking_slot_delete(struct parking_slot *slot);
struct rational parking_slot_insert(struct parking_slot *slot, int owner, size_t target_location);
int parking_slot_erase(struct parking_slot *slot, int target_id);

struct edge {
  size_t to;
  long long dis;
};

struct shuiyuan_info {
  int owner;
  long long t;
};

int shuiyuan_info_cmp(void *a, void *b);

#define LCA_LAYER 19
struct bicycle_parking_tree {
  size_t n, m;
  struct parking_slot *parking_slots;
  struct cds_array *edges;
  long long *fetch_delay;
  long long *dis_from_root;
  int *depth;
  size_t *previous_slot;
  size_t *ancestor[LCA_LAYER];
};

struct bicycle_parking_tree bicycle_parking_tree_new(size_t n, size_t m);
void bicycle_parking_tree_delete(struct bicycle_parking_tree *parking_tree);
void bicycle_parking_tree_find_parent(struct bicycle_parking_tree *parking_tree, int now, int parent, long long dis);
void bicycle_parking_tree_build_ancestor(struct bicycle_parking_tree *parking_tree);
size_t bicycle_parking_tree_find_lca(struct bicycle_parking_tree *parking_tree, size_t u, size_t v);
long long bicycle_parking_tree_find_dis(struct bicycle_parking_tree *parking_tree, size_t from, size_t to);

void park(struct bicycle_parking_tree *parking_tree, int s, size_t x, size_t p);
void move(struct bicycle_parking_tree *parking_tree, int s, size_t x, size_t y, size_t p);
void handle_commands(struct bicycle_parking_tree *parking_tree, size_t q);

/*
************************************
* ███╗   ███╗ █████╗ ██╗███╗   ██╗ *
* ████╗ ████║██╔══██╗██║████╗  ██║ *
* ██╔████╔██║███████║██║██╔██╗ ██║ *
* ██║╚██╔╝██║██╔══██║██║██║╚██╗██║ *
* ██║ ╚═╝ ██║██║  ██║██║██║ ╚████║ *
* ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝ *
************************************
*/
int main(void) {
  // Read first line: scale
  size_t n, m, q;
  assert(scanf("%zu%zu%zu", &n, &m, &q) == 3);
  struct bicycle_parking_tree parking_tree = bicycle_parking_tree_new(n, m);
  // Read second line: capacity for each slot
  for (int i = 0; i < n; ++i) {
    size_t capacity;
    assert(scanf("%zu", &capacity) == 1);
    parking_tree.parking_slots[i] = parking_slot_new(capacity);
  }
  // Read third line: fetch delay for each student
  for (int i = 0; i < m; ++i) {
    assert(scanf("%lld", &parking_tree.fetch_delay[i]) == 1);
  }
  // Read tree
  for (int i = 0; i < (int) n - 1; ++i) {
    size_t x, y;
    long long w;
    assert(scanf("%zu%zu%lld", &x, &y, &w) == 3);
    struct edge toy = { .to = y, .dis = w };
    cds_array_push_back(&parking_tree.edges[x], (void*) &toy);
    struct edge tox = { .to = x, .dis = w };
    cds_array_push_back(&parking_tree.edges[y], (void*) &tox);
  }
  bicycle_parking_tree_find_parent(&parking_tree, 0, 0, 0);
  bicycle_parking_tree_build_ancestor(&parking_tree);

  handle_commands(&parking_tree, q);
  bicycle_parking_tree_delete(&parking_tree);
}


long long gcd(long long a, long long b) {
  long long tp = a % b;
  while(tp != 0) {
    a = b;
    b = tp;
    tp = a % b;
  }
  return b;
}

long long lcm(long long a, long long b) {
  return a / gcd(a, b) * b;
}


struct rational rational_new(long long p, long long q) {
  struct rational new_rational = {p, q};
  return new_rational;
}

struct rational rational_from(long long p) {
  struct rational new_rational = {p, 1};
  return new_rational;
}

void rational_simplify(struct rational *num) {
  if(num->q == 0) num->q = 1;
  long long GCD = gcd(num->p, num->q);
  num->p /= GCD;
  num->q /= GCD;
  if(num->q < 0) {
    num->p = -num->p;
    num->q = -num->q;
  }
}

struct rational rational_add(struct rational a, struct rational b) {
  struct rational ret = {a.p, a.q};
  long long LCM = lcm(ret.q, b.q);
  ret.p *= LCM / ret.q;
  ret.q = LCM;
  b.p *= LCM / b.q;
  ret.p += b.p;
  rational_simplify(&ret);
  return ret;
}

struct rational rational_sub(struct rational a, struct rational b) {
  struct rational ret = {a.p, a.q};
  long long LCM = lcm(ret.q, b.q);
  ret.p *= LCM / ret.q;
  ret.q = LCM;
  b.p *= LCM / b.q;
  ret.p -= b.p;
  rational_simplify(&ret);
  return ret;
}

struct rational rational_mul(struct rational a, struct rational b) {
  struct rational ret = {a.p * b.p, a.q * b.q};
  rational_simplify(&ret);
  return ret;
}

struct rational rational_div(struct rational a, struct rational b) {
  struct rational ret = {a.p * b.q, a.q * b.p};
  rational_simplify(&ret);
  return ret;
}

int rational_cmp(struct rational *a, struct rational *b) {
  if (a->p == b->p && a->q == b->q) {
    return 0;
  }
  if (a->p * b->q < a->q * b->p) {
    return -1;
  }
  return 1;
}

struct rational rational_abs(struct rational a) {
  struct rational ret = { .p = abs(a.p), .q = abs(a.q) };
  return ret;
}


struct cds_array cds_array_new(const size_t element_size) {
  struct cds_array new_array = {
    .data = (char*) malloc(element_size),
    .size = 0,
    .capacity = 1,
    .element_size = element_size};
  return new_array;
}
  
void cds_array_delete(struct cds_array *array) {
  if (array->data != NULL) free(array->data);
  array->data = NULL;
  array->size = array->capacity = 0;
  array->element_size = 0;
}

int cds_array_push_back(struct cds_array *array, const void *new_element) {
  if (array->size == array->capacity) {
    array->capacity <<= 1;  // cap * 2
    array->data = (char*) realloc(array->data, array->capacity * array->element_size);
    if (array->data == NULL) {
      return -1;
    }
  }
  memmove(array->data + array->size * array->element_size, new_element, array->element_size);
  array->size++;
  return 0;
}

int cds_array_pop_back(struct cds_array *array) {
  if (array->size == 0) {
    return -1;
  }
  array->size--;
  return 0;
}

void* cds_array_at(const struct cds_array *array, const size_t index) {
  if (index < 0 || index >= array->size) {
    return NULL;
  }
  return (void*) (array->data + index * array->element_size);
}

void* cds_array_get(const struct cds_array *array, const size_t index) {
  return (void*) (array->data + index * array->element_size);
}

size_t cds_array_size(const struct cds_array *array) {
  return array->size;
}

bool cds_array_empty(const struct cds_array *array) {
  return array->size == 0;
}

int cds_array_insert(struct cds_array *array, const size_t at_index, const void *new_element) {
  if (array->size == array->capacity) {
    array->capacity <<= 1;  // cap * 2
    array->data = (char*) realloc(array->data, array->capacity * array->element_size);
    if (array->data == NULL) {
      return -1;
    }
  }
  memmove(array->data + array->element_size * (at_index + 1),
    array->data + array->element_size * at_index,
    array->element_size * (array->size - at_index));
  memmove(array->data + array->element_size * at_index, new_element, array->element_size);
  array->size++;
  return 0;
}

int cds_array_erase(struct cds_array *array, const size_t at_index) {
  if (array->size == 0) {
    return -1;
  }
  memmove(array->data + array->element_size * at_index,
    array->data + array->element_size * (at_index + 1),
    array->element_size * (array->size - at_index - 1));
  array->size--;
  return 0;
}


int bicycle_cmp(const void *a, const void *b) {
  struct bicycle *ba = (struct bicycle*) a;
  struct bicycle *bb = (struct bicycle*) b;
  int location_cmp_ret = rational_cmp(&ba->location, &bb->location);
  if (location_cmp_ret != 0) {
    return location_cmp_ret;
  }
  if (ba->owner == bb->owner) {
    fprintf(stderr, "there should not be two bicycles that owned by a person\n");
    exit(-1);
  }
  return ba->owner < bb->owner ? -1 : 1;
}


struct parking_slot parking_slot_new(size_t capacity) {
  struct parking_slot new_parking_slot = {
    .bicycles = cds_array_new(sizeof(struct bicycle)),
    .capacity = capacity};
  return new_parking_slot;
}

void parking_slot_delete(struct parking_slot *slot) {
  cds_array_delete(&slot->bicycles);
  slot->capacity = 0;
}

struct rational parking_slot_insert(struct parking_slot *slot, int owner, size_t target_location) {
  struct rational r_target = { .p = (long long) target_location, .q = 1 };
  int occupied[32] = {0};
  int min_index = -1, target_index = -1, smallest_right_index = -1;
  struct rational min_dis = { .p = 64, .q = 1 };
  for (int i = 0; i < cds_array_size(&slot->bicycles); ++i) {
    struct bicycle *b = (struct bicycle*) cds_array_at(&slot->bicycles, i);
    if (b->location.q == 1) {
      if (b->location.p > slot->capacity) {
        exit(-1);
      }
      occupied[b->location.p] = 1;
      struct rational dis = rational_abs(rational_sub(b->location, r_target));
      if (rational_cmp(&b->location, &r_target) != 0 && rational_cmp(&dis, &min_dis) < 0) {
        min_index = i;
        min_dis = dis;
      }
      if (rational_cmp(&b->location, &r_target) == 0) {
        target_index = i;
      }
    }
    if (rational_cmp(&b->location, &r_target) > 0 && smallest_right_index == -1) {
      smallest_right_index = i;
    }
  }
  if (!occupied[target_location]) {
    struct bicycle new_bicycle = {
      .location = {(long long) target_location, 1},
      .owner = owner,};
    if (smallest_right_index == -1) {
      cds_array_push_back(&slot->bicycles, (void*) &new_bicycle);
    } else {
      cds_array_insert(&slot->bicycles, smallest_right_index, (void*) &new_bicycle);
    }
    return new_bicycle.location;
  }
  bool find_vacancy = false;
  int nearest_vacant_location = -1;
  struct rational nearest_distance = { .p = 64, .q = 1 };
  for (int i = 1; i <= slot->capacity; ++i) {
    if (!occupied[i]) {
      struct rational current_location = { .p = i, .q = 1 };
      struct rational current_distance = rational_abs(rational_sub(current_location, r_target));
      if (rational_cmp(&current_distance, &nearest_distance) < 0) {
        nearest_vacant_location = i;
        nearest_distance = current_distance;
        find_vacancy = true;
      }
    }
  }
  if (find_vacancy) {
    smallest_right_index = -1;
    struct rational r_nearest_location = { .p = nearest_vacant_location, .q = 1};
    for (int i = 0; i < cds_array_size(&slot->bicycles); ++i) {
      struct bicycle *b = (struct bicycle*) cds_array_at(&slot->bicycles, i);
      if (rational_cmp(&b->location, &r_nearest_location) > 0 && smallest_right_index == -1) {
        smallest_right_index = i;
      }
    }
    struct bicycle new_bicycle = {
      .location = {nearest_vacant_location, 1},
      .owner = owner,};
    if (smallest_right_index == -1) {
      cds_array_push_back(&slot->bicycles, (void*) &new_bicycle);
    } else {
      cds_array_insert(&slot->bicycles, smallest_right_index, (void*) &new_bicycle);
    }
    return new_bicycle.location;
  } else {
    struct rational location_sum;
    if (target_index != 0) {
      location_sum = rational_add(*(struct rational*) cds_array_at(&slot->bicycles, target_index - 1),
      *(struct rational*) cds_array_at(&slot->bicycles, target_index));
    } else {
      location_sum = rational_add(*(struct rational*) cds_array_at(&slot->bicycles, target_index + 1),
        *(struct rational*) cds_array_at(&slot->bicycles, target_index));
    }
    struct rational mid_location = rational_div(location_sum, rational_from(2));
    struct bicycle new_bicycle = {
      .location = mid_location,
      .owner = owner};
    struct rational cp = rational_from(slot->capacity);
    if (target_index != 0) {
      cds_array_insert(&slot->bicycles, target_index, (void*) &new_bicycle);
    } else {
      cds_array_insert(&slot->bicycles, 1, (void*) &new_bicycle);
    }
    return new_bicycle.location;
  }
}

int parking_slot_erase(struct parking_slot *slot, int target_id) {
  size_t target_index = -1;
  for (size_t i = 0; i < cds_array_size(&slot->bicycles); ++i) {
    struct bicycle *b = (struct bicycle*) cds_array_at(&slot->bicycles, i);
    if (b->owner == target_id) {
      target_index = i;
      break;
    }
  }
  if (target_index != (size_t) -1) {
    return cds_array_erase(&slot->bicycles, target_index);
  }
  return -1;
}


struct bicycle_parking_tree bicycle_parking_tree_new(size_t n, size_t m) {
  struct bicycle_parking_tree new_parking_tree = {
    .n = n,
    .m = m,
    .parking_slots = (struct parking_slot*) malloc(sizeof(struct parking_slot) * n),
    .edges = (struct cds_array*) malloc(sizeof(struct cds_array) * n),
    .fetch_delay = (long long*) malloc(sizeof(long long) * m),
    .dis_from_root = (long long*) malloc(sizeof(long long) * n),
    .depth = (int*) malloc(sizeof(int) * n),
    .previous_slot = (size_t*) calloc(m, sizeof(size_t))};
  for (int i = 0; i < n; ++i) {
    new_parking_tree.edges[i] = cds_array_new(sizeof(struct edge));
  }
  for (int i = 0; i < LCA_LAYER; ++i) {
    new_parking_tree.ancestor[i] = (size_t*) malloc(sizeof(size_t) * n);
  }
  return new_parking_tree;
}

void bicycle_parking_tree_delete(struct bicycle_parking_tree *parking_tree) {
  for (int i = 0; i < parking_tree->n; ++i) {
    parking_slot_delete(&parking_tree->parking_slots[i]);
  }
  free(parking_tree->parking_slots);
  for (int i = 0; i < parking_tree->n; ++i) {
    cds_array_delete(&parking_tree->edges[i]);
  }
  free(parking_tree->edges);
  free(parking_tree->fetch_delay);
  free(parking_tree->dis_from_root);
  free(parking_tree->depth);
  free(parking_tree->previous_slot);
  for (int i = 0; i < LCA_LAYER; ++i) {
    free(parking_tree->ancestor[i]);
  }
}

void bicycle_parking_tree_find_parent(struct bicycle_parking_tree *parking_tree, int now, int parent, long long dis) {
  parking_tree->ancestor[0][now] = parent;
  parking_tree->dis_from_root[now] = dis;
  parking_tree->depth[now] = parking_tree->depth[parent] + 1;
  for (size_t i = 0; i < cds_array_size(&parking_tree->edges[now]); ++i) {
    struct edge *next = (struct edge*) cds_array_at(&parking_tree->edges[now], i);
    if (next->to == parent) continue;
    bicycle_parking_tree_find_parent(parking_tree, next->to, now, dis + next->dis);
  }
}

void bicycle_parking_tree_build_ancestor(struct bicycle_parking_tree *parking_tree) {
  for (int i = 1; i < LCA_LAYER; ++i) {
    for (int j = 0; j < parking_tree->n; ++j) {
      parking_tree->ancestor[i][j] = parking_tree->ancestor[i - 1][parking_tree->ancestor[i - 1][j]];
    }
  }
}

size_t bicycle_parking_tree_find_lca(struct bicycle_parking_tree *parking_tree, size_t u, size_t v) {
  if (parking_tree->depth[u] < parking_tree->depth[v]) {
    size_t tp = u;
    u = v;
    v = tp;
  }
  for (int i = LCA_LAYER - 1; i >= 0; --i) {
    if (parking_tree->depth[parking_tree->ancestor[i][u]] >= parking_tree->depth[v]) {
      u = parking_tree->ancestor[i][u];
    }
  }
  assert(parking_tree->depth[u] == parking_tree->depth[v]);
  if (u == v) {
    return u;
  }
  for (int i = LCA_LAYER - 1; i >= 0; --i) {
    if (parking_tree->ancestor[i][u] != parking_tree->ancestor[i][v]) {
      u = parking_tree->ancestor[i][u];
      v = parking_tree->ancestor[i][v];
    }
  }
  assert(parking_tree->ancestor[0][u] == parking_tree->ancestor[0][v]);
  return parking_tree->ancestor[0][u];
}

long long bicycle_parking_tree_find_dis(struct bicycle_parking_tree *parking_tree, size_t from, size_t to) {
  size_t lca = bicycle_parking_tree_find_lca(parking_tree, from, to);
  fprintf(stderr, "lca: %zu ", lca);
  return parking_tree->dis_from_root[from] + parking_tree->dis_from_root[to]
    - 2 * parking_tree->dis_from_root[lca];
}


void park(struct bicycle_parking_tree *parking_tree, int s, size_t x, size_t p) {
  struct rational final_position = parking_slot_insert(&parking_tree->parking_slots[x], s, p);
  parking_tree->previous_slot[s] = x;
  printf("%d parked at (%zu, ", s, x);
  if (final_position.q == 1) {
    printf("%lld", final_position.p);
  } else {
    printf("%lld" "/%lld" , final_position.p, final_position.q);
  }
  printf(").\n");
}

void move(struct bicycle_parking_tree *parking_tree, int s, size_t y, size_t p) {
  const size_t x = parking_tree->previous_slot[s];
  if (x == y) {
    printf("%d moved to %zu in 0 seconds.\n", s, y);
    return;
  }
  parking_slot_erase(&parking_tree->parking_slots[x], s);
  const long long t = bicycle_parking_tree_find_dis(parking_tree, x, y);
  printf("%d moved to %zu in %lld" " seconds.\n", s, y, t);
  parking_slot_insert(&parking_tree->parking_slots[y], s, p);
  parking_tree->previous_slot[s] = y;
}

void handle_commands(struct bicycle_parking_tree *parking_tree, size_t q) {
  for (int i = 0; i < q; ++i) {
    Operation op;
    assert(scanf("%u", &op) == 1);
    switch (op) {
      case PARK: {
        int s;
        size_t x, p;
        assert(scanf("%d%zu%zu", &s, &x, &p) == 3);
        park(parking_tree, s, x, p);
        break;
      }
      case MOVE: {
        int s;
        size_t y, p;
        assert(scanf("%d%zu%zu", &s, &y, &p) == 3);
        move(parking_tree, s, y, p);
        break;
      }
      default: {
        fprintf(stderr, "invalid operation type");
        exit(-1);
      }
    }
  }
}