# Ratecard

**Price the work before anyone argues about it.** A rate card for contributor pay on GenLayer.

A team writes a ladder of five example jobs from XS to XL with a price each, a cap, a review window and an appeal fee, and funds a pool. Contributors describe work they did. After the owner's review window, GenLayer validators place each claim on the ladder by comparing it with the examples, and the price printed on the card is paid. The model answers one label; the contract looks the price up on the card. Nobody negotiates, and nobody is paid more because they wrote a longer story.

- **Network:** GenLayer Studio Next, chain 61997 (`0xF22D`)
- **Contract:** [`0x8E07F4eDd2C9F457F7148356720634a2bCeab2cF`](https://explorer-studio-dev.genlayer.com/address/0x8E07F4eDd2C9F457F7148356720634a2bCeab2cF), deployed in [`0xedeb38f0…a407`](https://explorer-studio-dev.genlayer.com/tx/0xedeb38f0f7d0858f2dd36d16d8a56b44b3df3272d415e606b2661b291be4a407)
- **Source:** `contracts/ratecard.py`, sha256 in `contracts/FROZEN.json`, held to the deployed bytes by `scripts/verify.py`

## How it works

| Result | Meaning | Money |
|---|---|---|
| SIZED · tier | the claim sits at one of the five tiers | the price of that tier |
| CAPPED · tier | the claim is above the card's cap tier | the price of the cap tier |
| UNSIZED | not a description of work, or nothing to compare | nothing |
| REVISED | an appeal changed the result | the new price; the appeal fee comes back |
| VETOED | the owner said no inside the review window | nothing |

- A card has a name of at most 80 characters, exactly five anchors (at most 200 characters each) and five prices that do not fall as the tier rises. The owner sets a cap tier, a review window of 0 to 72 hours and an appeal fee. Anchors and prices are fixed once the card opens.
- A claim is a description of at most 600 characters. The owner can veto it once, inside the window.
- Sizing runs only after the window, and only when the pool holds the cap price.
- The judge returns `XS`, `S`, `M`, `L`, `XL` or `NONE`. Between two tiers it picks the smaller. Validators compare that one label and nothing else.
- One appeal per claim: it costs the appeal fee and the claim is read again with the ladder shown largest first. The second reading replaces the first; the fee returns when the result changed, otherwise it goes to the pool.
- Money moves in one place: `open_card`, `fund_card` and `appeal` take value in, `size`, `veto` and `appeal` only move balances, `withdraw` is the only payout.

One contract, ten methods: `open_card`, `fund_card`, `claim`, `veto`, `size`, `appeal`, `withdraw` and the views `get_card`, `get_claim`, `list_claims`.

## What was measured

Every number below was read from a file in this repository or from the chain.

| | |
|---|---|
| Offline tests | 149 passed, 4 live-network tests skipped without `RATECARD_INTEGRATION=1` (`pytest`) |
| Mutation testing | 68 of 68 defences broken one at a time and caught, each naming its test (`docs/MUTATIONS.md`) |
| Golden claims, first reading | **10 of 10** matched through real consensus (`eval/results.md`) |
| Stability | each golden claim read three times: **30 of 30** readings matched and all 10 claims were identical every time (`eval/stability.py`) |
| Held-out claims | H1 `M`, H2 `S`, H3 `L`, read once, reported as they came out, no expected label |
| Deployed source vs repository | identical (`python scripts/verify.py`) |

Nothing was tuned: the prompt is the spec's, word for word, and `eval/golden.json` was hashed before the first run (`eval/golden.lock.json`). The eval card uses the Kiln ladder with the prices divided by 100 and a window of 0 so the pool lasts; the model never sees a price.

## Where the spec contradicts itself

The build spec says a claim "reserves nothing yet" and also that a veto returns "the reserved price" to the pool. This contract takes the first at its word: a claim reserves nothing, so a veto has nothing to return. It holds appeal fees apart from the pool as escrow. The reversed reading is the same prompt with the ladder block shown largest first (`JUDGE_REVERSED`, checked against `JUDGE` by a test). A lower second reading takes back only what is still in the contributor's balance, and a pool has no way to be taken back out. These are documented in `/docs/more/limitations`.

## A note about the runtime

The `5jycge4q…` runtime header that earlier Studio Next projects used was rejected by the live network on the day this was built (`invalid_contract runner malformed`). This contract uses `py-genlayer:babwp9t3…`, which the network accepted. The local linter does not know that runner yet, so it reads a copy of the file with the old header swapped in; only the header differs. The authority on the real header is `gen_getContractSchemaForCode`, which `scripts/deploy.py` calls before every deploy.

## Layout

```text
contracts/ratecard.py       one contract, the judge prompt pinned inside
contracts/FROZEN.json       address, deploy transaction, sha256 of the deployed bytes
tests/                      direct tests (104), static tests over the parsed source, live read-only tests
eval/                       golden.json (locked), kiln.json (the ladder), run_golden.py, stability.py, results.md
scripts/                    deploy, verify, mutate, seed, gen_docs, chain
web/                        Next.js site and /docs (Fumadocs), writes signed in the visitor's wallet
docs/                       mutation table, seed record, reviewer-path record
submission/                 portal text, form fields, evidence links, 512 px icon
```

## Run it

```bash
python -m venv .venv && .venv/Scripts/pip install -r requirements.txt     # Windows; use bin/ elsewhere
.venv/Scripts/python -m pytest                                            # offline, a few seconds
.venv/Scripts/python scripts/mutate.py --table docs/MUTATIONS.md          # break every defence, name its test
RATECARD_INTEGRATION=1 .venv/Scripts/python -m pytest tests/test_integration.py   # read the live network
cd web && npm ci && npm run dev                                           # the site on http://localhost:3210
```

## Keys

No private key is on any server or in this repository. Test accounts live in `~/.ratecard/accounts.json` on the build machine, and the scripts print only addresses. The site signs in the visitor's wallet. The one optional server secret is `OPENROUTER_API_KEY` for the "test against the ladder" preview, which is off without it and never binding.

## Honest limits

Ratecard sizes what is described. It cannot see the work, so the review window and the veto are the check. Size is scope and effort, not quality, and the hours a claimant reports are ignored by rule. It is as fair as the five examples a team writes. See `/docs/more/limitations`.
