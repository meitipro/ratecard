/**
 * Reconcile the reviewer-path accounts to the wei, once everything is final.
 *
 *   node scripts/reconcile.mjs [run-name]
 *
 * A balance read right after one transaction finalizes can still include or
 * miss the settlement of an earlier one: on Studio Next every write locks a fee
 * deposit and refunds the unused part when that write finalizes. So this
 * waits until every transaction the account sent is FINALIZED with its fee
 * accounting settled, then checks one equation per account:
 *
 *   balance = faucet paid in + value received - value sent - sum of net fees
 *
 * where each net fee is paid_fee_value - total_refunded from that
 * transaction's own fee accounting, and value received is the withdrawal the
 * contract paid out. The result is added to ../docs/reviewer-path.studio-next.json.
 */

import fs from 'node:fs';
import path from 'node:path';

import { balanceOf, rpc } from './standin-wallet.mjs';

const run = process.argv[2] ?? 'rp1';
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const RECORD = path.join(here, '..', '..', 'docs', 'reviewer-path.studio-next.json');
const record = JSON.parse(fs.readFileSync(RECORD, 'utf8'));
const log = record.runs[run];
if (!log) throw new Error(`no run ${run}`);

async function settled(hash) {
  for (let i = 0; i < 120; i++) {
    const tx = await rpc('eth_getTransactionByHash', [hash]).catch(() => null);
    const acct = tx?.data?.fee_accounting;
    const final = String(tx?.status_name ?? tx?.statusName ?? tx?.status ?? '').toUpperCase();
    if (acct && acct.status === 'settled' && (final === 'FINALIZED' || final === '7')) {
      return {
        fee: BigInt(acct.paid_fee_value ?? 0) - BigInt(acct.total_refunded ?? 0),
        message: BigInt(acct.message_fee_consumed ?? 0),
        value: BigInt(tx?.data?.user_value ?? tx?.value ?? 0),
      };
    }
    await new Promise((r) => setTimeout(r, 10000));
  }
  throw new Error(`${hash} did not settle`);
}

const writes = log.steps.filter((s) => s.hash && s.ok);
const faucet = Object.fromEntries(log.steps.filter((s) => s.key.startsWith('faucet-') && s.ok).map((s) => [s.key.slice(7), BigInt(s.after) - BigInt(s.before)]));
const payouts = {
  passer: log.steps.find((s) => s.key === 'balance-applicant')?.owed,
  owner: log.steps.find((s) => s.key === 'balance-owner')?.owed,
};
const out = {};
for (const [who, address] of Object.entries({ owner: log.accounts.owner, passer: log.accounts.passer, failer: log.accounts.failer })) {
  const mine = writes.filter((s) => s.from.toLowerCase() === address.toLowerCase());
  let fees = 0n;
  let messages = 0n;
  let sent = 0n;
  const rows = [];
  for (const s of mine) {
    const { fee, message } = await settled(s.hash);
    fees += fee;
    messages += message;
    sent += BigInt(s.value ?? 0);
    rows.push({ key: s.key, hash: s.hash, value: String(s.value ?? 0), net_fee: fee.toString(), message_fee_consumed: message.toString() });
  }
  const received = payouts[who] ? BigInt(payouts[who]) : 0n;
  const expected = (faucet[who] ?? 0n) + received - sent - fees;
  const actual = await balanceOf(address);
  // The External payout message's consumed budget is listed in the fee
  // accounting, but a payout to the sender itself has not been charged it on
  // either withdrawal measured. Both equations are recorded.
  const withoutMessage = expected + messages;
  out[who] = {
    address,
    faucet: (faucet[who] ?? 0n).toString(),
    received: received.toString(),
    sent: sent.toString(),
    fees: fees.toString(),
    expected: expected.toString(),
    actual: actual.toString(),
    exact: expected === actual,
    difference: (actual - expected).toString(),
    message_fee_consumed: messages.toString(),
    expected_without_message_fee: withoutMessage.toString(),
    exact_without_message_fee: withoutMessage === actual,
    transactions: rows,
  };
  console.log(`${who} ${address}: faucet ${faucet[who]} + received ${received} - sent ${sent} - fees ${fees} = ${expected}; balance ${actual}; ${expected === actual ? 'EXACT to the wei' : 'difference ' + (actual - expected) + ' wei'}; message fee consumed ${messages}; without it ${withoutMessage === actual ? 'EXACT' : 'off by ' + (actual - withoutMessage)}`);
}
log.reconciled = { at: new Date().toISOString(), ...out };
fs.writeFileSync(RECORD, JSON.stringify(record, null, 2) + '\n');
process.exit(Object.values(out).every((o) => o.exact || o.exact_without_message_fee) ? 0 : 1);
