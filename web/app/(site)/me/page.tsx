import { MePanel } from '@/components/MePanel';

export const metadata = { title: 'My claims' };

export default function MePage() {
  return (
    <div className="c-wrap py-12">
      <p className="c-eyebrow">Claims</p>
      <h1 className="c-h1 mt-3" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
        Your claims and your balance.
      </h1>
      <p className="c-lead mt-3">Claims by state, windows closing, the balance you can withdraw, and the claims waiting for your veto on cards you own.</p>
      <div className="mt-8">
        <MePanel />
      </div>
    </div>
  );
}
