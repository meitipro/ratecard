import Link from 'next/link';

import { WalletButton } from './Wallet';

/** The site's mark: a card with a ladder of five bars on a silver ground. The same drawing as docs/brand/ratecard-icon.svg. */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="106" y="106" width="300" height="300" rx="46" fill="#cbd5e1" />
      <rect x="147" y="324" width="34" height="36" rx="5" fill="#0f172a" />
      <rect x="193" y="288" width="34" height="72" rx="5" fill="#0f172a" />
      <rect x="239" y="252" width="34" height="108" rx="5" fill="#0f172a" />
      <rect x="285" y="216" width="34" height="144" rx="5" fill="#0f172a" />
      <rect x="331" y="180" width="34" height="180" rx="5" fill="#0f172a" />
    </svg>
  );
}

export function Nav() {
  return (
    <header className="c-nav">
      <div className="c-wrap c-nav-row">
        <Link href="/" className="c-brand" aria-label="Ratecard home">
          <Mark />
          Ratecard
        </Link>
        <nav className="c-links" aria-label="Main">
          <Link href="/#cards">Cards</Link>
          <Link href="/#claims">Claims</Link>
          <Link href="/#how">How it works</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="c-nav-right">
          <span className="c-pill hidden sm:inline-flex" title="GenLayer Studio Next, chain 61997">
            <span className="dot" />
            Studio Next
          </span>
          <WalletButton />
          <Link href="/new" className="c-btn small solid hidden sm:inline-flex">
            Open a card
          </Link>
        </div>
      </div>
    </header>
  );
}
