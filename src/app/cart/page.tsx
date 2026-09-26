import type { Metadata } from 'next';
import { CartView } from '@/features/cart/cart-view';

export const metadata: Metadata = {
  title: 'Your Cart',
  description: 'Review your cart. Every price is verified against the live catalogue before you pay.',
  alternates: { canonical: '/cart' },
};

export default function CartPage() {
  return <CartView />;
}
