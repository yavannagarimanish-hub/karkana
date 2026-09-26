import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/infra/config';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description:
    'The terms governing orders, delivery, payment, returns and safe use of products purchased from Karkana.',
  alternates: { canonical: '/terms' },
};

export const dynamic = 'force-dynamic';

const effectiveDate = '27 September 2026';

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-hairline py-8 first:border-t-0 first:pt-0">
      <h2 className="flex items-baseline gap-3 text-lg font-bold text-fg">
        <span className="numeric text-xs text-ember">{index}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-fg-muted">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-ember" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[11px] text-fg-dim">
        <Link href="/" className="transition-colors hover:text-fg">
          Home
        </Link>
        <span aria-hidden>/</span>
        <span className="font-mono tracking-[0.14em] text-fg-muted uppercase">
          Terms and Conditions
        </span>
      </nav>

      <span className="numeric text-[11px] text-ember">[Legal]</span>
      <h1 className="mt-2 font-display text-3xl leading-tight font-bold text-fg sm:text-4xl">
        Terms and Conditions
      </h1>
      <p className="mt-3 text-sm text-fg-muted">
        Effective {effectiveDate}. By placing an order with {SITE.name} you agree to these terms.
      </p>

      <div className="mt-10">
        <Section index="01" title="About these terms">
          <p>
            These terms govern your use of this website and any order you place through it. They
            should be read alongside our{' '}
            <Link href="/privacy-policy" className="text-ember underline underline-offset-4">
              Privacy Policy
            </Link>
            .
          </p>
          <p>
            We may update these terms. The version in force is the one published on this page at the
            time you place your order.
          </p>
        </Section>

        <Section index="02" title="Eligibility and age restriction">
          <p>
            Our products are fireworks and pyrotechnics. <strong className="text-fg">You must be 18
            years or older to place an order.</strong> By ordering you confirm that you meet this
            requirement.
          </p>
          <p>
            We may ask for proof of age before dispatch, and we may refuse or cancel an order where
            we are unable to satisfy ourselves that the purchaser is an adult.
          </p>
        </Section>

        <Section index="03" title="Orders and acceptance">
          <p>
            Placing an order is an offer to buy. Your order is accepted, and a contract formed, only
            when we confirm it and move it to the confirmed stage.
          </p>
          <p>
            We may decline or cancel an order where a product is unavailable, where the delivery
            address is outside our serviceable area, where we cannot verify the purchaser, or where
            we reasonably suspect misuse.
          </p>
          <p>
            Prices shown are calculated on our servers at the time of your order. The total you see
            at checkout is the total you are charged.
          </p>
        </Section>

        <Section index="04" title="Pricing and payment">
          <p>
            All prices are in Indian Rupees and are inclusive of applicable taxes unless stated
            otherwise. We do not currently accept card or UPI payment online.
          </p>
          <p>
            <strong className="text-fg">Payment is cash on delivery.</strong> Please keep the exact
            amount ready. Our delivery personnel carry the order summary showing the amount due.
          </p>
          <p>
            Any shipping charge or personalization fee is shown separately at checkout before you
            confirm. There are no hidden charges added after you place the order.
          </p>
        </Section>

        <Section index="05" title="Delivery">
          <p>
            We dispatch direct from our workshop in {SITE.city}. Estimated delivery times are shown
            at checkout and are estimates, not guarantees.
          </p>
          <p>
            Please give an address where someone over 18 can receive the order. If a delivery cannot
            be completed because the address is incorrect or nobody is available, we will contact you
            to rearrange. Repeated failed deliveries may be cancelled.
          </p>
          <p>
            Delivery may be suspended or delayed during periods when the sale or transport of
            fireworks is restricted by local authority. If this affects your order we will tell you
            and refund or reschedule as appropriate.
          </p>
        </Section>

        <Section index="06" title="Cancellations and returns">
          <p>
            You may cancel an order at no cost any time before it is dispatched, by using the order
            page or by contacting us on{' '}
            <a href={`tel:${SITE.supportPhone}`} className="numeric text-ember underline underline-offset-4">
              {SITE.supportPhone}
            </a>
            .
          </p>
          <p>
            Because these are combustible goods, we cannot accept returns once an order has been
            delivered, except where the goods are damaged, incorrect or defective. In that case
            contact us within 48 hours of delivery with your order ID and photographs, and we will
            replace or refund.
          </p>
          <p>
            Personalized products are made to your specification using the photograph you supply.
            They cannot be returned unless they are faulty, since they cannot be resold. Please check
            your uploaded image carefully before confirming, as it is printed on the box exactly as
            supplied.
          </p>
        </Section>

        <Section index="07" title="Safe use">
          <p>
            These are explosives. You are responsible for using them safely and lawfully. As a
            minimum:
          </p>
          <List
            items={[
              'Adult supervision is required at all times. Never leave fireworks with children.',
              'Light outdoors, in an open area, away from buildings, vehicles, dry vegetation and overhead cables.',
              'Keep a bucket of water or sand nearby, and light one item at a time from arm\u2019s length.',
              'Never relight a dud. Wait, then douse it with water.',
              'Do not use while intoxicated, and do not throw or point a lit item at any person or animal.',
              'Store unlit items in a cool, dry place out of reach of children, and away from any flame.',
              'Observe local restrictions on timing, noise limits and permitted sale periods.',
            ]}
          />
          <p>
            We accept no liability for injury or damage caused by misuse, or by use that breaches
            these instructions or local law.
          </p>
        </Section>

        <Section index="08" title="Product information">
          <p>
            We take care that product names, descriptions, images and prices are accurate. Colours
            and packaging may vary slightly from the images shown, and manufacturers occasionally
            change packaging without notice.
          </p>
          <p>
            Where a listing contains a clear error, we may cancel the order and refund you rather
            than supply at an incorrect price.
          </p>
        </Section>

        <Section index="09" title="Your account">
          <p>
            You are responsible for keeping your password confidential and for activity under your
            account. Tell us promptly if you believe your account has been misused.
          </p>
          <p>
            You may close your account at any time by contacting us, which will delete your saved
            addresses and wishlist. Order records may be retained as required by law.
          </p>
        </Section>

        <Section index="10" title="Liability">
          <p>
            Our liability for any claim connected with an order is limited to the amount you paid
            for that order, except where the law does not allow such a limit.
          </p>
          <p>
            Nothing in these terms excludes liability for death or personal injury caused by our
            negligence, for fraud, or for anything else that cannot lawfully be excluded.
          </p>
        </Section>

        <Section index="11" title="Governing law and disputes">
          <p>
            These terms are governed by the laws of India. Subject to your statutory rights as a
            consumer, the courts at {SITE.city} have jurisdiction.
          </p>
          <p>
            Please contact us first. Most problems are resolved by talking to us on{' '}
            <a href={`tel:${SITE.supportPhone}`} className="numeric text-ember underline underline-offset-4">
              {SITE.supportPhone}
            </a>{' '}
            or at{' '}
            <a href={`mailto:${SITE.supportEmail}`} className="text-ember underline underline-offset-4">
              {SITE.supportEmail}
            </a>
            .
          </p>
        </Section>
      </div>

      <div className="mt-10 flex flex-wrap gap-4 border-t border-hairline pt-8 text-sm">
        <Link href="/privacy-policy" className="text-ember underline underline-offset-4">
          Privacy Policy
        </Link>
        <Link href="/" className="text-fg-muted underline underline-offset-4 transition-colors hover:text-fg">
          Back to catalogue
        </Link>
      </div>
    </main>
  );
}
