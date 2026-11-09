/**
 * Walk the reviewer's path from fresh accounts, through the site's own code, to finality.
 *
 *   node scripts/reviewer-path.mjs https://<the site> [run-name]
 *
 * Three accounts made for this run, which have never touched the contract:
 *   1. faucet    the site's /api/faucet funds all three, sent the address in lower case
 *   2. open      the owner opens a card with the Kiln ladder (prices divided by 100) and a pool
 *   3. claim     the first claimant files the spec's own example claim, and it is sized
 *   4. appeal    the claimant appeals once; the ladder is read again, largest first
 *   5. unsized   the second claimant files a claim that describes no work; it is UNSIZED
 *   6. money     after finality the claimant withdraws; the wallet must have moved by exactly
 *                what the contract owed minus the fee the transaction's own accounting reports
 *   7. read      the site's card and claim pages show what the chain holds
 *
 * Every write goes through lib/genlayer-core.mjs with the stand-in wallet, the
 * code the browser runs. Each step is written to
 * ../docs/reviewer-path.studio-next.json before anything is printed about it.
 * Keys stay in ~/.ratecard/accounts.json and are never printed.
 */

import fs from 'node:fs';
import path from 'node:path';

import { CONTRACT, outcomeOf, readClient, retried, submit, waitDecided, waitFinal, walletClient } from '../lib/genlayer-core.mjs';
import { balanceOf, ensureAccount, rpc, standinWallet } from './standin-wallet.mjs';

const site = (process.argv[2] ?? '').replace(/\/$/, '');
const run = process.argv[3] ?? 'rp1';
if (!site) {
  console.error('usage: node scripts/reviewer-path.mjs https://<site> [run-name]');
  process.exit(2);
}
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const root = path.join(here, '..', '..');
const RECORD = path.join(root, 'docs', 'reviewer-path.studio-next.json');
const kiln = JSON.parse(fs.readFileSync(path.join(root, 'eval', 'kiln.json'), 'utf8'));
const record = fs.existsSync(RECORD) ? JSON.parse(fs.readFileSync(RECORD, 'utf8')) : { runs: {} };
const log = (record.runs[run] ??= { site, contract: CONTRACT, started: new Date().toISOString(), steps: [] });
const save = () => fs.writeFileSync(RECORD, JSON.stringify(record, (k, v) => (typeof v === 'bigint' ? v.toString() : v), 2) + '\n');
const GEN = 10n ** 18n;
const fmt = (wei) => `${Number(wei) / 1e18} GEN`;

const stepDone = (key) => log.steps.find((s) => s.key === key && s.ok);
const recorded = (key) => log.steps.some((s) => s.key === key);
function note(entry) {
  log.steps.push({ at: new Date().toISOString(), ...entry });
  save();
}

const reader = readClient();
async function view(functionName, args) {
  return JSON.parse(String(await retried(() => reader.readContract({ address: CONTRACT, functionName, args }), 5)));
}

/** The net fee a decided transaction cost its sender, from its own fee accounting. */
async function netFee(hash) {
  const tx = await rpc('eth_getTransactionByHash', [hash]).catch(() => null);
  const gen = await rpc('gen_getTransactionByHash', [hash]).catch(() => null);
  const acct = gen?.data?.fee_accounting ?? tx?.data?.fee_accounting;
  if (!acct) return null;
  return BigInt(acct.paid_fee_value ?? 0) - BigInt(acct.total_refunded ?? 0);
}

async function write(key, account, method, args, value = 0n, { final = false } = {}) {
  const prior = stepDone(key);
  if (prior) return prior;
  const { address, provider } = standinWallet(account);
  const client = walletClient(address, provider);
  const started = Date.now();
  const hash = await submit(client, { method, args, value, sender: address });
  const decided = await waitDecided(client, hash, method);
  const outcome = outcomeOf(decided);
  const entry = {
    key,
    method,
    account,
    from: address,
    args: args.map((a) => (typeof a === 'string' && a.length > 60 ? a.slice(0, 57) + '...' : a)),
    value: value.toString(),
    hash,
    ok: outcome.ok,
    status: outcome.status,
    execution: outcome.execution,
    returned: outcome.returned ?? null,
    refusal: outcome.refusal || null,
    seconds_to_decision: Math.round((Date.now() - started) / 1000),
  };
  if (final && outcome.ok) {
    const done = await waitFinal(client, hash);
    entry.final_status = outcomeOf(done).status;
  }
  note(entry);
  console.log(`${key}: ${method} ${entry.ok ? 'ok' : 'NOT OK ' + (entry.refusal ?? entry.status)} in ${entry.seconds_to_decision} s  ${hash}`);
  if (!entry.ok) throw new Error(`${key} failed: ${entry.refusal ?? entry.status}`);
  return entry;
}

// -- accounts ---------------------------------------------------------------------------------
const names = { owner: `review_owner_${run}`, claimant: `review_claimant_${run}`, other: `review_other_${run}` };
const addr = Object.fromEntries(Object.entries(names).map(([k, n]) => [k, ensureAccount(n)]));
if (!log.accounts) {
  const nonces = {};
  for (const [k, a] of Object.entries(addr)) nonces[k] = Number(await rpc('eth_getTransactionCount', [a, 'latest']));
  log.accounts = { ...addr, nonces_at_start: nonces };
  save();
  console.log(`accounts: ${JSON.stringify(addr)} nonces at start ${JSON.stringify(nonces)}`);
}

// -- 1. faucet, through the site --------------------------------------------------------------
for (const [who, address] of Object.entries(addr)) {
  const key = `faucet-${who}`;
  if (stepDone(key)) continue;
  const response = await fetch(`${site}/api/faucet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address: address.toLowerCase() }),
  });
  const body = await response.json().catch(() => ({}));
  const after = await balanceOf(address);
  // 409 is the faucet saying the address already holds enough: what the first, timed-out call of an earlier try had paid.
  const ok = (response.ok && BigInt(body.after ?? 0) > BigInt(body.before ?? 0) && after > 0n) || (response.status === 409 && after >= 10n * GEN);
  note({ key, ok, http: response.status, sent_address: address.toLowerCase(), answered_address: body.address, before: body.before, after: body.after, read_after: after.toString(), error: body.error });
  console.log(`${key}: HTTP ${response.status} ${fmt(BigInt(body.before ?? 0))} -> ${fmt(after)} ${body.error ?? ''}`);
  if (!ok) throw new Error(`${key} did not fund ${address}`);
}

// -- 2. open a card ----------------------------------------------------------------------------
const prices = kiln.prices_gen.map((p) => ((BigInt(p) * GEN) / 100n).toString());
const opened = await write('open-card', names.owner, 'open_card', [`Reviewer path ${run}: Kiln`, JSON.stringify(kiln.anchors), JSON.stringify(prices), 'XL', 0, GEN / 100n], 5n * GEN);
const cardId = Number(opened.returned);

// -- 3. the spec's own example claim, sized ----------------------------------------------------
const filed = await write('claim', names.claimant, 'claim', [cardId, 'Hosted four weekly calls with written notes']);
const claimId = Number(filed.returned);
await write('size', names.claimant, 'size', [claimId]);
const first = await view('get_claim', [claimId]);
if (!recorded('size-read')) note({ key: 'size-read', ok: true, claim_id: claimId, status: first.status, reading1: first.reading1, tier: first.tier, pay: first.pay });
console.log(`  -> ${first.status} ${first.reading1} pays ${fmt(BigInt(first.pay))}`);

// -- 4. one appeal: the ladder is read again, largest first -------------------------------------
await write('appeal', names.claimant, 'appeal', [claimId], GEN / 100n);
await write('size2', names.claimant, 'size', [claimId]);
const second = await view('get_claim', [claimId]);
if (!recorded('appeal-read')) {
  note({ key: 'appeal-read', ok: true, claim_id: claimId, status: second.status, reading1: second.reading1, reading2: second.reading2, tier: second.tier, pay: second.pay, fee_to: second.fee_to });
}
console.log(`  -> after the appeal: ${second.status} ${second.reading1} / ${second.reading2}, appeal fee to ${second.fee_to}`);

// -- 5. a claim that describes no work ------------------------------------------------------------
const vague = await write('claim-vague', names.other, 'claim', [cardId, 'I worked really hard on community stuff']);
const vagueId = Number(vague.returned);
await write('size-vague', names.other, 'size', [vagueId]);
const unsized = await view('get_claim', [vagueId]);
if (!recorded('vague-read')) note({ key: 'vague-read', ok: true, claim_id: vagueId, status: unsized.status, reading1: unsized.reading1, pay: unsized.pay });
console.log(`  -> ${unsized.status} ${unsized.reading1}, pays ${fmt(BigInt(unsized.pay))}`);

// -- 6. the money, to the wei, after finality ------------------------------------------------------
if (!recorded('balance-claimant')) {
  const owed = BigInt((await view('get_claim', [claimId])).claimant_balance);
  if (owed === 0n) {
    note({ key: 'balance-claimant', ok: false, owed: '0', why: 'nothing was owed, so there was nothing to withdraw' });
  } else {
    const before = await balanceOf(addr.claimant);
    const w = await write('claimant-withdraw', names.claimant, 'withdraw', [], 0n, { final: true });
    const after = await balanceOf(addr.claimant);
    const fee = await netFee(w.hash);
    const expected = fee === null ? null : before + owed - fee;
    note({ key: 'balance-claimant', ok: expected === after, owed: owed.toString(), before: before.toString(), after: after.toString(), net_fee: fee?.toString() ?? null, expected: expected?.toString() ?? null, difference: expected === null ? null : (after - expected).toString() });
    console.log(`  claimant: ${fmt(before)} -> ${fmt(after)}; owed ${fmt(owed)}, fee ${fee === null ? '?' : fmt(fee)}; ${expected === after ? 'exact to the wei' : 'difference ' + (expected === null ? '?' : (after - expected).toString()) + ' wei'}`);
  }
}

// -- 7. the site shows what the chain holds ---------------------------------------------------------
const pages = [
  ['page-card', `${site}/k/${cardId}`, `Reviewer path ${run}`],
  ['page-claim', `${site}/c/${claimId}`, 'Hosted four weekly calls'],
  ['page-vague', `${site}/c/${vagueId}`, 'community stuff'],
];
for (const [key, url, needle] of pages) {
  if (recorded(key)) continue;
  let ok = false;
  let status = 0;
  for (let attempt = 0; attempt < 6 && !ok; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 10000));
    const response = await fetch(url, { cache: 'no-store' });
    status = response.status;
    const html = await response.text();
    ok = response.ok && html.includes(needle);
  }
  note({ key, ok, url, http: status });
  console.log(`${key}: HTTP ${status} ${ok ? 'shows it' : 'MISSING'}  ${url}`);
}

log.finished = new Date().toISOString();
save();
console.log(`\nrecorded in docs/reviewer-path.studio-next.json (run ${run})`);
process.exit(0);
