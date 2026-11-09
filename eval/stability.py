#!/usr/bin/env python3
"""
Read every golden claim a second and a third time and report any disagreement.

    python eval/stability.py            # runs 2 and 3 of every golden claim not yet read
    python eval/stability.py --report   # print the disagreements from eval/results.json

The ladder is only worth anything if the same claim gets the same tier run after
run. This files each golden claim twice more on the same card, sizes each copy
through real consensus, and lists every claim whose three readings were not
identical. It uses the same record and the same rules as eval/run_golden.py:
the locked golden.json, nothing tuned, a claim that produced a label is never
sized again. Held-out claims are read once and are not repeated here.
"""

from __future__ import annotations

import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

import run_golden as G  # noqa: E402


def disagreements() -> list[tuple[str, list[str]]]:
    results = G.load_results()
    golden = json.loads(G.GOLDEN.read_text(encoding="utf-8"))
    out = []
    for case in golden["cases"]:
        if case.get("held_out"):
            continue
        labels = [r["label"] for r in sorted(results["runs"], key=lambda r: r["run"]) if r["case"] == case["id"] and r.get("label")]
        if len(labels) >= 2 and len(set(labels)) > 1:
            out.append((case["id"], labels))
    return out


def main() -> int:
    if "--report" not in sys.argv:
        G.run([], [2, 3])
    found = disagreements()
    if found:
        print("\nreadings that disagreed:")
        for case_id, labels in found:
            print(f"  case {case_id}: {', '.join(labels)}")
    else:
        print("\nno golden claim changed its label between readings")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
