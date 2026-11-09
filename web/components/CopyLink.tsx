'use client';

import { useState } from 'react';

export function CopyLink() {
  const [done, setDone] = useState(false);
  return (
    <button
      className="c-btn small"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked; the address bar still has it */
        }
      }}
    >
      {done ? 'Copied' : 'Copy link'}
    </button>
  );
}
