"""
Loads the REAL contract file against the doubles in genvm_double.py.

Nothing is copied or re-implemented here, so a change to contracts/ratecard.py
is a change to what these tests exercise. The runner comment on the first lines
of the contract is ignored by CPython, so the file imports as ordinary Python.
"""

from __future__ import annotations

import datetime
import importlib.util
import json
import os
import pathlib
import sys
import types

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent
#: RATECARD_CONTRACT points the suite at a mutant; scripts/mutate.py sets it.
CONTRACT = pathlib.Path(os.environ.get("RATECARD_CONTRACT") or ROOT / "contracts" / "ratecard.py")

sys.path.insert(0, str(HERE))

import genvm_double as D  # noqa: E402

GEN = 10**18
HOUR = 3600
DAY = 86400

#: 2026-09-01T00:00:00Z. Every world starts here.
T0 = 1788220800

KILN = json.loads((ROOT / "eval" / "kiln.json").read_text(encoding="utf-8"))
PRICES = [int(p) * GEN for p in KILN["prices_gen"]]


def _install(gl: D.GL) -> None:
    """
    Publish a `genlayer` package shaped like the Studio Next runtime: the star
    import brings Address and the integer types, `import genlayer as gl` is the
    package itself, and the storage names live in genlayer.storage. An import
    the contract left out fails here rather than on chain.
    """
    storage = types.ModuleType("genlayer.storage")
    storage.TreeMap = D.TreeMap
    storage.DynArray = D.DynArray
    storage.allow = D.allow_storage
    module = types.ModuleType("genlayer")
    module.Address = D.Address
    for name in ("u8", "u16", "u32", "u64", "u256"):
        setattr(module, name, getattr(D, name))
    for name in ("contract", "vm", "message", "public", "nondet", "evm"):
        setattr(module, name, getattr(gl, name))
    module.storage = storage
    module.__all__ = ["Address", "u8", "u16", "u32", "u64", "u256"]
    sys.modules["genlayer"] = module
    sys.modules["genlayer.storage"] = storage


def load(gl: D.GL, path: pathlib.Path | None = None, name: str = "ratecard_contract") -> types.ModuleType:
    """Import the contract fresh against this gl."""
    _install(gl)
    spec = importlib.util.spec_from_file_location(name, path or CONTRACT)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def label_answer(label: str) -> str:
    """A model answer, as the model would type it."""
    return json.dumps({"label": label})


class World:
    """
    One Ratecard contract and the accounts around it.

    Time is explicit: `at(seconds)` sets the transaction datetime the contract
    reads, because nothing on chain moves the clock on its own and the review
    window is one of the things these tests most need to control. The accounts
    model value honestly: `sender(address, value)` sends value with the call,
    and `received` totals everything the contract was paid.
    """

    OWNER = "0x" + "c1" * 20
    ALICE = "0x" + "a1" * 20
    BOB = "0x" + "a2" * 20
    CAROL = "0x" + "a3" * 20
    STRANGER = "0x" + "d4" * 20

    NAME = KILN["name"]
    ANCHORS = KILN["anchors"]
    FEE = 1 * GEN
    POOL = 340 * GEN
    WORK = "Hosted four weekly calls with written notes."

    def __init__(self) -> None:
        self.gl = D.GL()
        self.mod = load(self.gl)
        self.at(T0)
        self.sender(self.OWNER)
        self.c = self.mod.Ratecard()
        self.received = 0

    # -- controls ----------------------------------------------------------

    def at(self, seconds: int) -> "World":
        self.t = int(seconds)
        stamp = datetime.datetime.fromtimestamp(self.t, datetime.timezone.utc)
        self.gl.message.raw["datetime"] = stamp.strftime("%Y-%m-%dT%H:%M:%SZ")
        return self

    def advance(self, seconds: int) -> "World":
        return self.at(self.t + seconds)

    def sender(self, address: str, value: int = 0) -> "World":
        self.gl.message.sender_address = D.Address(address)
        self.gl.message.origin_address = D.Address(address)
        self.gl.message.value = int(value)
        return self

    @property
    def leader(self) -> D.NodeWorld:
        return self.gl.nondet.leader

    @property
    def validators(self) -> list[D.NodeWorld]:
        return self.gl.nondet.validators

    def nodes(self) -> list[D.NodeWorld]:
        return [self.leader, *self.validators]

    # -- shorthands --------------------------------------------------------

    def open(self, name=None, anchors=None, prices=None, cap="XL", window_h=24, fee=None, pool=None, who=None) -> int:
        self.sender(who or self.OWNER, self.POOL if pool is None else pool)
        value = self.gl.message.value
        try:
            made = int(
                self.c.open_card(
                    name if name is not None else self.NAME,
                    anchors if isinstance(anchors, str) else json.dumps(anchors if anchors is not None else self.ANCHORS),
                    prices if isinstance(prices, str) else json.dumps([str(p) for p in (prices if prices is not None else PRICES)]),
                    cap,
                    window_h,
                    self.FEE if fee is None else fee,
                )
            )
        finally:
            self.sender(who or self.OWNER)
        self.received += value
        return made

    def fund(self, amount: int, cid: int = 1, who=None) -> int:
        self.sender(who or self.STRANGER, amount)
        try:
            out = int(self.c.fund_card(cid))
        finally:
            self.sender(who or self.STRANGER)
        self.received += amount
        return out

    def claim(self, work=None, cid: int = 1, who=None) -> int:
        self.sender(who or self.ALICE)
        return int(self.c.claim(cid, work if work is not None else self.WORK))

    def veto(self, claim_id: int, who=None) -> int:
        self.sender(who or self.OWNER)
        return int(self.c.veto(claim_id))

    def queue(self, label: str, validator=None) -> None:
        """One model answer for the leader and one for each validator."""
        self.leader.answers.append(label_answer(label))
        for world in self.validators:
            world.answers.append(label_answer(validator or label))

    def size(self, claim_id: int, label: str, validator=None, who=None) -> int:
        self.queue(label, validator=validator)
        self.sender(who or self.STRANGER)
        return int(self.c.size(claim_id))

    def appeal(self, claim_id: int, who=None, value=None) -> int:
        known = self.claim_of(claim_id)
        if value is not None or not known.get("found"):
            pay = GEN if value is None else int(value)
        else:
            pay = int(self.card(int(known["card_id"]))["appeal_fee"])
        self.sender(who or self.ALICE, pay)
        try:
            out = int(self.c.appeal(claim_id))
        finally:
            self.sender(who or self.ALICE)
        self.received += pay
        return out

    def withdraw(self, who=None) -> int:
        self.sender(who or self.ALICE)
        return int(self.c.withdraw())

    def play(self, label: str, work=None, cid: int = 1, who=None) -> int:
        """claim, wait out the window, size; returns the claim id."""
        claim_id = self.claim(work, cid, who)
        self.advance(int(self.card(cid)["window_h"]) * HOUR)
        self.size(claim_id, label)
        return claim_id

    # -- reads -------------------------------------------------------------

    def card(self, cid: int = 1) -> dict:
        return json.loads(self.c.get_card(cid))

    def claim_of(self, claim_id: int) -> dict:
        return json.loads(self.c.get_claim(claim_id))

    def claims(self, cid: int = 0, offset: int = 0, limit: int = 50) -> dict:
        return json.loads(self.c.list_claims(cid, offset, limit))

    def balance(self, who: str) -> int:
        return int(self.c.balances.get(D.Address(who), 0))

    def paid_to(self, address: str) -> int:
        return sum(t.value for t in self.gl.bus.transfers if t.to.lower() == address.lower())

    def paid_out(self) -> int:
        return sum(t.value for t in self.gl.bus.transfers)

    def owed(self) -> int:
        """Everything the contract holds for someone: balances, pools and escrowed appeal fees."""
        total = 0
        for balance in self.c.balances.values():
            total += int(balance)
        for card in self.c.cards.values():
            total += int(card.pool) + int(card.escrow)
        return total

    def balances_add_up(self) -> None:
        """Every wei the contract was paid is either still owed, or was paid out."""
        assert self.received == self.owed() + self.paid_out(), (self.received, self.owed(), self.paid_out())


def refused(prefix: str, fn, *args, **kwargs) -> str:
    """Assert the call is refused, and that the refusal is the sentence it should be."""
    try:
        fn(*args, **kwargs)
    except D.UserError as error:
        message = str(error)
        assert message.startswith("[EXPECTED] "), f"unprefixed refusal: {message}"
        assert prefix in message, f"expected {prefix!r}, got {message!r}"
        return message
    raise AssertionError(f"expected a refusal containing {prefix!r}, nothing was raised")
