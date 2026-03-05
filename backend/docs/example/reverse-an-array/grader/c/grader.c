#include <stdio.h>
#include <stdlib.h>

#include "a9.h"

static inline int useless_calculation(int t) {
    // Global array detection
    // Allocate 32 MB of memory to make sure no global arrays are used
    const size_t bytes = 32 * 1000 * 1000;
    void* mem = malloc(bytes);
    srand(t);
    static int rand_idxs[16384] = {0};
    while (rand_idxs[0] <= 0) {
        rand_idxs[0] = rand() % (bytes / (sizeof(int) / sizeof(char)));
        for (int i = 1; i < 16384; ++i) {
            rand_idxs[i] = rand() % (bytes / (sizeof(int) / sizeof(char)));
            if (rand_idxs[i] < 0) {
                rand_idxs[i] = 0;
            }
        }
    }

    long long checksum = 0;
    if (mem != NULL) {
        volatile unsigned char* p = (volatile unsigned char*)mem;
        for (size_t i = 0; i < bytes; i++) {
            p[i] = (unsigned char)((t * i) & 0xFF);
        }
        for (size_t i = 0; i < bytes; i++) {
            int rand_idx = rand_idxs[i % 16384];
            char t = p[i];
            p[i] = p[rand_idx];
            p[rand_idx] = t;
        }
        checksum = 0;
        for (size_t i = 0; i < bytes; i++) {
            checksum += p[i] & i;
        }
    } else {
        exit(1);  // Allocation failed
    }
    free(mem);
    return checksum;
}

int main() {
    char input_buffer[1 << 12] = {0};
    char output_buffer[1 << 12] = {0};
    setvbuf(stdin, input_buffer, _IOFBF, sizeof(input_buffer));
    setvbuf(stdout, output_buffer, _IOFBF, sizeof(output_buffer));

    int t;
    scanf("%d", &t);
    printf("OK\n");

    int first = useless_calculation(t);

    for (int i = 0; i < t; i++) {
        int n;
        scanf("%d", &n);
        reverse_array(n);
    }

    int second = useless_calculation(t);

    if (first != second) {
        fprintf(stderr, "%d, %d\n", first, second);
        exit(-1);
    }

    fclose(stdin);
    fclose(stdout);
}