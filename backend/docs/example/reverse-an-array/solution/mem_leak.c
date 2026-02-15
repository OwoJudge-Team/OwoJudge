#include <stdio.h>
#include <stdlib.h>

#include "a9.h"

void reverse_array(const int n) {
    long long* arr = (long long*)malloc(n * sizeof(long long));

    for (int i = 0; i < n; i++) {
        scanf("%lld", &arr[i]);
    }

    for (int i = n - 1; i >= 0; i--) {
        printf("%lld ", arr[i]);
    }
    printf("\n");
}
