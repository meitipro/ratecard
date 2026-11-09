#!/usr/bin/env python3
"""
Seed the deployed contract with realistic cards and real claims, and keep the record.

    python scripts/seed.py            # the Kiln contributors card, a capped card, claims at several tiers, a veto, an appeal, withdrawals
    python scripts/seed.py --report   # rewrite docs/seed.studio-next.md from the record

Every label comes from the deployed judge through real consensus; nothing here
decides one. After each sizing the script reads the result back and records
what the contract said, not what was hoped. The accounts are test accounts and
the people and teams are fictional (docs/seed.md says so).

The Kiln card has a review window of one hour, the shortest that still lets the
owner veto, so the script sleeps between filing the claims and sizing them. The
capped card has a window of 0 and is sized at once.

Every step is written to docs/seed.studio-next.json before anything is printed,
so a crash never loses a transaction that exists on chain, and a rerun resumes
where the last one stopped. Accounts live in ~/.ratecard/accounts.json; only
addresses are printed.
"""

from __future__ import annotations

import datetime
import json
import sys
import time

import chain as C

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RECORD = C.ROOT / "docs" / "seed.studio-next.json"
KILN = json.loads((C.ROOT / "eval" / "kiln.json").read_text(encoding="utf-8"))
GEN = 10**18
PRICES = [str(int(p) * GEN) for p in KILN["prices_gen"]]

CLAIMS = {
    "ada": "Answered 12 questions in #help this week",
    "bo": "Hosted four weekly calls with written notes",
    "cy": "I worked really hard on community stuff",
    "dee": "Fixed a typo in the docs",
}
HACKATHON = "Organised a two day hackathon, 50 people, 6 sponsors"
ACCOUNTS = ["seed_owner", "seed_ada", "seed_bo", "seed_cy", "seed_dee", "seed_owner2", "seed_ed"]


def now_iso() -> str:
    return datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load() -> dict:
    if RECORD.exists():
        return json.loads(RECORD.read_text(encoding="utf-8"))
    return {"network": C.NETWORK, "contract": C.address(), "steps": [], "cards": {}, "claims": {}}


def save(record: dict) -> None:
    RECORD.parent.mkdir(parents=True, exist_ok=True)
    RECORD.write_text(json.dumps(record, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")


def done(record: dict, key: str) -> dict | None:
    return next((s for s in record["steps"] if s["key"] == key and s.get("ok")), None)


def step(record: dict, key: str, chain: C.Chain, method: str, args: list, value: int = 0, note: str = "") -> dict:
    """Send once, record the outcome before printing, and never send a finished step again."""
    known = done(record, key)
    if known:
        print(f"{key}: already done {known['hash']}")
        return known
    outcome = chain.send(C.address(), method, args, value)
    row = {
        "key": key,
        "method": method,
        "from": chain.account.address,
        "ok": outcome["ok"],
        "hash": outcome["hash"],
        "returned": outcome["result"] if isinstance(outcome["result"], (int, str, type(None))) else None,
        "refusal": outcome["refusal"],
        "detail": outcome["detail"],
        "at": now_iso(),
        "note": note,
    }
    record["steps"].append(row)
    save(record)
    print(f"{key}: {'ok' if outcome['ok'] else 'FAILED ' + outcome['detail']} {C.EXPLORER}/tx/{outcome['hash']}")
    if not outcome["ok"]:
        raise SystemExit(f"{key} did not succeed: {outcome['detail']}")
    return row


def read_claim(record: dict, tag: str, reader: C.Chain, claim_id: int) -> dict:
    got = reader.read_json(C.address(), "get_claim", [claim_id])
    record["claims"][tag] = {k: got[k] for k in ("id", "card_id", "status", "reading1", "reading2", "tier", "pay", "appealed", "fee_to", "claimant")}
    save(record)
    print(f"  {tag}: claim {claim_id} -> {got['status']} {got['reading1']}{' / ' + got['reading2'] if got['reading2'] else ''} {int(got['pay']) / GEN} GEN")
    return got


def seed() -> None:
    record = load()
    people = C.accounts(*ACCOUNTS)
    chains = {name: C.Chain(people[name]) for name in ACCOUNTS}
    reader = C.Chain()
    for chain in chains.values():
        chain.ensure(chain.account.address, 20)
    chains["seed_owner"].ensure(chains["seed_owner"].account.address, 400)
    chains["seed_owner2"].ensure(chains["seed_owner2"].account.address, 100)

    # -- the Kiln contributors card: a one hour window, so the owner can veto before anything is sized
    opened = step(
        record,
        "kiln:open_card",
        chains["seed_owner"],
        "open_card",
        ["Kiln contributors", json.dumps(KILN["anchors"]), json.dumps(PRICES), "XL", 1, GEN],
        value=340 * GEN,
        note="the Kiln ladder, pool 340 GEN, cap XL, review window 1 hour, appeal fee 1 GEN",
    )
    kiln = int(opened["returned"])
    record["cards"]["kiln"] = {"id": kiln, "owner": chains["seed_owner"].account.address}
    save(record)
    ids = {}
    for who, work in CLAIMS.items():
        made = step(record, f"{who}:claim", chains["seed_" + who], "claim", [kiln, work])
        ids[who] = int(made["returned"])
    # the owner vetoes one claim inside the window
    step(record, "dee:veto", chains["seed_owner"], "veto", [ids["dee"]], note="the owner says no inside the review window")
    read_claim(record, "dee", reader, ids["dee"])

    # -- a capped card: a window of 0, so it is sized at once
    cap_open = step(
        record,
        "capped:open_card",
        chains["seed_owner2"],
        "open_card",
        ["Kiln interns", json.dumps(KILN["anchors"]), json.dumps(PRICES), "M", 0, GEN],
        value=100 * GEN,
        note="the same ladder with the cap at M, so a larger claim is paid the cap",
    )
    capped = int(cap_open["returned"])
    record["cards"]["capped"] = {"id": capped, "owner": chains["seed_owner2"].account.address}
    save(record)
    made = step(record, "ed:claim", chains["seed_ed"], "claim", [capped, HACKATHON])
    ids["ed"] = int(made["returned"])
    step(record, "ed:size", chains["seed_ed"], "size", [ids["ed"]])
    read_claim(record, "ed", reader, ids["ed"])

    # -- wait out the Kiln window, then size what is left
    if not done(record, "ada:size"):
        state = reader.read_json(C.address(), "get_claim", [ids["ada"]])
        wait = max(0, int(state["window_ends"]) - int(time.time())) + 90
        print(f"waiting {wait} seconds for the Kiln review window")
        time.sleep(wait)
    for who in ("ada", "bo", "cy"):
        step(record, f"{who}:size", chains["seed_" + who], "size", [ids[who]])
        read_claim(record, who, reader, ids[who])

    # -- an appeal: the weekly calls claim reads the ladder again, largest first
    step(record, "bo:appeal", chains["seed_bo"], "appeal", [ids["bo"]], GEN, note="one appeal, the appeal fee of 1 GEN")
    step(record, "bo:size2", chains["seed_bo"], "size", [ids["bo"]], note="the second reading, with the ladder reversed")
    read_claim(record, "bo", reader, ids["bo"])

    # -- money: every contributor takes what the card paid
    for who in ("ada", "bo"):
        state = reader.read_json(C.address(), "get_claim", [ids[who]])
        if int(state["claimant_balance"]) > 0:
            step(record, f"{who}:withdraw", chains["seed_" + who], "withdraw", [], note="the price on the card")
    state = reader.read_json(C.address(), "get_claim", [ids["ed"]])
    if int(state["claimant_balance"]) > 0:
        step(record, "ed:withdraw", chains["seed_ed"], "withdraw", [], note="the cap price")
    for key, card in record["cards"].items():
        got = reader.read_json(C.address(), "get_card", [card["id"]])
        card["after"] = {k: got[k] for k in ("pool", "escrow", "funded", "paid")}
    save(record)
    report()


def report() -> None:
    record = load()
    explorer = C.EXPLORER

    def link(h: str) -> str:
        return f"[{h[:10]}…]({explorer}/tx/{h})" if h else ""

    steps = {s["key"]: s for s in record["steps"]}
    lines = [
        "# Seed",
        "",
        f"Written by `python scripts/seed.py` against the Ratecard contract [`{record.get('contract', '')}`]({explorer}/address/{record.get('contract', '')}) on Studio Next. "
        "Every label below was produced by the deployed judge through real consensus, and the script recorded what the contract said, not what was hoped.",
        "",
        "The teams (Kiln) and the people are fictional and exist only for this demonstration. The accounts are test accounts.",
        "",
        "## Claims",
        "",
        "| Claim | Card | Result | First reading | Second reading | Pay | Filed | Sized |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for tag, c in record.get("claims", {}).items():
        card = "Kiln interns (cap M)" if tag == "ed" else "Kiln contributors"
        filed = steps.get(f"{tag}:claim", {}).get("hash", "")
        sized = steps.get(f"{tag}:size2", steps.get(f"{tag}:size", steps.get(f"{tag}:veto", {}))).get("hash", "")
        lines.append(f"| {tag} ({c['id']}) | {card} | **{c['status']}** | {c['reading1'] or '–'} | {c['reading2'] or '–'} | {int(c['pay']) / GEN} GEN | {link(filed)} | {link(sized)} |")
    lines += ["", "## Money", ""]
    for s in record["steps"]:
        if s["method"] == "withdraw":
            lines.append(f"- {s['key']}: {link(s['hash'])} {'(' + s['note'] + ')' if s.get('note') else ''}")
    lines += ["", "## Cards", ""]
    for key, card in record.get("cards", {}).items():
        after = card.get("after", {})
        lines.append(f"- {key}: card {card['id']}, pool {int(after.get('pool', 0)) / GEN} GEN, escrow {int(after.get('escrow', 0)) / GEN} GEN, funded {int(after.get('funded', 0)) / GEN} GEN, paid {int(after.get('paid', 0)) / GEN} GEN")
    lines += ["", "## Every step", ""]
    for s in record["steps"]:
        lines.append(f"- `{s['key']}` {s['method']} {'ok' if s['ok'] else 'FAILED'} {link(s['hash'])} {s['at']}")
    lines.append("")
    out = C.ROOT / "docs" / "seed.studio-next.md"
    out.write_text("\n".join(lines), encoding="utf-8", newline="\n")
    print("wrote", out.relative_to(C.ROOT).as_posix())


if __name__ == "__main__":
    if "--report" in sys.argv:
        report()
    else:
        seed()
