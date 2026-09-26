import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '@/features/account/auth-form';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to track your orders, save delivery addresses and keep a wishlist.',
  alternates: { canonical: '/account/login' },
};

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
