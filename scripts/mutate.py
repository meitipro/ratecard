#!/usr/bin/env python3
"""
Break every defence in the contract, one at a time, and name the test that notices.

    python scripts/mutate.py                          # run, print the table
    python scripts/mutate.py --table docs/MUTATIONS.md

A passing count is a claim; a table of mutations, each named with the test that
killed it, is evidence. Each mutant is a copy of contracts/ratecard.py with one
defence removed or weakened. The direct and static tests run against it through
RATECARD_CONTRACT, and the first failing test is recorded as the kill.

A kill is read from pytest's own report of which test failed, never from an
exit code alone: a runner that scores exit codes reports a perfect run while
testing nothing. The generated-files test is left out, because it fails for
ANY edit and would kill every mutant without testing its defence.

If anything escapes, the table is not written and the escapes are printed. An
escape means a missing test, or a defence strict enough elsewhere that this one
can no longer fail, and either is a finding.
"""

from __future__ import annotations

import os
import pathlib
import re
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = pathlib.Path(__file__).resolve().parent.parent
CONTRACT = ROOT / "contracts" / "ratecard.py"

#: (what the mutant does, text in the contract, what replaces it). Each text
#: must occur exactly once, so a mutant always changes exactly one place.
MUTANTS = [
    # who may write
    ("veto: any account may veto", 'raise gl.vm.UserError(E + "only the owner may veto a claim")', "pass"),
    ("appeal: any account may appeal", 'raise gl.vm.UserError(E + "only the claimant may appeal")', "pass"),
    ("open_card: the card is owned by a fixed address", "owner=gl.message.sender_address,", "owner=ZERO,"),
    ("claim: the claim is not bound to the claimant", "claimant=gl.message.sender_address,", "claimant=ZERO,"),
    ("withdraw: pays a fixed address", "_Payee(me).emit_transfer(value=u256(amount))", "_Payee(ZERO).emit_transfer(value=u256(amount))"),
    (
        "size: the caller is not recorded",
        "self._settle(c, k, label, now, gl.message.sender_address)",
        "self._settle(c, k, label, now, ZERO)",
    ),
    ("fund_card: the funder is not recorded", "k.last_funder = gl.message.sender_address", "pass"),
    ("veto: the vetoer is not recorded", "c.vetoed_by = gl.message.sender_address", "pass"),
    # money
    ("appeal: any fee is accepted", "if value != fee:", "if value < 0:"),
    ("withdraw: the balance is not zeroed", "        self.balances[me] = u256(0)\n", ""),
    (
        "withdraw: an empty balance still sends",
        '        if amount <= 0:\n            raise gl.vm.UserError(E + "nothing to withdraw")',
        '        if amount < 0:\n            raise gl.vm.UserError(E + "nothing to withdraw")',
    ),
    ("open_card: the first funding is not put in the pool", "pool=u256(value),", "pool=u256(0),"),
    ("fund_card: the value is not added to the pool", "        k.pool = u256(int(k.pool) + value)\n        k.funded", "        k.funded"),
    ("fund_card: zero is accepted", "        if value <= 0:", "        if value < 0:"),
    ("appeal: the fee is not held in escrow", "k.escrow = u256(int(k.escrow) + fee)", "pass"),
    ("size: the price is not credited", "self._credit(c.claimant, price)", "pass"),
    ("size: the pool is not reduced by the price", "k.pool = u256(int(k.pool) - price)", "pass"),
    ("size: the paid total is not counted", "k.paid = u256(int(k.paid) + price)", "pass"),
    (
        "credit: a balance is overwritten, not added to",
        "self.balances[who] = u256(int(self.balances.get(who, u256(0))) + amount)",
        "self.balances[who] = u256(amount)",
    ),
    # sizing
    ("size: the review window is ignored", "if c.status == OPEN and now < int(c.window_ends):", "if False:"),
    ("size: the pool need not hold the cap price", "if int(k.pool) < int(prices[int(k.cap)]):", "if False:"),
    ("size: no tier is ever above the cap", "            if index > cap:", "            if index > 9:"),
    ("size: a capped claim is paid its own tier", "                paid_index = cap\n", "                paid_index = index\n"),
    ("size: NONE is not unsized", "        if label == NONE:", '        if label == "NOPE":'),
    ("size: a sized claim can be sized again", "if c.status != OPEN and c.status != APPEALED:", "if False:"),
    (
        "size: an appeal reads the forward ladder",
        "build_prompt(json.loads(k.anchors), c.work, c.status == APPEALED)",
        "build_prompt(json.loads(k.anchors), c.work, False)",
    ),
    ("prompt: the reversed template is never used", "template = JUDGE_REVERSED if reverse else JUDGE", "template = JUDGE"),
    # the judge
    ("judge: the fence lets delimiters through", 'return str(raw).replace("<", "(").replace(">", ")")', "return str(raw)"),
    ("judge: an anchor is not fenced", "xs=fence(anchors[0]),", "xs=anchors[0],"),
    ("judge: the claim is not fenced", "claim=fence(work),", "claim=work,"),
    ("judge: validators agree with any answer", 'return mine["label"] == theirs["label"]', "return True"),
    (
        "judge: an unreadable label defaults to NONE",
        '    if label not in LABELS:\n        raise gl.vm.UserError(L + "bad label")',
        "    if label not in LABELS:\n        label = NONE",
    ),
    ("judge: a formatting slip is never retried", "        if not error_text(first).startswith(L):\n            raise", "        raise"),
    # veto
    ("veto: allowed after the window", "        if now >= int(c.window_ends):", "        if False:"),
    (
        "veto: a sized claim can be vetoed",
        '        if c.status != OPEN:\n            raise gl.vm.UserError(E + "this claim is not waiting for its first sizing")',
        "        pass",
    ),
    ("veto: a veto is not counted", "k.vetoed = u32(int(k.vetoed) + 1)", "pass"),
    # appeal
    ("appeal: any claim can be appealed", "if c.status not in DECIDED:", "if False:"),
    ("appeal: a claim can be appealed twice", "        if c.appealed:", "        if False:"),
    ("appeal: the claim is not marked appealed", "        c.status = APPEALED\n", "        pass\n"),
    ("appeal: an appeal is not counted", "k.appeals = u32(int(k.appeals) + 1)", "pass"),
    # the second reading
    ("reading two: every appeal counts as a change", "changed = status != c.first_status or tier != c.tier", "changed = True"),
    ("reading two: no appeal counts as a change", "changed = status != c.first_status or tier != c.tier", "changed = False"),
    ("reading two: only the tier counts as a change", "changed = status != c.first_status or tier != c.tier", "changed = tier != c.tier"),
    ("reading two: the fee does not come back", "            self._credit(c.claimant, fee)", "            pass"),
    ("reading two: an unchanged fee is not sent to the pool", "            k.pool = u256(int(k.pool) + fee)", "            pass"),
    ("reading two: the escrow is not released", "k.escrow = u256(int(k.escrow) - fee)", "pass"),
    ("reading two: the second label is not kept", "c.label2 = label", "pass"),
    ("reading two: a higher tier is not paid", "            self._credit(c.claimant, more)", "            pass"),
    ("reading two: a higher tier does not draw on the pool", "            k.pool = u256(int(k.pool) - more)", "            pass"),
    ("reading two: a lower tier does not return to the pool", "            k.pool = u256(int(k.pool) + take)", "            pass"),
    ("reading two: a lower tier takes more than the balance", "take = drop if drop < have else have", "take = drop"),
    ("reading two: a lower tier does not take from the balance", "                self.balances[c.claimant] = u256(have - take)", "                pass"),
    ("reading two: a revision is not counted", "k.revised = u32(int(k.revised) + 1)", "pass"),
    ("reading two: an unchanged claim loses its result", "            c.status = c.first_status", "            c.status = SIZED"),
    ("reading two: the old result stays counted", "        self._count(k, c.first_status, -1)\n", ""),
    ("reading two: the first result is not remembered", "            c.first_status = status\n", ""),
    # the card's rules
    ("open_card: any number of anchors", 'raise gl.vm.UserError(E + "a card has exactly five anchors, XS to XL")', "pass"),
    ("open_card: prices may fall", "        if prices[n] < prices[n - 1]:", "        if False:"),
    ("open_card: a price of zero is accepted", "        if wei <= 0:", "        if wei < 0:"),
    ("open_card: any price is accepted", "        if wei > MAX_PRICE:", "        if False:"),
    ("open_card: any cap tier is accepted", "        if cap not in TIERS:", "        if False:"),
    (
        "open_card: any review window is accepted",
        "if int(window_h) < MIN_WINDOW_H or int(window_h) > MAX_WINDOW_H:",
        "if int(window_h) < 0:",
    ),
    ("open_card: any appeal fee is accepted", "if int(appeal_fee) < 0 or int(appeal_fee) > MAX_FEE:", "if int(appeal_fee) < 0:"),
    ("claim: the 600-character cap is gone", 'text = _block(work, "the work description", MAX_WORK)', 'text = _block(work, "the work description", 10**6)'),
    ("open_card: the 200-character anchor cap is gone", '" anchor", MAX_ANCHOR)', '" anchor", 10**6)'),
    ("open_card: the 80-character name cap is gone", 'clean_name = _line(name, "name", MAX_NAME)', 'clean_name = _line(name, "name", 10**6)'),
    ("claim: the review window is twice as long", "window_ends=u64(now + int(k.window_h) * HOUR),", "window_ends=u64(now + int(k.window_h) * HOUR * 2),"),
    (
        "digest: the prices are not hashed",
        '{"anchors": anchors, "prices": [str(p) for p in prices], "cap": TIERS[cap]}',
        '{"anchors": anchors, "cap": TIERS[cap]}',
    ),
]

EXCLUDED = [
    "tests/test_static.py::test_generated_files_are_what_the_generator_writes",
    "tests/test_static.py::test_the_site_reads_the_frozen_deployment",
    "tests/test_static.py::test_no_private_key_in_the_repository",
]


def first_failure(output: str) -> str | None:
    for line in output.splitlines():
        match = re.match(r"FAILED (\S+)", line.strip())
        if match:
            return match.group(1).split(" - ")[0]
    return None


def main() -> int:
    source = CONTRACT.read_text(encoding="utf-8")
    rows: list[tuple[int, str, str]] = []
    escapes: list[str] = []
    with tempfile.TemporaryDirectory() as folder:
        mutant = pathlib.Path(folder) / "ratecard.py"
        for index, (what, old, new) in enumerate(MUTANTS, 1):
            count = source.count(old)
            if count != 1:
                raise SystemExit(f"mutant {index} ({what}) matches {count} places; it must match exactly one")
            mutant.write_text(source.replace(old, new), encoding="utf-8", newline="\n")
            env = dict(os.environ, RATECARD_CONTRACT=str(mutant))
            command = [
                sys.executable, "-m", "pytest", "tests/test_direct.py", "tests/test_static.py",
                "-x", "-q", "--tb=no", "-rf", "-p", "no:cacheprovider",
            ] + [arg for test in EXCLUDED for arg in ("--deselect", test)]
            result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True, text=True, encoding="utf-8")
            killer = first_failure(result.stdout)
            if result.returncode == 0 or killer is None:
                escapes.append(what)
                print(f"  {index:2} ESCAPED  {what}")
            else:
                rows.append((index, what, killer))
                print(f"  {index:2} killed   {what}  <- {killer}")
    if escapes:
        print(f"\n{len(escapes)} mutant(s) escaped; no table written:")
        for what in escapes:
            print(f"  - {what}")
        return 1
    if "--table" in sys.argv:
        target = ROOT / sys.argv[sys.argv.index("--table") + 1]
        lines = [
            "# Mutations",
            "",
            f"Written by `python scripts/mutate.py --table docs/MUTATIONS.md`. {len(rows)} defences in",
            "`contracts/ratecard.py` were each broken on their own, and every mutant was caught. Each row",
            "names the first test that failed against it, read from pytest's report rather than an exit code.",
            "The generated-files, frozen-deployment and private-key tests are excluded, because the first two",
            "fail for any edit at all and the last reads files, not the contract.",
            "",
            "One check is deliberately not mutated: the validator's test that the leader's payload is a dict",
            "with a label from the closed set. The label comparison right below it already refuses anything",
            "else, so no test can tell the two apart; it stays so the validator never depends on how the",
            "runtime treats an exception raised inside it.",
            "",
            "| # | defence broken | caught by |",
            "|---|---|---|",
        ] + [f"| {i} | {what} | `{killer}` |" for i, what, killer in rows]
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
        print(f"\nwrote {target.relative_to(ROOT).as_posix()}")
    print(f"\n{len(rows)} of {len(MUTANTS)} killed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
