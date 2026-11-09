'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { STATUS_CLASS, dayTime, gen, statusText } from '@/lib/format';
import type { Claim } from '@/lib/types';
import { refreshReads, send, type TxState } from '@/lib/write';

import { Tx } from './ui';
import { WalletGate, useWallet } from './Wallet';

type Row = Pick<Claim, 'id' | 'card_id' | 'card' | 'work' | 'status' | 'window_ends' | 'tier' | 'pay' | 'claimant' | 'owner'>;
type Me = { address: string; balance: string; withdrawn: string; mine: Row[]; toReview: Row[] };

function Line({ c, now }: { c: Row; now: number }) {
  return (
    <Link href={`/c/${c.id}`} className="c-row-link flex flex-wrap items-center gap-3 px-4 py-3">
      <span className={`c-verdict ${STATUS_CLASS[c.status]}`.trim()}>{statusText(c, now)}</span>
      <span className="text-[14.5px]">{c.work.length > 70 ? c.work.slice(0, 67) + '…' : c.work}</span>
      <span className="c-faint text-[13px]">
        {c.card}
        {c.status === 'OPEN' && now < c.window_ends ? ` · window closes ${dayTime(c.window_ends)}` : c.pay !== '0' ? ` · ${gen(c.pay)}` : ''}
      </span>
      <span className="c-faint mono ml-auto text-[11.5px]">#{c.id}</span>
    </Link>
  );
}

export function MePanel() {
  const w = useWallet();
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState('');
  const [tx, setTx] = useState<TxState>({ phase: 'idle' });

  const load = useCallback(async () => {
    if (!w.account) return;
    try {
      const response = await fetch(`/api/me?address=${w.account}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'The chain did not answer.');
      setMe(body);
      setError('');
    } catch (e) {
      setError(String((e as Error).message ?? e));
    }
  }, [w.account]);

  useEffect(() => {
    setMe(null);
    load();
  }, [load]);

  const busy = tx.phase === 'signing' || tx.phase === 'deciding';
  const now = Math.floor(Date.now() / 1000);

  async function withdraw() {
    const out = await send(w.account, 'withdraw', [], 0n, setTx);
    if (out.phase === 'done') {
      await refreshReads(['claims', 'cards', ...(me?.mine ?? []).map((c) => `claim:${c.id}`)]);
      await load();
      w.refreshBalance();
    }
  }

  return (
    <WalletGate action="see your claims">
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      {!me && !error && <p className="c-muted flex items-center gap-2"><span className="c-spin" /> Reading your claims…</p>}
      {me && (
        <div className="flex flex-col gap-8">
          <div className="c-card pad flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="c-eyebrow">Balance you can withdraw</p>
              <p className="mono mt-1 text-[28px]">{gen(me.balance)}</p>
              <p className="c-faint mt-1 text-[12.5px]">Prices credited to you, and appeal fees that came back. Already withdrawn: {gen(me.withdrawn)}.</p>
            </div>
            <div>
              <button className="c-btn solid" onClick={withdraw} disabled={busy || me.balance === '0'}>
                {busy ? 'Withdrawing…' : 'Withdraw'}
              </button>
              {tx.hash && <p className="mt-2"><Tx hash={tx.hash} /></p>}
              {tx.phase === 'done' && <p className="c-muted mt-1 text-[13px]">Paid at finality.</p>}
              {(tx.phase === 'refused' || tx.phase === 'error') && <p className="mt-1 text-[13px]" style={{ color: 'var(--danger)' }}>{tx.message}</p>}
            </div>
          </div>

          {me.toReview.length > 0 && (
            <section>
              <p className="c-eyebrow">Waiting for your veto, on cards you own</p>
              <div className="c-card mt-3 divide-y divide-[var(--line)]">{me.toReview.map((c) => <Line key={c.id} c={c} now={now} />)}</div>
            </section>
          )}

          <section>
            <p className="c-eyebrow">Your claims</p>
            {me.mine.length === 0 ? (
              <div className="c-note mt-3">No claims from this address yet. <Link className="c-link" href="/#cards">Find a card.</Link></div>
            ) : (
              <div className="c-card mt-3 divide-y divide-[var(--line)]">{me.mine.map((c) => <Line key={c.id} c={c} now={now} />)}</div>
            )}
          </section>
        </div>
      )}
    </WalletGate>
  );
}
