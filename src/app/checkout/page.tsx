import type { Metadata } from 'next';
import { getAppServices } from '@/infra/db';
import { readCustomerSession } from '@/infra/auth/guards';
import { CheckoutForm } from '@/features/checkout/checkout-form';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your order with cash on delivery. No card or UPI details needed.',
  alternates: { canonical: '/checkout' },
};

export default async function CheckoutPage() {
  const services = await getAppServices();
  const session = await readCustomerSession();

  const [customer, addresses] = await Promise.all([
    session ? services.repos.customers.findById(session.sub) : Promise.resolve(null),
    session ? services.accounts.listAddresses(session.sub) : Promise.resolve([]),
  ]);

  return (
    <CheckoutForm
      addresses={addresses}
      customerName={customer?.name ?? null}
      customerPhone={customer?.phone ?? null}
    />
  );
}
