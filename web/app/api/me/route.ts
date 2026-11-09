import { NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { listClaims, readError } from '@/lib/read';
import type { Claim } from '@/lib/types';

/**
 * Everything one address has: the claims it filed, with its balance, and the
 * claims on cards it owns that are still inside the review window, which is
 * where it can veto. The contract has no per-address list, so this reads the
 * newest claims through the cached reads and filters.
 */
export async function GET(request: Request) {
  const address = String(new URL(request.url).searchParams.get('address') ?? '').toLowerCase();
  if (!isAddress(address, { strict: false })) return NextResponse.json({ error: 'Send a wallet address.' }, { status: 400 });
  try {
    const items: Claim[] = [];
    for (let offset = 0; offset < 150; offset += 50) {
      const page = await listClaims(0, offset, 50);
      items.push(...page.items);
      if (offset + 50 >= page.total) break;
    }
    const mine = items.filter((c) => c.claimant.toLowerCase() === address);
    const now = Math.floor(Date.now() / 1000);
    const toReview = items.filter((c) => c.owner.toLowerCase() === address && c.status === 'OPEN' && now < c.window_ends);
    const pick = (c: (typeof items)[number]) => ({
      id: c.id,
      card_id: c.card_id,
      card: c.card,
      work: c.work,
      status: c.status,
      window_ends: c.window_ends,
      tier: c.tier,
      pay: c.pay,
      claimant: c.claimant,
      owner: c.owner,
    });
    return NextResponse.json({
      address,
      balance: mine[0]?.claimant_balance ?? '0',
      withdrawn: '0',
      mine: mine.map(pick),
      toReview: toReview.map(pick),
    });
  } catch (error) {
    return NextResponse.json({ error: readError(error) }, { status: 502 });
  }
}
