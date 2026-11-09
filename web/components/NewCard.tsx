'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { TIERS, closestPair, coversTop, gen, toWei } from '@/lib/format';
import { refreshReads, send, type TxState } from '@/lib/write';

import { Tx } from './ui';
import { WalletGate, useWallet } from './Wallet';

const MAX_PRICE = 100000n * 10n ** 18n;

export function NewCard() {
  const w = useWallet();
  const [name, setName] = useState('');
  const [anchors, setAnchors] = useState(['', '', '', '', '']);
  const [prices, setPrices] = useState(['2', '5', '12', '30', '80']);
  const [cap, setCap] = useState('XL');
  const [windowH, setWindowH] = useState(24);
  const [fee, setFee] = useState('1');
  const [pool, setPool] = useState('340');
  const [tx, setTx] = useState<TxState>({ phase: 'idle' });
  const [cardId, setCardId] = useState(0);
  const [tryWork, setTryWork] = useState('');
  const [tryResult, setTryResult] = useState('');

  const wei = prices.map((p) => toWei(p));
  const feeWei = toWei(fee);
  const poolWei = toWei(pool);

  const health = useMemo(() => {
    const valid = wei.every((p) => p !== null && p > 0n && p <= MAX_PRICE);
    const rising = valid && wei.every((p, i) => i === 0 || (p as bigint) >= (wei[i - 1] as bigint));
    const asStrings = valid ? wei.map((p) => (p as bigint).toString()) : [];
    return {
      rising,
      covers: valid && poolWei !== null ? coversTop((poolWei as bigint).toString(), asStrings) : 0,
      closest: valid ? closestPair(asStrings) : '',
    };
  }, [wei, poolWei]);

  const problems: string[] = [];
  if (!name.trim()) problems.push('Name the card.');
  if (anchors.some((a) => !a.trim())) problems.push('Write all five example jobs, XS to XL.');
  if (anchors.some((a) => a.length > 200)) problems.push('An example job is over 200 characters.');
  if (wei.some((p) => p === null || p <= 0n)) problems.push('Every tier needs a price in GEN above zero.');
  else if (!health.rising) problems.push('Prices must not fall as the tier rises.');
  if (feeWei === null) problems.push('The appeal fee is a number of GEN, such as 1 or 0.5.');
  if (poolWei === null) problems.push('The first funding is a number of GEN, or 0.');
  const ready = problems.length === 0;
  const busy = tx.phase === 'signing' || tx.phase === 'deciding';

  async function open() {
    const out = await send(
      w.account,
      'open_card',
      [
        name.trim(),
        JSON.stringify(anchors.map((a) => a.trim())),
        JSON.stringify(wei.map((p) => (p as bigint).toString())),
        cap,
        windowH,
        feeWei ?? 0n,
      ],
      poolWei ?? 0n,
      setTx,
    );
    if (out.phase === 'done' && typeof out.returned === 'number') {
      setCardId(out.returned);
      await refreshReads(['cards', `card:${out.returned}`]);
    }
  }

  async function tryClaim() {
    setTryResult('Asking one model…');
    try {
      const response = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anchors, claim: tryWork }),
      });
      const body = await response.json();
      setTryResult(response.ok ? `${body.label} (a preview from one model, never binding)` : body.error);
    } catch {
      setTryResult('The preview did not answer.');
    }
  }

  if (cardId > 0) {
    return (
      <div className="c-card pad">
        <span className="c-verdict yes">Open</span>
        <p className="serif mt-3 text-[24px]">Card {cardId} is open.</p>
        <p className="c-muted mt-2 text-[14.5px]">Anchors and prices are fixed now. Share the link so contributors can read the card before they start.</p>
        <p className="mt-4 flex flex-wrap gap-3">
          <Link className="c-btn solid" href={`/k/${cardId}`}>Open the card page</Link>
          <Link className="c-btn" href={`/k/${cardId}/claim`}>Make the first claim</Link>
        </p>
        {tx.hash && <p className="mt-3"><Tx hash={tx.hash} /></p>}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-6">
        <div>
          <label className="c-label" htmlFor="name">Card name</label>
          <input id="name" className="c-input" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="Kiln contributors" />
        </div>
        <div>
          <p className="c-label">Anchors, smallest to largest, each with its price</p>
          <div className="c-card divide-y divide-[var(--line)]">
            {TIERS.map((tier, i) => (
              <div key={tier} className="flex items-center gap-3 px-3 py-2">
                <span className="c-tier">{tier}</span>
                <input
                  className="c-input"
                  maxLength={200}
                  aria-label={`${tier} example job`}
                  value={anchors[i]}
                  onChange={(e) => setAnchors(anchors.map((a, j) => (j === i ? e.target.value.replace(/\n/g, ' ') : a)))}
                  placeholder={['Answer five questions in #help', 'Write a 300 word how-to', 'Run a weekly community call with notes', 'Build and ship a small tool the team uses', 'Organise a two day hackathon with 40 people'][i]}
                />
                <input
                  className="c-input mono"
                  style={{ maxWidth: 96 }}
                  aria-label={`${tier} price in GEN`}
                  value={prices[i]}
                  onChange={(e) => setPrices(prices.map((p, j) => (j === i ? e.target.value : p)))}
                />
              </div>
            ))}
          </div>
          <p className="c-faint mt-2 text-[12.5px]">Short plain descriptions of real past work. Anchors and prices cannot change once the card opens.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="c-label" htmlFor="cap">Cap tier</label>
            <select id="cap" className="c-select" value={cap} onChange={(e) => setCap(e.target.value)}>
              {TIERS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="c-label" htmlFor="window">Review window</label>
            <select id="window" className="c-select" value={windowH} onChange={(e) => setWindowH(Number(e.target.value))}>
              {[0, 1, 6, 12, 24, 48, 72].map((h) => <option key={h} value={h}>{h === 0 ? 'none' : `${h} hours`}</option>)}
            </select>
          </div>
          <div>
            <label className="c-label" htmlFor="fee">Appeal fee (GEN)</label>
            <input id="fee" className="c-input mono" value={fee} onChange={(e) => setFee(e.target.value)} />
          </div>
          <div>
            <label className="c-label" htmlFor="pool">First funding (GEN)</label>
            <input id="pool" className="c-input mono" value={pool} onChange={(e) => setPool(e.target.value)} />
          </div>
        </div>
        {problems.length > 0 && <ul className="c-faint list-disc pl-5 text-[13.5px]">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
        <WalletGate action="open a card">
          <div>
            <button className="c-btn solid" onClick={open} disabled={!ready || busy}>
              {busy ? 'Opening…' : 'Open the card'}
            </button>
            <p className="c-faint mt-2 text-[12.5px]">Network fee estimated by your wallet. Read your ladder aloud first: it cannot change once the card opens.</p>
            {tx.phase === 'deciding' && <p className="c-muted mt-2 text-[13.5px]">Recording it… {tx.hash && <Tx hash={tx.hash} />}</p>}
            {(tx.phase === 'refused' || tx.phase === 'error') && <p className="mt-2 text-[13.5px]" style={{ color: 'var(--danger)' }}>{tx.message}</p>}
          </div>
        </WalletGate>
      </div>

      <aside className="flex flex-col gap-4">
        <div className="c-card pad">
          <p className="c-eyebrow">Try a claim</p>
          <p className="c-faint mt-1 text-[12.5px]">One model, a preview only, not binding. It lets you fix a muddy ladder before money is in.</p>
          <textarea className="c-textarea mt-3" style={{ minHeight: 80 }} maxLength={600} value={tryWork} onChange={(e) => setTryWork(e.target.value)} placeholder="Shipped a bot the team uses every day" />
          <button className="c-btn small mt-2" onClick={tryClaim} disabled={!tryWork.trim() || anchors.some((a) => !a.trim())}>Place it on the ladder</button>
          {tryResult && <p className="c-muted mt-2 text-[13.5px]">{tryResult}</p>}
        </div>
        <div className="c-card pad">
          <p className="c-eyebrow">Card health</p>
          <dl className="c-kv mt-3">
            <div><dt>Prices rise with tier</dt><dd>{health.rising ? 'yes' : 'no'}</dd></div>
            <div><dt>Pool covers</dt><dd>{health.covers} {cap}-priced claims</dd></div>
            <div><dt>Closest two anchors</dt><dd>{health.closest || '–'}</dd></div>
          </dl>
          <p className="c-faint mt-3 text-[12.5px]">Counts from the browser. The validators do the sizing. {poolWei !== null && poolWei > 0n ? `First funding ${gen(poolWei)}.` : ''}</p>
        </div>
      </aside>
    </div>
  );
}
