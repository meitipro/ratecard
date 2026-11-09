/**
 * Open a card from a script, signing with a local test account.
 *
 *   node examples/open-card.mjs <account name> <ladder.json> [--dry]
 *
 * ladder.json holds { "name", "anchors": [five strings], "prices_gen": [five numbers as text], "cap", "window_h", "appeal_fee_gen", "first_funding_gen" },
 * the shape of eval/kiln.json. With --dry nothing is sent: it prints the call and the fee deposit the SDK estimates for it.
 * The site's own signing code (lib/genlayer-core.mjs) does the work, through a stand-in EIP-1193 wallet.
 */
import fs from 'node:fs';

import { parseEther } from 'viem';

import { CONTRACT, feesFor, outcomeOf, submit, waitDecided, walletClient } from '../lib/genlayer-core.mjs';
import { ensureAccount, standinWallet } from '../scripts/standin-wallet.mjs';

const [name, file, ...flags] = process.argv.slice(2);
if (!name || !file) {
  console.error('usage: node examples/open-card.mjs <account name> <ladder.json> [--dry]');
  process.exit(2);
}
const card = JSON.parse(fs.readFileSync(file, 'utf8'));
ensureAccount(name);
const { address, provider } = standinWallet(name);
const client = walletClient(address, provider);
const prices = card.prices_gen.map((p) => parseEther(p).toString());
const args = [card.name, JSON.stringify(card.anchors), JSON.stringify(prices), card.cap, card.window_h, parseEther(card.appeal_fee_gen)];
const value = parseEther(card.first_funding_gen);

if (flags.includes('--dry')) {
  const fees = await feesFor(client, 'open_card', address);
  console.log(JSON.stringify({ contract: CONTRACT, method: 'open_card', from: address, anchors: card.anchors.length, cap: card.cap, window_h: card.window_h, pool_gen: card.first_funding_gen, feeValue: String(fees.feeValue) }));
  await new Promise((r) => setTimeout(r, 200));
  process.exit(0);
}
const hash = await submit(client, { method: 'open_card', args, value, sender: address });
const outcome = outcomeOf(await waitDecided(client, hash, 'open_card'));
console.log(JSON.stringify({ hash, ok: outcome.ok, card_id: outcome.returned ?? null, refusal: outcome.refusal || null }));
process.exit(outcome.ok ? 0 : 1);
