from dataclasses import dataclass
import sys
import random
import os


def start_subtask(name: str):
    print(f"@subtask {name}")


def include_subtask(name: str):
    print(f"@include {name}")
    
def manual(name: str):
    print(f'manual {name}')


@dataclass(kw_only=True)
class GenOpt:
    a1: int = None
    b1: int = None
    x: int = None
    a2: int = None
    b2: int = None
    y: int = None

    def __str__(self) -> str:
        format_string = "gen"
        for attr, value in vars(self).items():
            if value is not None:
                format_string += f" -{attr}={value}"
        return format_string


def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    random.seed(0)
    
    def delta(a1, b1, a2, b2) -> bool:
        return a1 * b2 - a2 * b1 != 0

    with open("data", "w") as sys.stdout:
        start_subtask("samples")
        manual("sample-01.in")

        start_subtask("full")
        include_subtask("samples")

        bound = 10
        for _ in range(5):
            a1, b1, a2, b2, x, y = (
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
            )
            if not delta(a1, b1, a2, b2):
                continue
            print(GenOpt(a1=a1, b1=b1, x=x, a2=a2, b2=b2, y=y))
        bound = 25
        for _ in range(5):
            a1, b1, a2, b2, x, y = (
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
            )
            if not delta(a1, b1, a2, b2):
                continue
            print(GenOpt(a1=a1, b1=b1, x=x, a2=a2, b2=b2, y=y))
        print()

        bound = 1000
        for _ in range(10):
            a1, b1, a2, b2, x, y = (
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
                random.randint(-bound, bound),
            )
            if not delta(a1, b1, a2, b2):
                continue
            print(GenOpt(a1=a1, b1=b1, x=x, a2=a2, b2=b2, y=y))
        print()

        # bound = 1000000000
        # int_max = 2147483647
        # for _ in range(20):
        #     a1, a2 = (
        #         random.randint(-bound, bound),
        #         random.randint(-bound, bound),
        #     )
        #     max_val_a = max(abs(a1), abs(a2))

        #     new_bound = int_max // 2 // max_val_a if max_val_a != 0 else bound
        #     b1 = random.randint(-new_bound, new_bound)
        #     new_bound = int_max // 2 // max_val_a if max_val_a != 0 else bound
        #     b2 = random.randint(-new_bound, new_bound)
            
        #     if not delta(a1, b1, a2, b2):
        #         continue

        #     max_val_b = max(abs(b1), abs(b2))
        #     max_val = max(max_val_a, max_val_b)

        #     new_bound = int_max // 2 // max_val_a // max_val if max_val_a != 0 else bound
        #     x = random.randint(-new_bound, new_bound)

        #     new_bound = int_max //2 // max_val_b // max_val if max_val_b != 0 else bound
        #     y = random.randint(-new_bound, new_bound)

        #     print(GenOpt(a1=a1, b1=b1, x=x, a2=a2, b2=b2, y=y))


if __name__ == "__main__":
    main()
