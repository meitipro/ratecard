'use client';

import Link from 'next/link';
import { useState } from 'react';

import { gen, plural } from '@/lib/format';
import type { Card } from '@/lib/types';
import { refreshReads, send, type TxState } from '@/lib/write';

import { Ladder, Tx } from './ui';
import { WalletGate, useWallet } from './Wallet';

const MAX_WORK = 600;

/** A text box, a try against the ladder, and the review window the claim enters. */
export function ClaimForm({ card }: { card: Card }) {
  const w = useWallet();
  const [work, setWork] = useState('');
  const [tx, setTx] = useState<TxState>({ phase: 'idle' });
  const [claimId, setClaimId] = useState(0);
  const [tryResult, setTryResult] = useState('');
  const busy = tx.phase === 'signing' || tx.phase === 'deciding';

  async function submit() {
    const out = await send(w.account, 'claim', [card.id, work.trim()], 0n, setTx);
    if (out.phase === 'done' && typeof out.returned === 'number') {
      setClaimId(out.returned);
      await refreshReads(['claims', 'cards', `card:${card.id}`]);
    }
  }

  async function preview() {
    setTryResult('Asking one model…');
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anchors: card.anchors, claim: work }),
      });
      const body = await response.json();
      setTryResult(response.ok ? `${body.label} (a preview from one model, never binding)` : body.error);
    } catch {
      setTryResult('The preview did not answer.');
    }
  }

  if (claimId > 0) {
    return (
      <div className="c-card pad">
        <span className="c-verdict yes">Claimed</span>
        <p className="serif mt-3 text-[22px]">Claim {claimId} is in the review window.</p>
        <p className="c-muted mt-2 text-[14.5px]">
          {card.window_h === 0
            ? 'This card has no review window, so the claim can be sized now.'
            : `The owner has ${plural(card.window_h, 'hour')} to veto it. After that anyone can size it, and the price on the card is credited to you.`}
        </p>
        <p className="mt-4 flex flex-wrap gap-3">
          <Link className="c-btn solid" href={`/c/${claimId}`}>Open the claim</Link>
        </p>
        {tx.hash && <p className="mt-3"><Tx hash={tx.hash} /></p>}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div>
        <label className="c-label" htmlFor="work">What did you do?</label>
        <textarea
          id="work"
          className="c-textarea"
          style={{ minHeight: 140 }}
          maxLength={MAX_WORK}
          value={work}
          onChange={(e) => setWork(e.target.value)}
          placeholder="Hosted four weekly calls with written notes."
        />
        <p className="c-faint mono mt-1 text-right text-[11.5px]">{work.length} / {MAX_WORK}</p>
        <p className="c-muted mt-2 text-[13.5px]">
          Say what the work was, not how hard it was. Validators size scope and effort like the examples, and ignore hours and any claim about price.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button className="c-btn small" onClick={preview} disabled={!work.trim()}>Test against the ladder</button>
          {tryResult && <span className="c-muted text-[13.5px]">{tryResult}</span>}
        </div>
        <div className="mt-6">
          <WalletGate action="make a claim">
            <button className="c-btn solid" onClick={submit} disabled={busy || !work.trim()}>
              {busy ? 'Submitting…' : 'Submit my claim'}
            </button>
          </WalletGate>
          {tx.phase === 'deciding' && <p className="c-muted mt-2 text-[13.5px]">Recording it… {tx.hash && <Tx hash={tx.hash} />}</p>}
          {(tx.phase === 'refused' || tx.phase === 'error') && <p className="mt-2 text-[13.5px]" style={{ color: 'var(--danger)' }}>{tx.message}</p>}
        </div>
      </div>
      <aside className="flex flex-col gap-4">
        <Ladder card={card} />
        <div className="c-card pad">
          <p className="c-eyebrow">What happens next</p>
          <dl className="c-kv mt-3">
            <div><dt>Review window</dt><dd>{card.window_h === 0 ? 'none' : plural(card.window_h, 'hour')}</dd></div>
            <div><dt>Cap tier</dt><dd>{card.cap}</dd></div>
            <div><dt>Appeal fee</dt><dd>{gen(card.appeal_fee)}</dd></div>
            <div><dt>Pool</dt><dd>{gen(card.pool)}</dd></div>
          </dl>
          <p className="c-faint mt-3 text-[12.5px]">A claim reserves nothing yet. Sizing waits for the window to end and for the pool to hold the cap price.</p>
        </div>
      </aside>
    </div>
  );
}
