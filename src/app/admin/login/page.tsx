'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { Button } from '@/ui/button';
import { Field, Input } from '@/ui/field';


/** Operator login. Credentials are verified against the env-configured hash. */
export default function AdminLoginPage() {
  const router = useRouter();
  const [form, setForm] = React.useState({ username: '', password: '' });
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };

      if (!response.ok || !payload.success) throw new Error(payload.error ?? 'Login failed.');

      router.push('/admin');
      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message);
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="surface w-full max-w-sm rounded-sm p-6">
        <p className="live-dot label">Control centre</p>
        <h1 className="mt-4 text-xl font-extrabold tracking-[0.06em] uppercase">Operator sign in</h1>

        {error && (
          <p role="alert" className="mt-5 rounded-sm border border-status-danger/50 bg-status-danger/10 p-3 text-sm text-status-danger">
            {error}
          </p>
        )}

        <div className="mt-6 space-y-5">
          <Field label="Username" htmlFor="admin-username" required>
            <Input
              id="admin-username"
              autoComplete="username"
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              required
            />
          </Field>

          <Field label="Password" htmlFor="admin-password" required>
            <Input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
              required
            />
          </Field>
        </div>

        <Button type="submit" block size="lg" variant="ember" className="mt-6" disabled={busy}>
          {busy ? 'Verifying…' : 'Enter control centre'}
        </Button>

        <p className="mt-4 text-[11px] text-fg-dim">
          Credentials are read from the deployment environment. There is no self-service registration
          for this panel.
        </p>
      </form>
    </div>
  );
}
