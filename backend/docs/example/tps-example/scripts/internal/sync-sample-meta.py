#!/usr/bin/env python3
"""sync-sample-meta.py

Scan the `gen/manual` directory under a problem root and produce a
`samples.json` file listing pairs of sample input/output files.

This script supports a `--problem-root` (`-p`) argument to override the
inferred problem root (the script's parent directory by default).
"""

import argparse
import json
import sys
from pathlib import Path


def find_samples(problem_root_dir: Path) -> list:
    """Return list of [in, out] relative path pairs for complete samples.

    Paths are returned as POSIX-style strings relative to `problem_root_dir`.
    """
    manual_dir = problem_root_dir / "gen" / "manual"
    if not manual_dir.exists() or not manual_dir.is_dir():
        print(f"Error: manual directory '{manual_dir}' does not exist.", file=sys.stderr)
        sys.exit(1)

    pairs = []
    for in_path in sorted(manual_dir.glob("sample-*.in")):
        out_path = in_path.with_suffix(".out")
        if out_path.exists():
            rel_in = in_path.relative_to(problem_root_dir).as_posix()
            rel_out = out_path.relative_to(problem_root_dir).as_posix()
            pairs.append([rel_in, rel_out])
        else:
            print(
                f"Skipping '{in_path.name}': corresponding .out not found.", file=sys.stderr
            )

    return pairs


def main(argv=None):
    parser = argparse.ArgumentParser(
        description="Write samples.json from gen/manual sample pairs for a problem"
    )
    parser.add_argument(
        "-p",
        "--problem-root",
        type=Path,
        default=Path(__file__).resolve().parent.parent,
        help=(
            "Path to the problem root directory. Defaults to the script's parent "
            "directory (i.e. the problem directory)."
        ),
    )
    args = parser.parse_args(argv)

    problem_root_dir = args.problem_root.resolve()
    out_file = problem_root_dir / "samples.json"

    pairs = find_samples(problem_root_dir)

    if not pairs:
        print("No complete samples found. Nothing written.", file=sys.stderr)
        sys.exit(2)

    data = {"samples": pairs}
    out_file.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n")
    print(f"Wrote {len(pairs)} sample(s) to '{out_file}'")


if __name__ == "__main__":
    main()
