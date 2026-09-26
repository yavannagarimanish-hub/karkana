import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/features/account/auth-form';

export const metadata: Metadata = {
  title: 'Create an account',
  description: 'Create a Karkana account to track orders, save addresses and build a wishlist.',
  alternates: { canonical: '/account/register' },
};

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
