import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ClaimForm } from '@/components/ClaimForm';
import { ReadError } from '@/components/ui';
import { getCard, readError } from '@/lib/read';
import type { Card } from '@/lib/types';

export const metadata = { title: 'Make a claim' };

export default async function ClaimPage(props: PageProps<'/k/[id]/claim'>) {
  const { id } = await props.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) notFound();
  let k: Card;
  try {
    const out = await getCard(n);
    if (!out.found) notFound();
    k = out;
  } catch (e) {
    if ((e as { digest?: string })?.digest?.startsWith('NEXT_')) throw e;
    return (
      <div className="c-wrap py-14">
        <ReadError message={readError(e)} />
      </div>
    );
  }
  return (
    <div className="c-wrap py-12">
      <p className="c-eyebrow">
        <Link href={`/k/${k.id}`} className="c-link">Card #{k.id} · {k.name}</Link> · claim
      </p>
      <h1 className="c-h1 mt-3" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
        Describe the work you did.
      </h1>
      <div className="mt-8">
        <ClaimForm card={k} />
      </div>
    </div>
  );
}
