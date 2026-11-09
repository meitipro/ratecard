import { NewCard } from '@/components/NewCard';

export const metadata = { title: 'Open a card' };

export default function NewPage() {
  return (
    <div className="c-wrap py-12">
      <p className="c-eyebrow">For teams and DAOs</p>
      <h1 className="c-h1 mt-3" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
        Open a card.
      </h1>
      <p className="c-lead mt-3">Five example jobs, five prices, a cap, a review window and a funded pool. Every claim is sized against this ladder.</p>
      <div className="mt-8">
        <NewCard />
      </div>
    </div>
  );
}
