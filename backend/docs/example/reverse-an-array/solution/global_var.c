#include <stdio.h>

long long global_array[2 * 1000000];  // 16 MB global array

void reverse_array(const int n) {
    for (int i = 0; i < n; i++) {
        scanf("%lld", &global_array[i]);
    }

    for (int i = n - 1; i >= 0; i--) {
        printf("%lld ", global_array[i]);
    }
    printf("\n");
}