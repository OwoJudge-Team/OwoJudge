#include <stdio.h>
#include <stdlib.h>

#include "a9.h"

void reverse_array(const int n) {
    long long* my_data = (long long*)malloc(n * sizeof(long long));

    for (int i = 0; i < n; i++) {
        scanf("%lld", &my_data[i]);
    }

    for (int i = n - 1; i >= 0; i--) {
        printf("%lld%c", my_data[i], (i == 0)?'\n':' ');
    }
    

    free(my_data);
}
