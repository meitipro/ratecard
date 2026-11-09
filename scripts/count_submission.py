#!/usr/bin/env python3
"""Count the portal fields exactly, against their limits."""
import pathlib
import re
import sys

text = (pathlib.Path(__file__).resolve().parent.parent / "submission" / "portal.md").read_text(encoding="utf-8")


def section(name: str) -> str:
    match = re.search(rf"^## {re.escape(name)}\n\n(.*?)(?=\n## |\Z)", text, re.S | re.M)
    return match.group(1).strip() if match else ""


limits = {"Description": 1000, "Steward note": 500}
bad = 0
for name, limit in limits.items():
    n = len(section(name))
    print(f"{name}: {n} of {limit}")
    bad += n > limit
sys.exit(1 if bad else 0)
