import { unstable_cache } from 'next/cache';

import { CONTRACT, readClient, retried } from './genlayer-core.mjs';
import type { Card, Claim, NotFound, Page, Totals } from './types';

/**
 * Reads happen on the server, cached for a short while under tags.
 *
 * Studio Next rate-limits each IP, and every visitor's page view would
 * otherwise spend the server's budget. Shared reads are cached for 20 seconds;
 * after a decided write the page POSTs /api/refresh, which expires the tags it
 * touched, so the person who wrote sees their own result at once.
 */

const client = readClient();
const REVALIDATE = 20;

async function view<T>(method: string, args: (number | string)[]): Promise<T> {
  const raw = await retried(() => client.readContract({ address: CONTRACT, functionName: method, args }), 3);
  return JSON.parse(String(raw)) as T;
}

export const tags = {
  cards: 'cards',
  claims: 'claims',
  card: (id: number) => `card:${id}`,
  claim: (id: number) => `claim:${id}`,
};

export function getCard(id: number): Promise<Card | NotFound> {
  return unstable_cache(() => view<Card | NotFound>('get_card', [id]), ['get_card', String(id)], {
    revalidate: REVALIDATE,
    tags: [tags.cards, tags.card(id)],
  })();
}

export function getClaim(id: number): Promise<Claim | NotFound> {
  return unstable_cache(() => view<Claim | NotFound>('get_claim', [id]), ['get_claim', String(id)], {
    revalidate: REVALIDATE,
    tags: [tags.claims, tags.claim(id)],
  })();
}

export function listClaims(cardId: number, offset = 0, limit = 20): Promise<Page<Claim>> {
  const key = ['list_claims', String(cardId), String(offset), String(limit)];
  return unstable_cache(() => view<Page<Claim>>('list_claims', [cardId, offset, limit]), key, {
    revalidate: REVALIDATE,
    tags: cardId === 0 ? [tags.claims] : [tags.claims, tags.card(cardId)],
  })();
}

/** The contract's own totals: card 0 is not a card, it answers the counts. */
export async function getTotals(): Promise<Totals> {
  const out = await getCard(0);
  return out.totals ?? { cards: 0, claims: 0 };
}

/** Cards newest first. The contract has no list view for cards, so this reads card by card; the cache keeps it to one pass per 20 seconds. */
export async function allCards(limit = 12): Promise<Card[]> {
  const { cards } = await getTotals();
  const out: Card[] = [];
  for (let id = cards; id >= 1 && out.length < limit; id--) {
    const c = await getCard(id);
    if (c.found) out.push(c);
  }
  return out;
}

/** A read failed: say so in one sentence rather than failing the page. */
export function readError(error: unknown): string {
  const text = String((error as Error)?.message ?? error);
  if (/-32029|rate limit/i.test(text)) return 'Studio Next is rate limiting reads right now. Wait a minute and reload.';
  return 'Studio Next did not answer this read. Reload in a moment.';
}
