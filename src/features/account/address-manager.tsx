'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import type { CustomerAddress } from '@/core/domain/account';
import { Button } from '@/ui/button';
import { Field, Input, Select, Textarea } from '@/ui/field';
import { Badge } from '@/ui/badge';

const EMPTY = {
  label: 'Home',
  houseFlat: '',
  streetLocality: '',
  city: '',
  state: 'Telangana',
  pincode: '',
  instructions: '',
};

export function AddressManager({ addresses }: { addresses: CustomerAddress[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(addresses.length === 0);
  const [form, setForm] = React.useState(EMPTY);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const noticeTimer = React.useRef<number | undefined>(undefined);

  const flash = (message: string) => {
    setNotice(message);
    window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), 4000);
  };

  const update =
    (name: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [name]: event.target.value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, isDefault: addresses.length === 0 }),
      });
      const payload = (await response.json()) as { success?: boolean; error?: string };
      if (!response.ok || !payload.success) throw new Error(payload.error ?? 'Could not save the address.');

      setForm(EMPTY);
      setOpen(false);
      flash('Address saved. It will be offered at checkout.');
      router.refresh();
    } catch (saveError) {
      setError((saveError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (id: string) => {
    await fetch(`/api/v1/addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isDefault: true }),
    });
    flash('Default address updated.');
    router.refresh();
  };

  const removeAddress = async (id: string) => {
    await fetch(`/api/v1/addresses/${id}`, { method: 'DELETE' });
    flash('Address removed.');
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
          {addresses.length} saved {addresses.length === 1 ? 'address' : 'addresses'}
        </h2>
        {!open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            Add address
          </Button>
        )}
      </div>

      {notice && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-sm border border-status-ok/50 bg-status-ok/10 p-3 text-sm text-status-ok"
        >
          {notice}
        </p>
      )}

      {addresses.length > 0 && (
        <ul className="grid gap-4 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="surface rounded-sm p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg">
                    {address.label}
                  </span>
                  {address.isDefault && <Badge tone="ember">Default</Badge>}
                </div>
              </div>

              <p className="mt-3 text-sm leading-relaxed text-fg-muted">
                {address.houseFlat}
                <br />
                {address.streetLocality}
                <br />
                {address.city}, {address.state} <span className="numeric">{address.pincode}</span>
                {address.instructions && (
                  <span className="mt-2 block text-xs text-fg-dim">{address.instructions}</span>
                )}
              </p>

              <div className="mt-4 flex gap-4 border-t border-hairline pt-3 text-[11px]">
                {!address.isDefault && (
                  <button
                    type="button"
                    onClick={() => makeDefault(address.id)}
                    className="font-mono uppercase tracking-[0.14em] text-fg-dim transition-colors hover:text-fg"
                  >
                    Make default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeAddress(address.id)}
                  className="font-mono uppercase tracking-[0.14em] text-fg-dim transition-colors hover:text-status-danger"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form onSubmit={save} noValidate className="surface space-y-5 rounded-sm p-5">
          <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
            New address
          </h3>

          {error && (
            <p role="alert" className="rounded-sm border border-status-danger/50 bg-status-danger/10 p-3 text-sm text-status-danger">
              {error}
            </p>
          )}

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Label" htmlFor="addr-label">
              <Input id="addr-label" value={form.label} onChange={update('label')} />
            </Field>
            <Field label="PIN code" htmlFor="addr-pincode" required>
              <Input
                id="addr-pincode"
                inputMode="numeric"
                maxLength={6}
                value={form.pincode}
                onChange={update('pincode')}
                required
              />
            </Field>
          </div>

          <Field label="House / flat" htmlFor="addr-house" required>
            <Input id="addr-house" value={form.houseFlat} onChange={update('houseFlat')} required />
          </Field>

          <Field label="Street / locality" htmlFor="addr-street" required>
            <Input
              id="addr-street"
              value={form.streetLocality}
              onChange={update('streetLocality')}
              required
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="City" htmlFor="addr-city" required>
              <Input id="addr-city" value={form.city} onChange={update('city')} required />
            </Field>
            <Field label="State" htmlFor="addr-state" required>
              <Select id="addr-state" value={form.state} onChange={update('state')}>
                {['Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'Karnataka', 'Maharashtra', 'Delhi'].map(
                  (state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ),
                )}
              </Select>
            </Field>
          </div>

          <Field label="Instructions (optional)" htmlFor="addr-instructions">
            <Textarea
              id="addr-instructions"
              rows={2}
              value={form.instructions}
              onChange={update('instructions')}
            />
          </Field>

          <div className="flex gap-3">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save address'}
            </Button>
            {addresses.length > 0 && (
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      )}
    </div>
  );
}
