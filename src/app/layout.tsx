import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { CartProvider } from '@/features/cart/cart-provider';
import { FloatingCartBar } from '@/features/cart/floating-cart-bar';
import { SiteHeader } from '@/app/_shell/site-header';
import { SiteFooter } from '@/app/_shell/site-footer';
import { MobileTabBar } from '@/features/shell/mobile-tab-bar';
import { SITE } from '@/infra/config';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} | ${SITE.tagline}`,
    template: `%s | ${SITE.name}`,
  },
  description: `Buy crackers online from ${SITE.name}, an independent pyrotechnic workshop. Basic, customized and personalized fireworks with cash on delivery across India.`,
  applicationName: SITE.name,
  keywords: [
    'crackers online',
    'buy fireworks India',
    'Hyderabad crackers',
    'personalized crackers',
    'Diwali crackers online',
    'cash on delivery fireworks',
    SITE.name,
  ],
  // Canonicals are declared per page. A root default would point every product
  // and category page back at the homepage and collapse them in search.
  openGraph: {
    title: `${SITE.name} | ${SITE.tagline}`,
    description: `Basic, customized and personalized crackers dispatched direct from the workshop with cash on delivery.`,
    url: SITE.url,
    siteName: SITE.name,
    locale: 'en_IN',
    type: 'website',
    images: [{ url: '/og.png', width: 1774, height: 887, alt: `${SITE.name} ${SITE.tagline}` }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE.name} | ${SITE.tagline}`,
    description: `Basic, customized and personalized crackers with cash on delivery.`,
    images: ['/og.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
  },
  category: 'shopping',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
  colorScheme: 'dark',
};

/**
 * The shell renders live catalogue counts and the session-backed account name,
 * so nothing under it may be baked at build time.
 */
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-dvh flex-col bg-void text-fg antialiased">
        <CartProvider>
          <SiteHeader />
          <main id="main" className="flex-1 pb-16 lg:pb-0">
            {children}
          </main>
          <SiteFooter className="mb-16 lg:mb-0" />
          <FloatingCartBar />
          <MobileTabBar />
        </CartProvider>
      </body>
    </html>
  );
}
