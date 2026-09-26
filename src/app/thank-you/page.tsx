import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/infra/config';

export const metadata: Metadata = {
  title: 'Thank you for your order',
  description: 'Your order has been placed. Pay cash on delivery when it arrives.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ order?: string }>;
}

export default async function ThankYouPage({ searchParams }: Props) {
  const { order } = await searchParams;
  const orderId = order && /^KRK-[A-Z0-9]{6}$/.test(order) ? order : null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-14 sm:px-8 sm:py-20">
      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto grid size-16 place-items-center rounded-full border border-ember/50 bg-ember-wash"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="size-8 text-ember"
          >
            <path d="m5 13 4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>

        <h1 className="mt-6 font-display text-3xl leading-tight font-bold text-fg sm:text-4xl">
          Thank you. Your order is in.
        </h1>

        {orderId ? (
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            Your order reference is{' '}
            <span className="numeric font-bold text-ember">{orderId}</span>. Keep it handy: you
            will need it to track the order or speak to us about it.
          </p>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">
            We have received your order and will confirm it shortly.
          </p>
        )}
      </div>

      <div className="mt-10 space-y-3">
        {orderId && (
          <Link
            href={`/order/${orderId}`}
            className="surface flex items-center justify-between gap-4 p-5 transition hover:border-ember/60"
          >
            <span>
              <span className="label block text-fg">Track this order</span>
              <span className="numeric mt-1 block text-sm text-fg-muted">{orderId}</span>
            </span>
            <span aria-hidden className="text-ember">
              &rarr;
            </span>
          </Link>
        )}

        <Link
          href="/"
          className="surface flex items-center justify-between gap-4 p-5 transition hover:border-ember/60"
        >
          <span>
            <span className="label block text-fg">Continue browsing</span>
            <span className="mt-1 block text-sm text-fg-muted">
              Back to the full catalogue
            </span>
          </span>
          <span aria-hidden className="text-ember">
            &rarr;
          </span>
        </Link>
      </div>

      <div className="mt-10 border-t border-hairline pt-8">
        <h2 className="label text-fg-dim">What happens next</h2>
        <ol className="mt-4 space-y-3 text-sm text-fg-muted">
          <li className="flex gap-3">
            <span className="numeric text-xs text-ember">01</span>
            We confirm your order and check stock at the workshop.
          </li>
          <li className="flex gap-3">
            <span className="numeric text-xs text-ember">02</span>
            Your order is packed and dispatched from {SITE.city}.
          </li>
          <li className="flex gap-3">
            <span className="numeric text-xs text-ember">03</span>
            <span>
              You pay <strong className="text-fg">cash on delivery</strong>. Please keep the exact
              amount ready. Our delivery personnel carry the order summary showing what is due.
            </span>
          </li>
        </ol>

        <p className="mt-6 text-xs leading-relaxed text-fg-dim">
          Need to change or cancel? Call{' '}
          <a href={`tel:${SITE.supportPhone}`} className="numeric text-ember underline underline-offset-4">
            {SITE.supportPhone}
          </a>{' '}
          before your order is dispatched, quoting your order reference. Cancellation before
          dispatch is free.
        </p>

        <p className="mt-4 text-xs leading-relaxed text-fg-dim">
          Please use these products responsibly. Adult supervision is required at all times, and
          you must be 18 or over. Full guidance is in our{' '}
          <Link href="/terms" className="text-fg-muted underline underline-offset-4 hover:text-fg">
            terms and conditions
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
