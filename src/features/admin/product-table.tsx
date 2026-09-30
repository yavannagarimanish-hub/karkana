'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import type { Product } from '@/core/domain/product';
import { formatINR } from '@/core/domain/money';
import { pricePaise } from '@/core/domain/product';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';

/**
 * Row actions for the admin catalogue table: publish/unpublish, stock toggle
 * and delete. Every mutation goes through `/api/v1`, which re-checks the
 * admin session — the proxy redirect is only a convenience.
 */
export function ProductRowActions({ product }: { product: Product }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const patch = async (body: Record<string, unknown>) => {
    setBusy(true);
    try {
      const response = await fetch(`/api/v1/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        window.alert(payload.error ?? 'Update failed.');
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete ${product.id} (${product.name})? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await fetch(`/api/v1/products/${product.id}`, { method: 'DELETE' });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Button size="sm" variant="ghost" disabled={busy} href={`/admin/products/${product.id}/edit`}>
        Edit
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => patch({ isVisible: !product.isVisible })}>
        {product.isVisible ? 'Unpublish' : 'Publish'}
      </Button>
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => patch({ inStock: !product.inStock })}>
        {product.inStock ? 'Mark out' : 'Mark in'}
      </Button>
      <Button size="sm" variant="danger" disabled={busy} onClick={remove}>
        Delete
      </Button>
    </div>
  );
}

export function ProductStatusBadges({ product }: { product: Product }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge tone={product.module === 'PERSONALIZED' ? 'ember' : 'neutral'}>{product.module}</Badge>
      <Badge tone={product.isVisible ? 'ok' : 'outline'}>{product.isVisible ? 'Live' : 'Hidden'}</Badge>
      {!product.inStock && <Badge tone="danger">Out of stock</Badge>}
      {product.isFeatured && <Badge tone="info">Featured</Badge>}
      {product.isPopular && <Badge tone="info">Popular</Badge>}
    </div>
  );
}

export function ProductPrice({ product }: { product: Product }) {
  return (
    <span className="numeric text-sm">
      {formatINR(pricePaise(product))}
      {product.originalPrice ? (
        <span className="ml-2 text-[11px] text-fg-ghost line-through">{formatINR(product.originalPrice * 100)}</span>
      ) : null}
    </span>
  );
}
