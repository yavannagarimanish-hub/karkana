'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import type { CatalogueSection } from '@/core/domain/catalogue';
import { Badge } from '@/ui/badge';
import { Button } from '@/ui/button';
import { Field, Input } from '@/ui/field';

/** Storefront section editor: title, subtitle, visibility, order. */
export function SectionEditor({ sections }: { sections: CatalogueSection[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = React.useState(sections);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const save = async (section: CatalogueSection) => {
    setBusyId(section.id);
    setMessage(null);

    try {
      const response = await fetch('/api/v1/sections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: section.id,
          title: section.title,
          subtitle: section.subtitle,
          isVisible: section.isVisible,
          displayPosition: section.displayPosition,
        }),
      });

      const payload = (await response.json()) as { success?: boolean; error?: string };
      setMessage(payload.success ? `Saved “${section.title}”.` : (payload.error ?? 'Save failed.'));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  };

  const patch = (id: string, changes: Partial<CatalogueSection>) =>
    setDrafts((current) => current.map((section) => (section.id === id ? { ...section, ...changes } : section)));

  return (
    <div className="space-y-4">
      {message && (
        <p role="status" className="rounded-sm border border-hairline-strong bg-panel p-3 text-sm text-fg-muted">
          {message}
        </p>
      )}

      {drafts.map((section) => (
        <div key={section.id} className="surface rounded-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="numeric text-xs text-fg-dim">
                {String(section.displayPosition).padStart(2, '0')}
              </span>
              <Badge tone={section.isVisible ? 'ok' : 'outline'}>
                {section.isVisible ? 'Visible' : 'Hidden'}
              </Badge>
              <span className="label">{section.key}</span>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => patch(section.id, { isVisible: !section.isVisible })}
              >
                {section.isVisible ? 'Hide' : 'Show'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === section.id}
                onClick={() => save(section)}
              >
                {busyId === section.id ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-5 sm:grid-cols-[2fr_3fr_auto]">
            <Field label="Title" htmlFor={`title-${section.id}`}>
              <Input
                id={`title-${section.id}`}
                value={section.title}
                onChange={(event) => patch(section.id, { title: event.target.value })}
              />
            </Field>
            <Field label="Subtitle" htmlFor={`subtitle-${section.id}`}>
              <Input
                id={`subtitle-${section.id}`}
                value={section.subtitle}
                onChange={(event) => patch(section.id, { subtitle: event.target.value })}
              />
            </Field>
            <Field label="Order" htmlFor={`order-${section.id}`}>
              <Input
                id={`order-${section.id}`}
                inputMode="numeric"
                className="w-24"
                value={String(section.displayPosition)}
                onChange={(event) =>
                  patch(section.id, { displayPosition: Number(event.target.value.replace(/\D/g, '')) || 0 })
                }
              />
            </Field>
          </div>

          {section.key === 'popular' || section.key === 'featured' ? (
            <p className="mt-3 text-[11px] text-fg-dim">
              This section only renders when at least one product carries the matching flag. It is
              hidden automatically otherwise.
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}
