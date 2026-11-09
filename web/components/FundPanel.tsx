'use client';

import { useState } from 'react';

import { toWei } from '@/lib/format';
import { refreshReads, send, type TxState } from '@/lib/write';

import { Tx } from './ui';
import { WalletGate, useWallet } from './Wallet';

/** Anyone may add to a card's pool; fund_card is open on purpose and records the funder. */
export function FundPanel({ cardId }: { cardId: number }) {
  const w = useWallet();
  const [amount, setAmount] = useState('10');
  const [tx, setTx] = useState<TxState>({ phase: 'idle' });
  const wei = toWei(amount);
  const busy = tx.phase === 'signing' || tx.phase === 'deciding';
  return (
    <section>
      <p className="c-eyebrow">Add to the pool</p>
      <div className="c-card pad mt-3">
        <p className="c-muted text-[13.5px]">Anyone can add to a pool. Sizing needs the pool to hold the cap price, so an empty pool keeps claims waiting.</p>
        <WalletGate action="fund this card">
          <div className="mt-3 flex items-end gap-2">
            <div className="flex-1">
              <label className="c-label" htmlFor="fund">GEN</label>
              <input id="fund" className="c-input mono" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <button
              className="c-btn solid"
              disabled={busy || wei === null || wei === 0n}
              onClick={async () => {
                const out = await send(w.account, 'fund_card', [cardId], wei ?? 0n, setTx);
                if (out.phase === 'done') {
                  await refreshReads(['cards', `card:${cardId}`]);
                  w.refreshBalance();
                }
              }}
            >
              {busy ? 'Funding…' : 'Fund'}
            </button>
          </div>
        </WalletGate>
        {tx.hash && <p className="mt-2"><Tx hash={tx.hash} /></p>}
        {tx.phase === 'done' && <p className="c-muted mt-2 text-[13.5px]">Added. Reload to see the new pool.</p>}
        {(tx.phase === 'refused' || tx.phase === 'error') && <p className="mt-2 text-[13.5px]" style={{ color: 'var(--danger)' }}>{tx.message}</p>}
      </div>
    </section>
  );
}
