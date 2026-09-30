'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { PRODUCT_MODULES, type Product, type ProductModule } from '@/core/domain/product';
import { Button } from '@/ui/button';
import { Field, Input, Select, Textarea } from '@/ui/field';

interface Draft {
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  unit: string;
  price: string;
  originalPrice: string;
  stockQuantity: string;
  module: ProductModule;
  images: string;
  shortDescription: string;
  description: string;
  safetyInstructions: string;
  searchKeywords: string;
  notes: string;
  isVisible: boolean;
  inStock: boolean;
  isFeatured: boolean;
  isPopular: boolean;
}

function draftFrom(product: Product): Draft {
  return {
    name: product.name,
    brand: product.brand,
    category: product.category,
    subcategory: product.subcategory,
    unit: product.unit,
    price: String(product.price),
    originalPrice: product.originalPrice === null ? '' : String(product.originalPrice),
    stockQuantity: product.stockQuantity === null ? '' : String(product.stockQuantity),
    module: product.module,
    images: product.images.join('\n'),
    shortDescription: product.shortDescription,
    description: product.description,
    safetyInstructions: product.safetyInstructions,
    searchKeywords: product.searchKeywords,
    notes: product.notes,
    isVisible: product.isVisible,
    inStock: product.inStock,
    isFeatured: product.isFeatured,
    isPopular: product.isPopular,
  };
}

/** Edit form for an existing catalogue product. Saves through `PATCH /api/v1/products/[id]`. */
export function ProductEditForm({ product }: { product: Product }) {
  const router = useRouter();
  const [form, setForm] = React.useState<Draft>(() => draftFrom(product));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState<string | null>(null);

  const update =
    (name: keyof Draft) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const value =
        event.target instanceof HTMLInputElement && event.target.type === 'checkbox'
          ? event.target.checked
          : event.target.value;
      setForm((current) => ({ ...current, [name]: value }));
      setSaved(null);
    };

  const toggle = (name: 'isVisible' | 'inStock' | 'isFeatured' | 'isPopular') => () => {
    setForm((current) => ({ ...current, [name]: !current[name] }));
    setSaved(null);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(null);

    try {
      const response = await fetch(`/api/v1/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          brand: form.brand,
          category: form.category,
          subcategory: form.subcategory,
          unit: form.unit,
          price: Number(form.price),
          originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
          stockQuantity: form.stockQuantity ? Number(form.stockQuantity) : null,
          module: form.module,
          images: form.images
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean),
          shortDescription: form.shortDescription,
          description: form.description,
          safetyInstructions: form.safetyInstructions,
          searchKeywords: form.searchKeywords,
          notes: form.notes,
          isVisible: form.isVisible,
          inStock: form.inStock,
          isFeatured: form.isFeatured,
          isPopular: form.isPopular,
        }),
      });

      const payload = (await response.json()) as {
        success?: boolean;
        error?: string;
        issues?: { path: string; message: string }[];
      };

      if (!response.ok || !payload.success) {
        throw new Error(payload.issues?.[0]?.message ?? payload.error ?? 'Could not save the product.');
      }

      router.refresh();
      setSaved(`Saved ${product.id}.`);
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
          Edit product
        </h2>
        <span className="numeric text-[11px] text-fg-dim">{product.id}</span>
      </div>

      {error && (
        <p role="alert" className="rounded-sm border border-status-danger/50 bg-status-danger/10 p-3 text-sm text-status-danger">
          {error}
        </p>
      )}

      {saved && (
        <p role="status" className="rounded-sm border border-hairline-strong bg-panel p-3 text-sm text-fg-muted">
          {saved}
        </p>
      )}

      <Field label="Name" htmlFor="e-name" required>
        <Input id="e-name" value={form.name} onChange={update('name')} required />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Brand" htmlFor="e-brand">
          <Input id="e-brand" value={form.brand} onChange={update('brand')} />
        </Field>
        <Field label="Category" htmlFor="e-category">
          <Input id="e-category" value={form.category} onChange={update('category')} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Subcategory" htmlFor="e-subcategory">
          <Input id="e-subcategory" value={form.subcategory} onChange={update('subcategory')} />
        </Field>
        <Field label="Unit" htmlFor="e-unit" hint="e.g. box, piece">
          <Input id="e-unit" value={form.unit} onChange={update('unit')} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Selling price (₹)" htmlFor="e-price" required>
          <Input id="e-price" inputMode="decimal" value={form.price} onChange={update('price')} required />
        </Field>
        <Field label="MRP (₹)" htmlFor="e-mrp" hint="Optional">
          <Input id="e-mrp" inputMode="decimal" value={form.originalPrice} onChange={update('originalPrice')} />
        </Field>
        <Field label="Stock" htmlFor="e-stock" hint="Blank = unbounded">
          <Input id="e-stock" inputMode="numeric" value={form.stockQuantity} onChange={update('stockQuantity')} />
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Module" htmlFor="e-module" required>
          <Select id="e-module" value={form.module} onChange={update('module')}>
            {PRODUCT_MODULES.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 self-end pb-1">
          <label htmlFor="e-visible" className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
            <input id="e-visible" type="checkbox" checked={form.isVisible} onChange={toggle('isVisible')} className="size-4 accent-[var(--color-ember)]" />
            Live
          </label>
          <label htmlFor="e-stock-flag" className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
            <input id="e-stock-flag" type="checkbox" checked={form.inStock} onChange={toggle('inStock')} className="size-4 accent-[var(--color-ember)]" />
            In stock
          </label>
          <label htmlFor="e-featured" className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
            <input id="e-featured" type="checkbox" checked={form.isFeatured} onChange={toggle('isFeatured')} className="size-4 accent-[var(--color-ember)]" />
            Featured
          </label>
          <label htmlFor="e-popular" className="flex cursor-pointer items-center gap-2 text-sm text-fg-muted">
            <input id="e-popular" type="checkbox" checked={form.isPopular} onChange={toggle('isPopular')} className="size-4 accent-[var(--color-ember)]" />
            Popular
          </label>
        </div>
      </div>

      <Field label="Short description" htmlFor="e-short">
        <Input id="e-short" value={form.shortDescription} onChange={update('shortDescription')} />
      </Field>

      <Field label="Description" htmlFor="e-description">
        <Textarea id="e-description" rows={3} value={form.description} onChange={update('description')} />
      </Field>

      <Field label="Safety instructions" htmlFor="e-safety">
        <Textarea id="e-safety" rows={2} value={form.safetyInstructions} onChange={update('safetyInstructions')} />
      </Field>

      <Field label="Search keywords" htmlFor="e-keywords" hint="Comma-separated">
        <Input id="e-keywords" value={form.searchKeywords} onChange={update('searchKeywords')} />
      </Field>

      <Field label="Notes" htmlFor="e-notes" hint="Internal — never shown to customers">
        <Textarea id="e-notes" rows={2} value={form.notes} onChange={update('notes')} />
      </Field>

      <Field label="Image URLs" htmlFor="e-images" hint="One URL per line, up to 10">
        <Textarea id="e-images" rows={3} value={form.images} onChange={update('images')} />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
        <Button variant="ghost" href="/admin/products">
          Back to products
        </Button>
      </div>
    </form>
  );
}
