#include <stdio.h>
#include <stdlib.h>

#include "a9.h"

int main() {
    int t;
    scanf("%d", &t);
    printf("OK\n");

    // Global array detection
    // Allocate 24 MB of memory to make sure no global arrays are used
    const size_t bytes = 24 * 1000 * 1000;
    void* mem = malloc(bytes);
    long long checksum = 0;
    if (mem != NULL) {
        volatile unsigned char* p = (volatile unsigned char*)mem;
        for (size_t i = 0; i < bytes; i++) {
            p[i] = (unsigned char)((t * i) & 0xFF);
        }
        checksum = 0;
        for (size_t i = 0; i < bytes; i++) {
            checksum += p[i];
        }
    } else {
        exit(1);  // Allocation failed
    }
    free(mem);

    for (int i = 0; i < t; i++) {
        int n;
        scanf("%d", &n);
        reverse_array(n);
    }

    if (checksum == 0) {
        // Prevent compiler optimization
        printf("Checksum: %lld\n", checksum);
    } else {
        printf("Checksum: %lld\n", checksum);
    }
}