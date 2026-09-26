'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { Button } from '@/ui/button';
import { Field, Input } from '@/ui/field';

export interface AuthFormProps {
  mode: 'login' | 'register';
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/account';

  const [form, setForm] = React.useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  });
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [consent, setConsent] = React.useState(false);

  const isRegister = mode === 'register';

  const update =
    (name: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    if (isRegister && !consent) {
      setError('Please accept the Terms & Conditions and Privacy Policy to create an account.');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(`/api/v1/auth/${isRegister ? 'register' : 'login'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isRegister ? form : { email: form.email, password: form.password }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        issues?: { path: string; message: string }[];
      };

      if (!response.ok || !payload.success) {
        if (payload.issues?.length) {
          setFieldErrors(
            Object.fromEntries(
              payload.issues.map((issue) => [issue.path.split('.').pop() ?? issue.path, issue.message]),
            ),
          );
        }
        throw new Error(payload.error ?? 'Something went wrong.');
      }

      router.push(next);
      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-8 sm:py-24">
      <h1 className="text-2xl font-extrabold tracking-[0.02em] uppercase sm:text-3xl">
        {isRegister ? 'Create your account' : 'Sign in'}
      </h1>
      <p className="mt-2 text-sm text-fg-muted">
        {isRegister
          ? 'Keep a wishlist, save addresses and track every order in one place.'
          : 'Order history, saved addresses and your wishlist.'}
      </p>

      <form onSubmit={submit} noValidate className="surface mt-8 space-y-5 rounded-sm p-5 sm:p-6">
        {error && (
          <p role="alert" className="rounded-sm border border-status-danger/50 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </p>
        )}

        {isRegister && (
          <Field label="Full name" htmlFor="name" required error={fieldErrors.name}>
            <Input id="name" autoComplete="name" value={form.name} onChange={update('name')} required />
          </Field>
        )}

        <Field label="Email" htmlFor="email" required error={fieldErrors.email}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            required
          />
        </Field>

        {isRegister && (
          <Field label="Mobile number" htmlFor="phone" required error={fieldErrors.phone}>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="98765 43210"
              value={form.phone}
              onChange={update('phone')}
              required
            />
          </Field>
        )}

        <Field
          label="Password"
          htmlFor="password"
          required
          hint={
            isRegister ? 'At least 8 characters, with an uppercase letter, a lowercase letter and a number.' : undefined
          }
          error={fieldErrors.password}
        >
          <Input
            id="password"
            type="password"
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            value={form.password}
            onChange={update('password')}
            required
          />
        </Field>

        {isRegister && (
          <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-fg-muted">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                if (event.target.checked) setError(null);
              }}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-ember)]"
              aria-label="I agree to the Terms and Conditions and Privacy Policy"
            />
            <span>
              I agree to the{' '}
              <Link
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg underline underline-offset-4 hover:text-ember"
              >
                Terms &amp; Conditions
              </Link>{' '}
              and{' '}
              <Link
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-fg underline underline-offset-4 hover:text-ember"
              >
                Privacy Policy
              </Link>.
            </span>
          </label>
        )}

        <Button type="submit" block size="lg" disabled={submitting}>
          {submitting ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
        </Button>

        <p className="text-center text-xs text-fg-dim">
          {isRegister ? (
            <>
              Already have an account?{' '}
              <Link href="/account/login" className="text-fg-muted underline underline-offset-4 hover:text-ember">
                Sign in
              </Link>
            </>
          ) : (
            <>
              New here?{' '}
              <Link href="/account/register" className="text-fg-muted underline underline-offset-4 hover:text-ember">
                Create an account
              </Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
