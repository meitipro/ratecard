import Link from 'next/link';

import { CardPreview, ClaimRow, Empty, ReadError } from '@/components/ui';
import { gen, plural } from '@/lib/format';
import { allCards, listClaims, readError } from '@/lib/read';
import type { Card, Claim } from '@/lib/types';

export const revalidate = 20;

const FAQ = [
  {
    q: 'Is it a vote?',
    a: 'No. Validators do not vote on what the work is worth. Each one compares the claim with the same five examples and answers one tier, and a size stands only when they agree. The price is then the one printed on the card.',
  },
  {
    q: 'Can the team veto a claim?',
    a: 'Yes, inside the card’s review window, once and for any reason. Ratecard sizes what is described and cannot see the work, so the window is where a team says no. After the window the claim is sized and paid.',
  },
  {
    q: 'What if I disagree with my size?',
    a: 'You can appeal once. It costs the card’s appeal fee and the claim is read again with the ladder shown largest first. The second reading replaces the first, and the fee comes back to you when the result changed.',
  },
  {
    q: 'Do the hours I worked count?',
    a: 'No. Size is scope and effort like the examples, not how long it took or how well it is written. The judge is told to ignore hours, and any claim about price.',
  },
  {
    q: 'Which network?',
    a: 'GenLayer Studio Next, chain 61997. Test GEN is free from the faucet in the site. Every write carries a small fee deposit, most of which is refunded when the transaction finalizes.',
  },
  {
    q: 'Who sets the price?',
    a: 'The team, when it opens the card. The model only chooses a tier; the contract looks the price up on the card and applies the cap. A tier above the cap pays the cap.',
  },
];

/** The hero card: a published card with claims, not an evaluation or smoke-test card. */
function pickHero(cards: Card[]): Card | undefined {
  const real = cards.filter((c) => !/eval|smoke|reviewer path/i.test(c.name));
  const pool = real.length ? real : cards;
  return [...pool].sort((a, b) => b.counts.claims - a.counts.claims)[0];
}

export default async function Landing() {
  let cards: Card[] = [];
  let claims: Claim[] = [];
  let error = '';
  try {
    cards = await allCards(12);
    claims = (await listClaims(0, 0, 24)).items;
  } catch (e) {
    error = readError(e);
  }
  const now = Math.floor(Date.now() / 1000);
  const hero = pickHero(cards);
  const real = claims.filter((c) => !/eval|smoke|reviewer path/i.test(c.card));
  const feed = (real.length >= 4 ? real : claims).slice(0, 4);

  return (
    <>
      <section className="c-wrap grid-cols-1 pb-16 pt-14 md:pt-20">
        <div className="c-grid-2">
          <div>
            <p className="c-eyebrow">Rate cards, sized on GenLayer</p>
            <h1 className="c-h1 mt-5">
              Price the work
              <br />
              <em>before anyone argues.</em>
            </h1>
            <p className="c-lead mt-6">
              A team writes five example jobs with prices. Contributors describe what they did. GenLayer validators place it on the
              ladder, and the price on the card is paid.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {hero ? (
                <Link href={`/k/${hero.id}/claim`} className="c-btn solid">
                  Make a claim
                </Link>
              ) : null}
              <Link href="/new" className="c-btn">
                Open a card
              </Link>
            </div>
            <p className="c-faint mt-5 text-[13.5px]">A team veto window comes before anything is paid. Reading needs no wallet.</p>
          </div>
          <div>{error ? <ReadError message={error} /> : hero ? <CardPreview k={hero} /> : <Empty>No cards on chain yet.</Empty>}</div>
        </div>
      </section>

      <section className="c-section" id="claims">
        <div className="c-wrap">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="c-eyebrow">Recent claims</p>
              <h2 className="c-h2 mt-2">Small, medium and unsized.</h2>
            </div>
            <p className="c-muted max-w-[30em] text-[14px]">
              The ladder is used at every level. Claims that fit no example stay on the front page as UNSIZED, with nothing paid.
            </p>
          </div>
          <div className="c-card mt-6 divide-y divide-[var(--line)]">
            {feed.length ? feed.map((c) => <ClaimRow key={c.id} c={c} now={now} />) : <div className="p-4">{error ? error : 'No claims yet.'}</div>}
          </div>
        </div>
      </section>

      <section className="c-section" id="cards">
        <div className="c-wrap">
          <p className="c-eyebrow">Cards</p>
          <h2 className="c-h2 mt-2">Every card on the contract.</h2>
          <div className="c-card mt-6 divide-y divide-[var(--line)]">
            {cards.length ? (
              cards.map((k) => (
                <Link key={k.id} href={`/k/${k.id}`} className="c-row-link px-4 py-3">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="mono c-faint text-[12px]">#{k.id}</span>
                    <span className="font-medium">{k.name}</span>
                    <span className="c-faint text-[13px]">
                      pool {gen(k.pool)} · cap {k.cap} · {plural(k.counts.claims, 'claim')}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-4">{error ? error : 'No cards yet.'}</div>
            )}
          </div>
        </div>
      </section>

      <section className="c-section" id="how">
        <div className="c-wrap">
          <p className="c-eyebrow">How it works</p>
          <h2 className="c-h2 mt-2">Open a card, claim, size, pay.</h2>
          <div className="c-steps mt-8">
            {[
              ['01', 'Open a card', 'Five example jobs from XS to XL, a price for each, a cap, a review window and a pool.'],
              ['02', 'Claim', 'Describe the work in your own words, at most 600 characters. The owner has a window to veto.'],
              ['03', 'Size', 'Validators compare the claim with the examples and answer one tier. Between two, the smaller.'],
              ['04', 'Pay', 'The price on the card is credited to your balance, and withdraw pays it.'],
            ].map(([n, t, d]) => (
              <div key={n}>
                <p className="mono c-faint text-[12px]">{n}</p>
                <p className="mt-2 text-[18px] font-semibold">{t}</p>
                <p className="c-muted mt-2 text-[14.5px] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="c-section" id="ladder">
        <div className="c-wrap c-grid-2">
          <div>
            <p className="c-eyebrow">Why a ladder</p>
            <h2 className="c-h2 mt-2">Comparing to examples beats a formula.</h2>
            <p className="c-muted mt-4 max-w-[34em] text-[15px] leading-relaxed">
              A formula that counts words or hours pays the people who write long claims and log many hours, and a vote is slow and
              open to friends. A person sizes a job by comparison, and a validator can do the same: is this closer to the S example
              or the M example?
            </p>
          </div>
          <div className="c-card overflow-hidden">
            <table className="c-table">
              <thead>
                <tr>
                  <th>Way to price work</th>
                  <th>Who wins</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Words or hours</td>
                  <td>whoever writes the longest claim</td>
                </tr>
                <tr>
                  <td>A vote</td>
                  <td>whoever has the most friends</td>
                </tr>
                <tr>
                  <td>A thread</td>
                  <td>whoever argues best</td>
                </tr>
                <tr>
                  <td>A ladder of examples</td>
                  <td>the work that is closest to an example</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="c-section" id="teams">
        <div className="c-wrap">
          <p className="c-eyebrow">For teams and DAOs</p>
          <h2 className="c-h2 mt-2">What the cap, the window and the veto protect.</h2>
          <div className="c-steps mt-8">
            {[
              ['The cap', 'A tier above the cap tier pays the cap and is marked CAPPED, so no claim can cost more than the card says.'],
              ['The window', 'Nothing is sized until the review window ends, and sizing needs the cap price in the pool, so a size is never given that cannot be paid.'],
              ['The veto', 'The owner can say no to a claim once, inside the window, for any reason. Ratecard sizes what is described; the veto is the check on whether it happened.'],
            ].map(([t, d]) => (
              <div key={t}>
                <p className="text-[17px] font-semibold">{t}</p>
                <p className="c-muted mt-2 text-[14.5px] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/new" className="c-btn solid">
              Open a card
            </Link>
            <Link href="/docs/quickstart" className="c-btn">
              Quickstart
            </Link>
          </div>
        </div>
      </section>

      <section className="c-section" id="faq">
        <div className="c-wrap">
          <p className="c-eyebrow">FAQ</p>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {FAQ.map((f) => (
              <div key={f.q}>
                <p className="font-semibold">{f.q}</p>
                <p className="c-muted mt-1.5 text-[14.5px] leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
