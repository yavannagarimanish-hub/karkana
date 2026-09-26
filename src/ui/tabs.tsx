'use client';

import * as React from 'react';
import { cn } from './cn';

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: 'underline' | 'segment';
  ariaLabel?: string;
  className?: string;
}

/**
 * Accessible tab strip: roving tabindex with arrow-key navigation, and
 * `aria-selected` kept in sync for assistive tech.
 */
export function Tabs<T extends string = string>({
  items,
  value,
  onChange,
  variant = 'underline',
  ariaLabel = 'Tabs',
  className,
}: TabsProps<T>) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  const focusIndex = (index: number) => {
    const wrapped = (index + items.length) % items.length;
    onChange(items[wrapped]!.value);
    refs.current[wrapped]?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        variant === 'segment' ? 'inline-flex rounded-sm bg-panel p-1 shadow-hairline' : 'flex gap-6 border-b border-hairline',
        'overflow-x-auto',
        className,
      )}
      onKeyDown={(event) => {
        const current = items.findIndex((item) => item.value === value);
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          focusIndex(current + 1);
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          focusIndex(current - 1);
        } else if (event.key === 'Home') {
          event.preventDefault();
          focusIndex(0);
        } else if (event.key === 'End') {
          event.preventDefault();
          focusIndex(items.length - 1);
        }
      }}
    >
      {items.map((item, index) => {
        const selected = item.value === value;

        return (
          <button
            key={item.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`tab-${item.value}`}
            aria-selected={selected}
            aria-controls={`tabpanel-${item.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative whitespace-nowrap font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors',
              variant === 'segment'
                ? cn(
                    'rounded-xs px-3 py-2',
                    selected ? 'bg-panel-raised text-fg shadow-hairline-strong' : 'text-fg-dim hover:text-fg-muted',
                  )
                : cn('-mb-px border-b-2 px-1 py-3', selected ? 'border-ember text-fg' : 'border-transparent text-fg-dim hover:text-fg-muted'),
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span className={cn('numeric ml-2 text-[10px]', selected ? 'text-ember' : 'text-fg-ghost')}>
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
