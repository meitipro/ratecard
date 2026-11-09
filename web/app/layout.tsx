import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata, Viewport } from 'next';

import './global.css';

/*
 * Outfit, Geist Mono and Instrument Serif, loaded by the browser from Google
 * Fonts rather than downloaded at build time, so a build never depends on
 * reaching the font CDN.
 */
const FONTS =
  'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&family=Tektur:wght@400;500;600&family=Outfit:wght@400;500;600;700&display=swap';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ratecard-genlayer.vercel.app'),
  title: { default: 'Ratecard: price the work before anyone argues about it', template: '%s · Ratecard' },
  description:
    'A team writes a ladder of five example jobs with a price each and funds a pool. Contributors describe work they did, GenLayer validators place each claim on the ladder by comparing it with the examples, and the price on the card is paid.',
  openGraph: { siteName: 'Ratecard', type: 'website' },
};

export const viewport: Viewport = { themeColor: '#0b0b0e', colorScheme: 'dark' };

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider theme={{ forcedTheme: 'dark', defaultTheme: 'dark', enableSystem: false }}>{children}</RootProvider>
      </body>
    </html>
  );
}
