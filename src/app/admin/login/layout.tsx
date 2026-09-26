import type { Metadata } from 'next';

/**
 * `page.tsx` here is a client component, so it cannot export metadata. The
 * operator login is a private surface and must never be indexed.
 */
export const metadata: Metadata = {
  title: 'Operator sign in',
  description: 'Restricted area for Karkana staff.',
  robots: { index: false, follow: false },
};

export default function AdminLoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
