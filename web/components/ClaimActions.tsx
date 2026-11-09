'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { gen } from '@/lib/format';
import { refreshReads, send, type TxState } from '@/lib/write';

import { Tx } from './ui';
import { WalletGate, useWallet } from './Wallet';

type Props = {
  claim: { id: number; card_id: number; status: string; window_ends: number; claimant: string; owner: string; appealed: boolean };
  appealFee: string;
  pool: string;
  capPrice: string;
  balance: string;
};

/**
 * What a visitor can do to a claim: size it (anyone, after the window, once the
 * pool holds the cap price), veto it (the owner, inside the window), appeal its
 * size (the claimant, once), or withdraw what it paid. size is open on purpose
 * and the caller is recorded.
 */
export function ClaimActions({ claim, appealFee, pool, capPrice, balance }: Props) {
  const w = useWallet();
  const router = useRouter();
  const [tx, setTx] = useState<TxState>({ phase: 'idle' });
  const busy = tx.phase === 'signing' || tx.phase === 'deciding';
  const me = w.account.toLowerCase();
  const isOwner = me !== '' && me === claim.owner.toLowerCase();
  const isClaimant = me !== '' && me === claim.claimant.toLowerCase();
  const now = Math.floor(Date.now() / 1000);
  const inWindow = claim.status === 'OPEN' && now < claim.window_ends;
  const readyToSize = (claim.status === 'OPEN' && !inWindow) || claim.status === 'APPEALED';
  const poolShort = BigInt(pool) < BigInt(capPrice);
  const canAppeal = isClaimant && ['SIZED', 'CAPPED', 'UNSIZED'].includes(claim.status) && !claim.appealed;

  async function run(method: string, value = 0n) {
    const out = await send(w.account, method, method === 'withdraw' ? [] : [claim.id], value, setTx);
    if (out.phase === 'done') {
      await refreshReads(['claims', 'cards', `claim:${claim.id}`, `card:${claim.card_id}`]);
      w.refreshBalance();
      router.refresh();
    }
  }

  const blocks: React.ReactNode[] = [];

  if (inWindow) {
    blocks.push(
      <div key="window" className="c-card pad">
        <p className="text-[14.5px]">
          This claim is in the owner&apos;s review window. Nothing is sized until it ends, so the team can say no first.
        </p>
        {isOwner && (
          <button className="c-btn mt-3" onClick={() => run('veto')} disabled={busy}>
            {busy ? 'Vetoing…' : 'Veto this claim'}
          </button>
        )}
      </div>,
    );
  }

  if (readyToSize) {
    blocks.push(
      <div key="size" className="c-card pad">
        <p className="text-[14.5px]">
          {claim.status === 'APPEALED'
            ? 'The appeal fee is paid. The claim is read again with the ladder shown largest first, and the second reading replaces the first.'
            : 'The window has passed. Anyone may start the sizing; you will be recorded as the caller.'}
        </p>
        {poolShort ? (
          <p className="c-muted mt-2 text-[13.5px]">
            The pool ({gen(pool)}) is short of the cap price ({gen(capPrice)}). Sizing waits until someone funds the card.
          </p>
        ) : (
          <div className="mt-3">
            <WalletGate action="start the sizing">
              <button className="c-btn solid" onClick={() => run('size')} disabled={busy}>
                {busy ? 'Validators are sizing…' : claim.status === 'APPEALED' ? 'Read it again' : 'Size this claim'}
              </button>
            </WalletGate>
          </div>
        )}
      </div>,
    );
  }

  if (canAppeal) {
    blocks.push(
      <div key="appeal" className="c-card pad">
        <p className="c-eyebrow">Think it is bigger?</p>
        <p className="c-muted mt-1 text-[14px]">
          One appeal for {gen(appealFee)}. The claim is read again with the ladder reversed. If the result changes the fee comes back to you, otherwise it goes to the pool.
        </p>
        <button className="c-btn mt-3" onClick={() => run('appeal', BigInt(appealFee))} disabled={busy}>
          {busy ? 'Appealing…' : 'Appeal this size'}
        </button>
      </div>,
    );
  }

  if (isClaimant && balance !== '0') {
    blocks.push(
      <div key="withdraw" className="c-card pad">
        <p className="text-[14.5px]">
          You can withdraw <span className="mono">{gen(balance)}</span>.
        </p>
        <button className="c-btn solid mt-3" onClick={() => run('withdraw')} disabled={busy}>
          {busy ? 'Withdrawing…' : `Withdraw ${gen(balance)}`}
        </button>
      </div>,
    );
  }

  if (blocks.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      {blocks}
      {tx.hash && <p><Tx hash={tx.hash} /></p>}
      {(tx.phase === 'refused' || tx.phase === 'error') && <p className="text-[13.5px]" style={{ color: 'var(--danger)' }}>{tx.message}</p>}
    </div>
  );
}
