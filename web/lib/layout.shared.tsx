import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2 font-semibold">
          <svg width={22} height={22} viewBox="106 106 300 300" aria-hidden>
            <rect x="106" y="106" width="300" height="300" rx="46" fill="#cbd5e1" />
            <rect x="147" y="324" width="34" height="36" rx="5" fill="#0f172a" />
            <rect x="193" y="288" width="34" height="72" rx="5" fill="#0f172a" />
            <rect x="239" y="252" width="34" height="108" rx="5" fill="#0f172a" />
            <rect x="285" y="216" width="34" height="144" rx="5" fill="#0f172a" />
            <rect x="331" y="180" width="34" height="180" rx="5" fill="#0f172a" />
          </svg>
          Ratecard
          <span className="c-pill ml-1" style={{ height: 22, fontSize: 10.5 }}>
            <span className="dot" />
            Studio Next
          </span>
        </span>
      ),
      url: '/',
    },
    links: [
      { text: 'Cards', url: '/#cards' },
      { text: 'Claims', url: '/#claims' },
      { text: 'For teams', url: '/#teams' },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
