import Link from 'next/link';

import { DEPLOYMENT } from '@/lib/genlayer-core.mjs';
import { STATUS_CLASS, TIERS, gen, short, shortHash, statusText } from '@/lib/format';
import type { Card, Claim } from '@/lib/types';

export const EXPLORER = DEPLOYMENT.explorer as string;
export const CONTRACT = DEPLOYMENT.ratecard as string;

export function txUrl(hash: string): string {
  return `${EXPLORER}/tx/${hash}`;
}

export function addressUrl(address: string): string {
  return `${EXPLORER}/address/${address}`;
}

/** Silver for sized, hatched for capped, grey for unsized, dotted for revised, struck through for vetoed. */
export function Result({ claim, now }: { claim: Pick<Claim, 'status' | 'window_ends' | 'tier'>; now: number }) {
  return <span className={`c-verdict ${STATUS_CLASS[claim.status]}`.trim()}>{statusText(claim, now)}</span>;
}

export function Tx({ hash, label }: { hash: string; label?: string }) {
  if (!hash) return null;
  return (
    <a className="c-link mono text-[12.5px]" href={txUrl(hash)} target="_blank" rel="noreferrer">
      {label ? `${label} ` : ''}
      {shortHash(hash)} ↗
    </a>
  );
}

export function Addr({ address }: { address: string }) {
  if (!address) return null;
  return (
    <a className="c-link mono text-[12.5px]" href={addressUrl(address)} target="_blank" rel="noreferrer" title={address}>
      {short(address)}
    </a>
  );
}

/** The five anchors with their prices, and optionally the tier a claim landed on. */
export function Ladder({ card, on, paid }: { card: Pick<Card, 'anchors' | 'prices' | 'cap'>; on?: string; paid?: string }) {
  return (
    <div className="c-card overflow-hidden">
      {TIERS.map((tier, i) => (
        <div key={tier} className={`c-ladder-row${on === tier ? ' on' : ''}`}>
          <span className={`c-tier${on === tier ? ' on' : ''}`}>{tier}</span>
          <p className="flex-1 text-[15px]">
            {card.anchors[i]}
            {card.cap === tier && <span className="c-faint mono ml-2 text-[11px]">CAP</span>}
          </p>
          <span className="mono text-[14px]">{gen(card.prices[i])}</span>
          {on === tier && paid && <span className="c-verdict yes">{gen(paid)} paid</span>}
        </div>
      ))}
    </div>
  );
}

/** One row of the recent-claims feed: the result, the card, the claim's first words, what it paid. */
export function ClaimRow({ c, now }: { c: Claim; now: number }) {
  return (
    <Link href={`/c/${c.id}`} className="c-row-link px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Result claim={c} now={now} />
        <span className="font-medium">{c.work.length > 70 ? c.work.slice(0, 67) + '…' : c.work}</span>
        <span className="c-faint text-[13px]">
          {c.card} · {c.pay !== '0' ? gen(c.pay) : c.status === 'UNSIZED' ? 'nothing to compare' : ''}
        </span>
        <span className="c-faint mono text-[11.5px]">claim #{c.id}</span>
      </div>
    </Link>
  );
}

/** The live ladder card on the landing page: a real card, read from the contract. */
export function CardPreview({ k }: { k: Card }) {
  return (
    <Link href={`/k/${k.id}`} className="c-card block p-5 transition-colors hover:border-[var(--line-strong)]">
      <div className="flex items-start justify-between gap-3">
        <p className="c-eyebrow">
          Card #{k.id} · {k.name}
        </p>
        <span className="c-verdict yes">Open</span>
      </div>
      <p className="c-faint mono mt-2 text-[12.5px]">
        pool {gen(k.pool)} · cap {k.cap} · review {k.window_h} h · appeal {gen(k.appeal_fee)}
      </p>
      <div className="mt-4">
        {TIERS.map((tier, i) => (
          <div key={tier} className="flex items-center gap-3 border-t border-[var(--line)] py-2 first:border-t-0">
            <span className="c-tier">{tier}</span>
            <span className="flex-1 text-[14.5px]">{k.anchors[i]}</span>
            <span className="mono text-[13px]">{gen(k.prices[i])}</span>
          </div>
        ))}
      </div>
      <p className="c-faint mt-3 text-[13px]">
        {k.counts.claims.toLocaleString('en-US')} claims · {k.counts.sized + k.counts.capped + k.counts.revised} priced · {k.counts.unsized} unsized
      </p>
    </Link>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="c-note">{children}</div>;
}

export function ReadError({ message }: { message: string }) {
  return (
    <div className="c-card pad">
      <p className="font-medium">The chain did not answer.</p>
      <p className="c-muted mt-1 text-[14px]">{message}</p>
    </div>
  );
}
