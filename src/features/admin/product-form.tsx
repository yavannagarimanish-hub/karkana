'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { PRODUCT_MODULES, type ProductModule } from '@/core/domain/product';
import { Button } from '@/ui/button';
import { Field, Input, Select, Textarea } from '@/ui/field';

const EMPTY = {
  name: '',
  brand: '',
  category: '',
  price: '',
  originalPrice: '',
  stockQuantity: '',
  module: 'BASIC' as ProductModule,
  description: '',
  shortDescription: '',
  safetyInstructions: '',
};

/** Create-product form for the control centre. */
export function ProductForm({ nextId }: { nextId: string }) {
  const router = useRouter();
  const [form, setForm] = React.useState(EMPTY);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const update =
    (name: keyof typeof EMPTY) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [name]: event.target.value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          brand: form.brand,
          category: form.category,
          price: Number(form.price),
          originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
          stockQuantity: form.stockQuantity ? Number(form.stockQuantity) : null,
          module: form.module,
          description: form.description,
          shortDescription: form.shortDescription,
          safetyInstructions: form.safetyInstructions,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        product?: { id: string };
        error?: string;
        issues?: { path: string; message: string }[];
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.issues?.[0]?.message ?? payload.error ?? 'Could not create the product.');
      }

      setForm(EMPTY);
      router.refresh();
      window.alert(`Created ${payload.product?.id}`);
    } catch (submitError) {
      setError((submitError as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="surface space-y-5 rounded-sm p-5">
      <div className="flex items-baseline justify-between">
        <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-fg">
          New product
        </h2>
        <span className="numeric text-[11px] text-fg-dim">Next id: {nextId}</span>
      </div>

      {error && (
        <p role="alert" className="rounded-sm border border-status-danger/50 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </p>
      )}

      <Field label="Name" htmlFor="p-name" required>
        <Input id="p-name" value={form.name} onChange={update('name')} required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Brand" htmlFor="p-brand">
          <Input id="p-brand" value={form.brand} onChange={update('brand')} />
        </Field>
        <Field label="Category" htmlFor="p-category">
          <Input id="p-category" value={form.category} onChange={update('category')} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Selling price (₹)" htmlFor="p-price" required>
          <Input id="p-price" inputMode="decimal" value={form.price} onChange={update('price')} required />
        </Field>
        <Field label="MRP (₹)" htmlFor="p-mrp" hint="Optional">
          <Input id="p-mrp" inputMode="decimal" value={form.originalPrice} onChange={update('originalPrice')} />
        </Field>
        <Field label="Stock" htmlFor="p-stock" hint="Blank = unbounded">
          <Input id="p-stock" inputMode="numeric" value={form.stockQuantity} onChange={update('stockQuantity')} />
        </Field>
      </div>

      <Field label="Module" htmlFor="p-module" required>
        <Select id="p-module" value={form.module} onChange={update('module')}>
          {PRODUCT_MODULES.map((module) => (
            <option key={module} value={module}>
              {module}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Short description" htmlFor="p-short">
        <Input id="p-short" value={form.shortDescription} onChange={update('shortDescription')} />
      </Field>

      <Field label="Description" htmlFor="p-description">
        <Textarea id="p-description" rows={3} value={form.description} onChange={update('description')} />
      </Field>

      <Field label="Safety instructions" htmlFor="p-safety">
        <Textarea id="p-safety" rows={2} value={form.safetyInstructions} onChange={update('safetyInstructions')} />
      </Field>

      <Button type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Create product'}
      </Button>
    </form>
  );
}
