#include <cstdio>

void reverse_array(const int n) {
    long long* a = new long long[n];
    for (int i = 0; i < n; ++i) {
        scanf("%lld", a + i);
    }
    for (int i = n - 1; i >= 0; --i) {
        printf("%lld ", a[i]);
    }
    printf("\n");
    delete[] a;
}
