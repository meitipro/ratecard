#!/usr/bin/env python3
"""
Run the golden claims through the deployed Ratecard contract on Studio Next,
through real consensus, and publish what came out.

    python eval/run_golden.py --lock          # hash and timestamp golden.json, once, before the first run
    python eval/run_golden.py                 # run 1 of every golden claim not yet read
    python eval/run_golden.py H1 H2 H3        # the held-out claims, once
    python eval/run_golden.py --report        # rewrite results.md from results.json

eval/stability.py runs the golden claims a second and third time and reports
any disagreement. Both write the same record, eval/results.json.

eval/golden.json was written, hashed and timestamped (eval/golden.lock.json)
before the first run, and this script refuses to run if it has changed since.
The run opens a card of its own from eval/kiln.json with the prices divided by
a hundred so the pool lasts, and a review window of 0 so each claim can be
sized at once. The labels do not depend on the prices, which the model never
sees. Every claim is filed by one account and sized by the same account, so
every label below is the real judge on the real contract.

H1 to H3 are held out: run once, reported as they came out, never used to tune
the prompt. A claim whose round produced no label (the committee timed out or
could not agree) may be sized again, and every try stays in the record. A claim
that produced a label is never sized again, whatever the label was.
"""

from __future__ import annotations

import datetime
import hashlib
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import chain as C  # noqa: E402

# A model's text can carry any character; the Windows console codepage cannot.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

HERE = pathlib.Path(__file__).resolve().parent
GOLDEN = HERE / "golden.json"
LOCK = HERE / "golden.lock.json"
RESULTS = HERE / "results.json"
REPORT = HERE / "results.md"
KILN = HERE / "kiln.json"
CARD_NAME = "Kiln eval ladder"
GEN = 10**18
SCALE = 100


def judge_sha() -> str:
    import ast

    tree = ast.parse(C.CONTRACT_FILE.read_text(encoding="utf-8"))
    for node in tree.body:
        if isinstance(node, ast.Assign) and ast.unparse(node.targets[0]) == "JUDGE":
            return hashlib.sha256(ast.literal_eval(node.value).encode("utf-8")).hexdigest()
    raise SystemExit("no JUDGE constant")


def now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load_results() -> dict:
    if RESULTS.exists():
        return json.loads(RESULTS.read_text(encoding="utf-8"))
    return {"runs": [], "card": None}


def save(results: dict) -> None:
    RESULTS.write_text(json.dumps(results, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def lock() -> None:
    if LOCK.exists():
        raise SystemExit("already locked: " + LOCK.read_text(encoding="utf-8"))
    LOCK.write_text(
        json.dumps({"file": "eval/golden.json", "sha256": C.sha256_file(GOLDEN), "locked_at": now_iso()}, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print("locked", LOCK.read_text(encoding="utf-8"))


def labelled(results: dict, case_id: str, run: int) -> dict | None:
    return next((r for r in results["runs"] if r["case"] == case_id and r["run"] == run and r.get("label")), None)


def open_card(owner: C.Chain, address: str, kiln: dict, results: dict) -> int:
    if results.get("card"):
        return int(results["card"]["id"])
    prices = [str(int(p) * GEN // SCALE) for p in kiln["prices_gen"]]
    outcome = owner.send(
        address,
        "open_card",
        [CARD_NAME, json.dumps(kiln["anchors"]), json.dumps(prices), kiln["cap"], 0, GEN // SCALE],
        value=60 * GEN,
    )
    if not outcome["ok"] or not isinstance(outcome["result"], int):
        raise SystemExit("open_card failed: " + outcome["detail"])
    results["card"] = {"id": outcome["result"], "tx": outcome["hash"], "opened_at": now_iso(), "owner": owner.account.address, "prices_wei": prices}
    save(results)
    print(f"  card {outcome['result']}  {C.EXPLORER}/tx/{outcome['hash']}")
    return int(outcome["result"])


def setup(results: dict):
    lock_doc = json.loads(LOCK.read_text(encoding="utf-8"))
    if C.sha256_file(GOLDEN) != lock_doc["sha256"]:
        raise SystemExit("eval/golden.json changed after it was locked; the golden set is not edited after the first run")
    golden = json.loads(GOLDEN.read_text(encoding="utf-8"))
    kiln = json.loads(KILN.read_text(encoding="utf-8"))
    address = C.address()
    people = C.accounts("golden_owner", "golden_claimant")
    owner = C.Chain(people["golden_owner"])
    claimant = C.Chain(people["golden_claimant"])
    owner.ensure(people["golden_owner"].address, minimum_gen=80)
    claimant.ensure(people["golden_claimant"].address, minimum_gen=20)
    results.update(
        {
            "contract": address,
            "contract_sha256": C.deployment().get("ratecard_sha256"),
            "golden_sha256": lock_doc["sha256"],
            "golden_locked_at": lock_doc["locked_at"],
            "judge_sha256": judge_sha(),
            "network": C.NETWORK,
            "explorer": C.EXPLORER,
            "owner": people["golden_owner"].address,
            "claimant": people["golden_claimant"].address,
        }
    )
    save(results)
    card_id = open_card(owner, address, kiln, results)
    return golden, address, claimant, card_id


def size_one(claimant: C.Chain, address: str, card_id: int, case: dict, run: int, results: dict) -> None:
    """File one claim and size it. A claim already filed for this case and run is sized again, never filed twice."""
    prior = next((r for r in results["runs"] if r["case"] == case["id"] and r["run"] == run), None)
    if prior and prior.get("label"):
        print(f"{case['id']} run {run}: already read, never sent again")
        return
    if prior is None:
        filed = claimant.send(address, "claim", [card_id, case["claim"]])
        if not filed["ok"] or not isinstance(filed["result"], int):
            raise SystemExit(f"claim for case {case['id']} failed: {filed['detail']}")
        prior = {"case": case["id"], "run": run, "claim_id": filed["result"], "claim_tx": filed["hash"], "tries": []}
        results["runs"].append(prior)
        save(results)
    outcome = claimant.send(address, "size", [prior["claim_id"]])
    row = {"tx": outcome["hash"], "sent_at": now_iso(), "consensus": "decided" if outcome["ok"] else outcome["detail"]}
    prior["tries"].append(row)
    if outcome["ok"]:
        stored = C.retry("get_claim", claimant.read_json, address, "get_claim", [prior["claim_id"]])
        prior.update({"label": stored["reading1"], "status": stored["status"], "tier": stored["tier"], "pay": stored["pay"], "size_tx": outcome["hash"]})
    # Saved before anything is printed: a result that exists on chain must
    # never be lost to a failure on this side of the wire.
    save(results)
    if prior.get("label"):
        want = case["expected"]
        verdict = "held out" if want == "EITHER" else ("MATCH" if prior["label"] == want else "MISS ")
        print(f"{case['id']:>3} run {run}: {verdict} got {prior['label']}, expected {want}  ({prior['status']})")
    else:
        print(f"{case['id']:>3} run {run}: no label: {row['consensus']}")


def run(ids: list[str], runs: list[int]) -> None:
    results = load_results()
    golden, address, claimant, card_id = setup(results)
    wanted = ids or [c["id"] for c in golden["cases"] if not c.get("held_out")]
    for case in golden["cases"]:
        if case["id"] not in wanted:
            continue
        for number in ([1] if case.get("held_out") else runs):
            size_one(claimant, address, card_id, case, number, results)
    report()


def report() -> None:
    results = load_results()
    golden = json.loads(GOLDEN.read_text(encoding="utf-8"))
    kiln = json.loads(KILN.read_text(encoding="utf-8"))
    explorer = results.get("explorer", C.EXPLORER)
    by_case: dict[str, list[dict]] = {}
    for r in results["runs"]:
        if r.get("label"):
            by_case.setdefault(r["case"], []).append(r)
    for rows in by_case.values():
        rows.sort(key=lambda r: r["run"])
    first_hits = first_n = 0
    stable = unstable = 0
    all_hits = all_n = 0
    for case in golden["cases"]:
        rows = by_case.get(case["id"], [])
        if case.get("held_out") or not rows:
            continue
        first_n += 1
        first_hits += rows[0]["label"] == case["expected"]
        all_n += len(rows)
        all_hits += sum(1 for r in rows if r["label"] == case["expected"])
        if len(rows) >= 3:
            if len({r["label"] for r in rows}) == 1:
                stable += 1
            else:
                unstable += 1
    contract = results.get("contract", "")
    lines = [
        "# Golden claims, through real consensus",
        "",
        f"Contract [`{contract}`]({explorer}/address/{contract}) on Studio Next (chain 61997). Every row is one `claim` and one `size` "
        "on the deployed contract, and the label is read back with `get_claim`, not from the script's memory. "
        f"The card is a copy of the Kiln ladder with the prices divided by {SCALE} and a review window of 0, so the pool lasts "
        "and each claim can be sized at once; the model never sees prices.",
        "",
        f"- Golden claims, first reading: **{first_hits} of {first_n}** matched the expected label.",
        f"- All readings: **{all_hits} of {all_n}** matched.",
        f"- Stability, each golden claim read three times: **{stable}** claims came back identical every time, **{unstable}** did not.",
        "- Held-out claims: reported below exactly as they came out; they have no expected label and were read once.",
        f"- `eval/golden.json` sha256 `{results.get('golden_sha256', '')}`, locked at {results.get('golden_locked_at', '')}, before the first run.",
        f"- Judge prompt sha256 `{results.get('judge_sha256', '')}`.",
        "",
        "Nothing here was tuned. The prompt is the spec's, word for word, and no case was edited after the lock.",
        "",
        "| Case | Claim | Expected | Run 1 | Run 2 | Run 3 | Stable |",
        "|---|---|---|---|---|---|---|",
    ]
    for case in golden["cases"]:
        rows = {r["run"]: r for r in by_case.get(case["id"], [])}
        cells = []
        for number in (1, 2, 3):
            r = rows.get(number)
            if not r:
                cells.append("" if number > 1 or case.get("held_out") is False else "not run")
                continue
            mark = "" if case["expected"] == "EITHER" else (" ✓" if r["label"] == case["expected"] else " ✗")
            cells.append(f"[{r['label']}{mark}]({explorer}/tx/{r['size_tx']})")
        have = [r["label"] for r in rows.values()]
        if case.get("held_out"):
            steady = "once"
        elif len(have) >= 3:
            steady = "yes" if len(set(have)) == 1 else "**no**"
        else:
            steady = "pending"
        claim = case["claim"].replace("|", "/")
        lines.append(f"| {case['id']}{' (held out)' if case.get('held_out') else ''} | {claim} | {case['expected']} | {cells[0]} | {cells[1]} | {cells[2]} | {steady} |")
    tries = [(r, t) for r in results["runs"] for t in r["tries"] if t.get("consensus") != "decided"]
    lines += ["", "## Every try", ""]
    if tries:
        lines.append("Tries whose size produced no label, each followed by another size of the same claim:")
        lines.append("")
        for r, t in tries:
            lines.append(f"- case {r['case']} run {r['run']}: {t['consensus']} ([tx]({explorer}/tx/{t['tx']}))")
    else:
        lines.append("Every claim produced a label on its first size; nothing was sent twice.")
    card = results.get("card") or {}
    lines += ["", "## The card", ""]
    if card:
        lines.append(f"Card {card['id']} \"{CARD_NAME}\", opened in [{card['tx'][:10]}…]({explorer}/tx/{card['tx']}): the Kiln anchors, prices {', '.join(str(int(p) / GEN) for p in card['prices_wei'])} GEN, cap XL, window 0, appeal fee {int(kiln['appeal_fee_gen']) / SCALE} GEN.")
    lines.append("")
    REPORT.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print(f"\nwrote {REPORT.relative_to(C.ROOT).as_posix()}: first reading {first_hits}/{first_n}, stable {stable}, unstable {unstable}")


if __name__ == "__main__":
    if "--lock" in sys.argv:
        lock()
    elif "--report" in sys.argv:
        report()
    else:
        run([a for a in sys.argv[1:] if not a.startswith("--")], [1])
