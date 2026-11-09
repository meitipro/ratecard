import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ClaimActions } from '@/components/ClaimActions';
import { Addr, Ladder, ReadError, Result } from '@/components/ui';
import { dayTime, gen } from '@/lib/format';
import { getCard, getClaim, readError } from '@/lib/read';
import type { Card, Claim } from '@/lib/types';

export const revalidate = 20;

export async function generateMetadata(props: PageProps<'/c/[id]'>) {
  const { id } = await props.params;
  return { title: `Claim #${id}` };
}

function headline(c: Claim): string {
  if (c.status === 'OPEN') return 'In the review window.';
  if (c.status === 'APPEALED') return 'Read again.';
  if (c.status === 'VETOED') return 'Vetoed.';
  if (c.status === 'UNSIZED') return 'Nothing to compare.';
  if (c.status === 'REVISED') return 'Revised.';
  if (c.status === 'CAPPED') return 'Capped.';
  return 'Sized.';
}

export default async function ClaimPage(props: PageProps<'/c/[id]'>) {
  const { id } = await props.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) notFound();
  let c: Claim;
  let k: Card;
  try {
    const out = await getClaim(n);
    if (!out.found) notFound();
    c = out;
    const card = await getCard(c.card_id);
    if (!card.found) notFound();
    k = card;
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_')) throw e;
    return (
      <div className="c-wrap py-14">
        <ReadError message={readError(e)} />
      </div>
    );
  }
  const now = Math.floor(Date.now() / 1000);
  const marked = c.status === 'VETOED' || c.status === 'UNSIZED' ? '' : c.tier;
  const closest = marked ? k.anchors[['XS', 'S', 'M', 'L', 'XL'].indexOf(marked)] : '';
  return (
    <div className="c-wrap py-12">
      <p className="c-eyebrow">
        <Link href={`/k/${c.card_id}`} className="c-link">
          Card #{c.card_id} · {c.card}
        </Link>{' '}
        · claim {c.id}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <h1 className="c-h1" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
          {headline(c)}
        </h1>
        <Result claim={c} now={now} />
      </div>
      <p className="serif mt-5 max-w-[34em] text-[24px] leading-snug">&ldquo;{c.work}&rdquo;</p>
      <p className="c-faint mt-2 text-[13.5px]">
        by <Addr address={c.claimant} /> · filed {dayTime(c.claimed_at)} · review window {c.status === 'OPEN' && now < c.window_ends ? `closes ${dayTime(c.window_ends)}` : `passed ${dayTime(c.window_ends)}`}
        {c.status === 'VETOED' ? ' · vetoed' : c.sized_by ? ' · no veto' : ''}
      </p>

      <div className="mt-6">
        <ClaimActions
          claim={{
            id: c.id,
            card_id: c.card_id,
            status: c.status,
            window_ends: c.window_ends,
            claimant: c.claimant,
            owner: c.owner,
            appealed: c.appealed,
          }}
          appealFee={k.appeal_fee}
          pool={k.pool}
          capPrice={k.prices[['XS', 'S', 'M', 'L', 'XL'].indexOf(k.cap)]}
          balance={c.claimant_balance}
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <p className="c-eyebrow">The ladder, with this claim on it</p>
          <div className="mt-3">
            <Ladder card={k} on={marked} paid={c.pay !== '0' ? c.pay : undefined} />
          </div>
          {closest && (
            <div className="c-note mt-4">
              <p>
                <strong>Closest example:</strong> {closest}.
              </p>
            </div>
          )}
          <p className="c-faint mt-3 text-[12.5px]">
            The price comes from the card, never from the model: the validators answer one tier, and the contract looks up what that tier pays.
            {c.status === 'CAPPED' ? ` The claim read above the cap tier (${c.reading1}), so it pays the cap, ${k.cap}.` : ''}
          </p>
        </section>
        <aside>
          <p className="c-eyebrow">The record</p>
          <dl className="c-kv mt-3">
            <div><dt>First reading</dt><dd className="mono">{c.reading1 || '–'}</dd></div>
            {c.appealed && <div><dt>Second reading</dt><dd className="mono">{c.reading2 || 'waiting'}{c.reading2 ? ' (ladder reversed)' : ''}</dd></div>}
            <div><dt>Result</dt><dd>{c.tier ? `${c.status === 'CAPPED' ? 'capped at ' : ''}${c.tier}` : c.status}</dd></div>
            <div><dt>Pay</dt><dd>{gen(c.pay)}</dd></div>
            {c.appealed && <div><dt>Appeal fee</dt><dd>{gen(c.appeal_fee)}{c.fee_to ? `, ${c.fee_to === 'claimant' ? 'back to the claimant' : 'to the pool'}` : ', held'}</dd></div>}
            {c.sized_at > 0 && <div><dt>Sized</dt><dd>{dayTime(c.sized_at)}</dd></div>}
            {c.sized_by && <div><dt>Sized by</dt><dd><Addr address={c.sized_by} /></dd></div>}
            {c.vetoed_by && <div><dt>Vetoed by</dt><dd><Addr address={c.vetoed_by} /></dd></div>}
          </dl>
        </aside>
      </div>
    </div>
  );
}
