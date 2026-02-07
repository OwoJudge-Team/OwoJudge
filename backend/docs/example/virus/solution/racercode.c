#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>
#include <assert.h>
#define MAXN (500005)
#define int long long

typedef struct item {
    int* addr;
    int v;
    struct item* prev;
} Item;

int virus_level[MAXN], virus_pa[MAXN], virus_sz[MAXN], virus_damage[MAXN], infected_sz[MAXN];
int virus[2 * MAXN], network_pa[2 * MAXN], network_sz[2 * MAXN], real_network_sz[2 * MAXN], network_damage[2 * MAXN], curid;
int cur_network[MAXN];
Item* tails[MAXN];
int stksz;

int assign(int* addr, int v) {
    Item* s = (Item*) malloc(sizeof(Item));
    s->addr = addr;
    s->v = *addr;
    s->prev = tails[stksz];
    tails[stksz] = s;
    *addr = v;
    return v;
}

void init(int n, int q) {
    for(int i = 0; i < q; i++) {
        tails[i] = (Item*) malloc(sizeof(Item));
        tails[i]->prev = NULL;
    }

    curid = n;
    for(int i = 1; i <= n; i++) {
        virus_pa[i] = network_pa[i] = i;
        infected_sz[i] = network_sz[i] = virus_sz[i] = 1;
        virus[i] = i;
        virus_level[i] = 1;
        cur_network[i] = i;
        real_network_sz[i] = 1;
    }
    for(int i = n + 1; i <= n + q; i++) {
        network_pa[i] = i;
        network_sz[i] = 1;
        real_network_sz[i] = 1;
    }
}

int findset(int pa[], int x) {
    if(x == pa[x]) return x;
    else {
        return findset(pa, pa[x]);
    }
}

int virus_accu_damage(int x) {
    if(x == virus_pa[x]) return virus_damage[x];
    else return virus_accu_damage(virus_pa[x]) + virus_damage[x];
}

int network_accu_damage(int x) {
    if(x == network_pa[x]) return network_damage[x];
    else return network_accu_damage(network_pa[x]) + network_damage[x];
}

void virus_merge(int x, int y) {
    x = findset(virus_pa, x), y = findset(virus_pa, y);
    if(x == y) return ;
    if(virus_sz[x] < virus_sz[y]) {
        int tmp = x;
        x = y;
        y = tmp;
    }
    assign(virus_pa + y, x);
    assign(virus_level + x, virus_level[x] + virus_level[y]);
    assign(virus_sz + x, virus_sz[x] + virus_sz[y]);
    assign(virus_damage + y, virus_damage[y] - virus_damage[x]);
    assign(infected_sz + x, infected_sz[x] + infected_sz[y]);
}

void network_merge(int x, int y) {
    x = findset(network_pa, x), y = findset(network_pa, y);
    if(x == y) return ;
    bool swap = false;
    if(network_sz[x] < network_sz[y]) {
        int tmp = x;
        x = y;
        y = tmp;
        swap = true;
    }
    
    assign(network_pa + y, x);
    assign(network_sz + x, network_sz[x] + network_sz[y]);

    int source_virus_x = findset(virus_pa, virus[x]), source_virus_y = findset(virus_pa, virus[y]);
    if(virus_level[source_virus_x] > virus_level[source_virus_y] || (virus_level[source_virus_x] == virus_level[source_virus_y] && !swap)) {
        assign(network_damage + y, (network_damage[y] + virus_accu_damage(virus[y])) - (virus_accu_damage(virus[x]) + network_damage[x]));
        assign(infected_sz + source_virus_x, infected_sz[source_virus_x] + real_network_sz[y]);
        assign(infected_sz + source_virus_y, infected_sz[source_virus_y] - real_network_sz[y]);
        //printf("%d be infected with %d\n", source_virus_x, infected_sz[source_virus_x]);
    }
    else {
        //printf("Network merge: %d %d %d %d\n", x, y, network_damage[x], network_damage[y]);
        assign(network_damage + x, network_damage[x] + virus_accu_damage(virus[x]) - virus_accu_damage(virus[y]));
        assign(network_damage + y, network_damage[y] - network_damage[x]);
        assign(infected_sz + source_virus_y, infected_sz[source_virus_y] + real_network_sz[x]);
        assign(infected_sz + source_virus_x, infected_sz[source_virus_x] - real_network_sz[x]);
        //printf("%d be infected with %d\n", source_virus_y, infected_sz[source_virus_y]);
        assign(virus + x, virus[y]);
        //printf("Network merge: %d %d %d %d\n", x, y, network_damage[x], network_damage[y]);
    }
    assign(real_network_sz + x, real_network_sz[x] + real_network_sz[y]);
}

signed main() {
    int n, q;
    scanf("%lld%lld", &n, &q);
    init(n, q);
    while(q--) {
        int tp;
        scanf("%lld", &tp);
        //printf("Read %d %d\n", tp, stksz);
        if(tp == 1) {
            int x, y;
            scanf("%lld%lld", &x, &y);
            x = cur_network[x], y = cur_network[y];
            network_merge(x, y);
            stksz++;
        }
        else if(tp == 2) {
            int t;
            scanf("%lld", &t);
            t = findset(virus_pa, t);
            //printf("Get virus source: %d\n", t);
            assign(virus_level + t, virus_level[t] + 1);
            stksz++;
        }
        else if(tp == 3) {
            int t;
            scanf("%lld", &t);
            t = findset(virus_pa, t);
            assign(virus_damage + t, virus_damage[t] + virus_level[t]);
            //printf("virus damage: %d from %d to %d\n", t, virus_damage[t] - virus_level[t], virus_damage[t]);
            stksz++;
        }
        else if(tp == 4) {
            int k, s;
            scanf("%lld%lld", &k, &s);
            int real_k = cur_network[k];
            int network_source = findset(network_pa, real_k);
            int virus_source = findset(virus_pa, virus[network_source]);
            //printf("pre infected sz: %d %d\n", virus_source, infected_sz[virus_source]);
            assign(infected_sz + virus_source, infected_sz[virus_source] - 1);
            assign(real_network_sz + network_source, real_network_sz[network_source] - 1);

            int new_virus_source = findset(virus_pa, s);
            assign(&curid, curid + 1);
            assign(cur_network + k, curid);
            assign(virus + cur_network[k], new_virus_source);
            assign(infected_sz + new_virus_source, infected_sz[new_virus_source] + 1);
            assign(network_damage + cur_network[k], -virus_accu_damage(new_virus_source));
            stksz++;
        }
        else if(tp == 5) {
            int a, b;
            scanf("%lld%lld", &a, &b);
            virus_merge(a, b);
            stksz++;
        }
        else if(tp == 6) {
            int k;
            scanf("%lld", &k);
            int real_k = cur_network[k];
            int network_source = findset(network_pa, real_k);
            int virus_source = findset(virus_pa, virus[network_source]);
            //printf("Get virus source: %d %d %d %d %d\n", virus_source, virus_accu_damage(virus[network_source]), network_accu_damage(real_k), real_k, network_damage[3]);
            printf("%lld %lld %lld\n", virus_accu_damage(virus[network_source]) + network_accu_damage(real_k), virus_level[virus_source], infected_sz[virus_source]);
        }
        else {
            if(stksz) {
                stksz--;
                while(tails[stksz]->prev) {
                    int* addr = tails[stksz]->addr;
                    *addr = tails[stksz]->v;
                    Item* tmp = tails[stksz];
                    tails[stksz] = tails[stksz]->prev;
                    free(tmp);
                }
            }
        }
    }
}