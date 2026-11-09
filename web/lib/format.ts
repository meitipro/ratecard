import type { Claim, Status, Tier } from './types';

const GEN = 10n ** 18n;

export const TIERS: Tier[] = ['XS', 'S', 'M', 'L', 'XL'];

/** Wei as GEN: 12 GEN, 0.5 GEN. Never through a float. */
export function gen(wei: string | bigint | number, unit = true): string {
  const value = BigInt(wei);
  const whole = value / GEN;
  const frac = value % GEN;
  let text = whole.toLocaleString('en-US');
  if (frac !== 0n) {
    const digits = frac.toString().padStart(18, '0').replace(/0+$/, '');
    text += '.' + digits.slice(0, 6);
  }
  return unit ? `${text} GEN` : text;
}

/** GEN typed by a person ("12", "0.5") to wei; null when it is not a number. */
export function toWei(text: string): bigint | null {
  const clean = text.trim();
  if (!/^\d+(\.\d{1,18})?$/.test(clean)) return null;
  const [whole, frac = ''] = clean.split('.');
  return BigInt(whole) * GEN + BigInt((frac + '0'.repeat(18)).slice(0, 18));
}

export function short(address: string, head = 6, tail = 4): string {
  if (!address) return '';
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function shortHash(hash: string): string {
  return hash ? `${hash.slice(0, 6)}…${hash.slice(-4)}` : '';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Chain seconds as "Nov 9, 2026", in UTC so server and browser agree. */
export function day(seconds: number): string {
  if (!seconds) return '';
  const d = new Date(seconds * 1000);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function dayTime(seconds: number): string {
  if (!seconds) return '';
  const d = new Date(seconds * 1000);
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${day(seconds)}, ${hh}:${mm} UTC`;
}

export function plural(n: number, one: string, many = one + 's'): string {
  return `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
}

/** What the page calls each state. OPEN splits into the review window and waiting for a size. */
export function statusText(c: Pick<Claim, 'status' | 'window_ends' | 'tier'>, nowSeconds: number): string {
  if (c.status === 'OPEN') return nowSeconds < c.window_ends ? 'IN REVIEW' : 'READY TO SIZE';
  if (c.status === 'APPEALED') return 'APPEALED';
  if (c.status === 'SIZED') return `SIZED · ${c.tier}`;
  if (c.status === 'CAPPED') return `CAPPED · ${c.tier}`;
  if (c.status === 'REVISED') return c.tier ? `REVISED · ${c.tier}` : 'REVISED · UNSIZED';
  return c.status;
}

/** Silver for sized, hatched for capped, grey for unsized, dotted for revised, struck through for vetoed. */
export const STATUS_CLASS: Record<Status, string> = {
  OPEN: '',
  APPEALED: '',
  VETOED: 'locked',
  SIZED: 'yes',
  CAPPED: 'retry',
  UNSIZED: '',
  REVISED: 'expired',
};

/** The index of a tier on the ladder, or -1. */
export function tierIndex(tier: string): number {
  return TIERS.indexOf(tier as Tier);
}

/** How many top-tier claims the pool covers. */
export function coversTop(pool: string, prices: string[]): number {
  const top = BigInt(prices[prices.length - 1] ?? '0');
  return top === 0n ? 0 : Number(BigInt(pool) / top);
}

/** The two anchors that sit closest together, by price ratio, as "S and M". */
export function closestPair(prices: string[]): string {
  let best = -1;
  let bestRatio = Number.POSITIVE_INFINITY;
  for (let i = 0; i + 1 < prices.length; i++) {
    const a = Number(BigInt(prices[i]) / 10n ** 12n) || 1;
    const b = Number(BigInt(prices[i + 1]) / 10n ** 12n) || 1;
    const ratio = b / a;
    if (ratio < bestRatio) {
      bestRatio = ratio;
      best = i;
    }
  }
  return best < 0 ? '' : `${TIERS[best]} and ${TIERS[best + 1]}`;
}
