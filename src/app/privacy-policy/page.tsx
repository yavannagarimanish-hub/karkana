import type { Metadata } from 'next';
import Link from 'next/link';
import { SITE } from '@/infra/config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'How Karkana collects, uses and protects your personal data under the Digital Personal Data Protection Act, 2023.',
  alternates: { canonical: '/privacy-policy' },
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

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-16">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-[11px] text-fg-dim">
        <Link href="/" className="transition-colors hover:text-fg">
          Home
        </Link>
        <span aria-hidden>/</span>
        <span className="font-mono tracking-[0.14em] text-fg-muted uppercase">Privacy Policy</span>
      </nav>

      <span className="numeric text-[11px] text-ember">[Legal]</span>
      <h1 className="mt-2 font-display text-3xl leading-tight font-bold text-fg sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-3 text-sm text-fg-muted">
        Effective {effectiveDate}. Written to comply with the Digital Personal Data Protection Act,
        2023 (DPDP Act) and the rules made under it.
      </p>

      <div className="mt-10">
        <Section index="01" title="Who we are">
          <p>
            {SITE.name} is the Data Fiduciary for the personal data described in this policy. We
            operate from {SITE.city} and sell crackers and pyrotechnic products for delivery within
            India on a cash-on-delivery basis.
          </p>
          <p>
            You can reach us at{' '}
            <a href={`mailto:${SITE.supportEmail}`} className="text-ember underline underline-offset-4">
              {SITE.supportEmail}
            </a>{' '}
            or on{' '}
            <a href={`tel:${SITE.supportPhone}`} className="numeric text-ember underline underline-offset-4">
              {SITE.supportPhone}
            </a>
            .
          </p>
        </Section>

        <Section index="02" title="The personal data we collect">
          <p>We collect only what is needed to take, fulfil and support an order:</p>
          <List
            items={[
              'Identity data: your name, and email address if you create an account.',
              'Contact data: mobile number and delivery address, including pincode.',
              'Order data: the products you order, quantities, and order history.',
              'Account data: a hashed password, saved addresses and your wishlist.',
              'Uploads: photographs you submit for personalized packaging.',
              'Technical data: IP address, device type and the pages you view.',
            ]}
          />
          <p>
            We do not collect payment card data. Orders are cash on delivery, so no card number or
            UPI credential ever reaches our systems.
          </p>
        </Section>

        <Section index="03" title="Why we process it, and our lawful basis">
          <p>
            We process personal data either on the basis of your consent, or as a legitimate use
            under Section 7 of the DPDP Act.
          </p>
          <List
            items={[
              'Consent: creating an account, saving addresses, adding to your wishlist, and uploading a personalization photograph.',
              'Legitimate use: taking and fulfilling an order you have placed, responding to a query you have raised, and complying with a legal obligation such as maintaining transaction records.',
            ]}
          />
          <p>
            Where we rely on consent, you can withdraw it at any time using the contact details
            above, or by deleting the relevant item from your account. Withdrawal does not affect
            processing that already happened, and we may still need to keep records to fulfil or
            evidence an existing order.
          </p>
        </Section>

        <Section index="04" title="Age restriction">
          <p>
            Our products are fireworks and pyrotechnics. Sale and use are restricted to adults, and
            you must be 18 or older to place an order.
          </p>
          <p>
            We do not knowingly collect personal data from anyone under 18, and we do not carry out
            behavioural monitoring or targeted advertising directed at children. If you believe a
            minor has submitted data to us, contact us and we will delete it.
          </p>
        </Section>

        <Section index="05" title="How long we keep it">
          <p>
            Order records are retained for the period required under applicable tax and commercial
            law, and for as long as needed to resolve disputes. Account data is kept until you
            delete your account or ask us to.
          </p>
          <p>
            Personalization photographs are kept only until your order is produced and delivered,
            unless you ask us to retain them for a repeat order.
          </p>
        </Section>

        <Section index="06" title="Who we share it with">
          <p>
            We do not sell your personal data. We share it only where it is necessary to fulfil your
            order, and only to the extent required:
          </p>
          <List
            items={[
              'Delivery personnel: your name, mobile number and address, for the purpose of completing delivery.',
              'Cloud and storage providers: who host this application and its database under contractual confidentiality obligations.',
              'Authorities: where we are required to disclose by law or a valid legal order.',
            ]}
          />
          <p>
            Our infrastructure is operated by providers who process data on our instructions. If any
            processing happens outside India, it will only be to jurisdictions permitted under the
            DPDP Act and the rules made under it.
          </p>
        </Section>

        <Section index="07" title="Your rights as a Data Principal">
          <p>Under the DPDP Act you have the right to:</p>
          <List
            items={[
              'Access a summary of the personal data we hold about you, and the identities of parties we have shared it with.',
              'Correct or complete inaccurate or misleading data.',
              'Erase data that is no longer necessary for the purpose it was collected for.',
              'Grievance redressal, through the contact point below.',
              'Nominate another individual to exercise these rights on your behalf, in the event of your death or incapacity.',
            ]}
          />
          <p>
            To exercise any of these rights, email{' '}
            <a href={`mailto:${SITE.supportEmail}`} className="text-ember underline underline-offset-4">
              {SITE.supportEmail}
            </a>{' '}
            from the email address on your account, or write to us quoting your order ID.
          </p>
        </Section>

        <Section index="08" title="Grievance redressal">
          <p>
            You can raise a grievance about how your personal data is handled by writing to{' '}
            <a href={`mailto:${SITE.supportEmail}`} className="text-ember underline underline-offset-4">
              {SITE.supportEmail}
            </a>
            . We will acknowledge it and respond within the timelines prescribed under the DPDP Act
            and the Consumer Protection (E-Commerce) Rules, 2020.
          </p>
          <p>
            If you are not satisfied with our response, you may approach the Data Protection Board of
            India.
          </p>
        </Section>

        <Section index="09" title="Security">
          <p>
            We apply reasonable technical safeguards proportionate to the data we hold: passwords are
            stored as salted, high-iteration hashes and never in plain text; session cookies are
            HTTP-only and transmitted over TLS; and access to the operator console is restricted to
            authenticated staff.
          </p>
          <p>
            No system is perfectly secure. If a personal data breach occurs that affects you, we
            will inform you and the Data Protection Board as required by law.
          </p>
        </Section>

        <Section index="10" title="Cookies and local storage">
          <p>
            We use two categories. A session cookie keeps you signed in. Browser local storage holds
            your cart so it survives a page refresh.
          </p>
          <p>
            We do not use third-party advertising cookies or cross-site tracking. Clearing cookies
            and site data in your browser will sign you out and empty your cart.
          </p>
        </Section>

        <Section index="11" title="Changes to this policy">
          <p>
            We may update this policy. Material changes will be reflected in the effective date at
            the top of this page, and we will seek fresh consent where the change requires it.
          </p>
        </Section>
      </div>

      <div className="mt-10 flex flex-wrap gap-4 border-t border-hairline pt-8 text-sm">
        <Link href="/terms" className="text-ember underline underline-offset-4">
          Terms and Conditions
        </Link>
        <Link href="/" className="text-fg-muted underline underline-offset-4 transition-colors hover:text-fg">
          Back to catalogue
        </Link>
      </div>
    </main>
  );
}
