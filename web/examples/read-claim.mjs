/**
 * Read a claim, no wallet and nothing signed.
 *
 *   node examples/read-claim.mjs <claim id>
 *
 * get_claim answers JSON text: the work, both readings, the tier paid, the pay in wei, and the claimant's balance.
 */
import { CONTRACT, readClient, retried } from '../lib/genlayer-core.mjs';

const [id] = process.argv.slice(2);
if (!id) {
  console.error('usage: node examples/read-claim.mjs <claim id>');
  process.exit(2);
}
const client = readClient();
const raw = await retried(() => client.readContract({ address: CONTRACT, functionName: 'get_claim', args: [Number(id)] }));
const claim = JSON.parse(String(raw));
console.log(JSON.stringify({ found: claim.found, status: claim.status, reading1: claim.reading1, reading2: claim.reading2, tier: claim.tier, pay: claim.pay, appealed: claim.appealed }));
