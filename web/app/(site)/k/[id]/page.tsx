import Link from 'next/link';
import { notFound } from 'next/navigation';

import { FundPanel } from '@/components/FundPanel';
import { Addr, ClaimRow, Empty, Ladder, ReadError } from '@/components/ui';
import { coversTop, day, gen, plural } from '@/lib/format';
import { getCard, listClaims, readError } from '@/lib/read';
import type { Card, Claim } from '@/lib/types';

export const revalidate = 20;

export async function generateMetadata(props: PageProps<'/k/[id]'>) {
  const { id } = await props.params;
  const k = await getCard(Number(id)).catch(() => null);
  return { title: k && k.found ? `${k.name} · card #${k.id}` : `Card #${id}` };
}

export default async function CardPage(props: PageProps<'/k/[id]'>) {
  const { id } = await props.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) notFound();
  let k: Card;
  let claims: Claim[] = [];
  try {
    const out = await getCard(n);
    if (!out.found) notFound();
    k = out;
    claims = (await listClaims(n, 0, 30)).items;
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_')) throw e;
    return (
      <div className="c-wrap py-14">
        <ReadError message={readError(e)} />
      </div>
    );
  }
  const now = Math.floor(Date.now() / 1000);
  return (
    <div className="c-wrap py-12">
      <p className="c-eyebrow">
        Card #{k.id} · opened {day(k.created_at)}
      </p>
      <h1 className="c-h1 mt-3" style={{ fontSize: 'clamp(30px, 4.4vw, 46px)' }}>
        {k.name}
      </h1>
      <p className="c-lead mt-4">
        Five example jobs and the price of each. Describe your work; validators place it on the ladder and the price on the card is paid.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link href={`/k/${k.id}/claim`} className="c-btn solid">
          Make a claim
        </Link>
      </div>

      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          [gen(k.pool), 'pool'],
          [`${coversTop(k.pool, k.prices)}`, `${k.cap}-priced claims it covers`],
          [k.counts.claims.toLocaleString('en-US'), 'claims'],
          [(k.counts.sized + k.counts.capped + k.counts.revised).toLocaleString('en-US'), 'priced'],
          [(k.counts.unsized + k.counts.vetoed).toLocaleString('en-US'), 'unsized or vetoed'],
        ].map(([v, l]) => (
          <div key={l} className="c-card pad">
            <p className="mono text-[22px]">{v}</p>
            <p className="c-eyebrow mt-1">{l}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <p className="c-eyebrow">The ladder</p>
          <div className="mt-3">
            <Ladder card={k} />
          </div>
          <p className="c-faint mono mt-2 text-[11.5px]">Fixed when the card opened · sha3-256 {k.digest.slice(0, 16)}…</p>
        </section>
        <aside className="flex flex-col gap-6">
          <section>
            <p className="c-eyebrow">The rules of this card</p>
            <dl className="c-kv mt-3">
              <div><dt>Cap tier</dt><dd>{k.cap}</dd></div>
              <div><dt>Review window</dt><dd>{plural(k.window_h, 'hour')}</dd></div>
              <div><dt>Appeal fee</dt><dd>{gen(k.appeal_fee)}</dd></div>
              <div><dt>Owner</dt><dd><Addr address={k.owner} /></dd></div>
              <div><dt>Funded in all</dt><dd>{gen(k.funded)}</dd></div>
              <div><dt>Paid out</dt><dd>{gen(k.paid)}</dd></div>
              <div><dt>Held for appeals</dt><dd>{gen(k.escrow)}</dd></div>
            </dl>
          </section>
          <FundPanel cardId={k.id} />
        </aside>
      </div>

      <section className="mt-12">
        <p className="c-eyebrow">Claims on this card, newest first</p>
        <div className="c-card mt-4 divide-y divide-[var(--line)]">
          {claims.length ? claims.map((c) => <ClaimRow key={c.id} c={c} now={now} />) : <div className="p-4">No claims yet.</div>}
        </div>
        {claims.length === 0 && (
          <div className="mt-4">
            <Empty>Be the first: describe the work you did and it will be sized against the ladder above.</Empty>
          </div>
        )}
      </section>
    </div>
  );
}
