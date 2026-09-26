'use client';

import * as React from 'react';
import { MAX_LINE_QUANTITY } from '@/core/domain/pricing';
import { cn } from './cn';

export interface QuantityStepperProps {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  min?: number;
  disabled?: boolean;
  label?: string;
  className?: string;
}

export function QuantityStepper({
  value,
  onChange,
  max = MAX_LINE_QUANTITY,
  min = 1,
  disabled,
  label = 'Quantity',
  className,
}: QuantityStepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div
      className={cn(
        'inline-flex items-stretch rounded-sm shadow-hairline-strong',
        disabled && 'opacity-50',
        className,
      )}
    >
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        disabled={disabled || value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className="grid size-11 place-items-center text-lg text-fg-muted transition-colors hover:bg-panel-raised hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
      >
        −
      </button>

      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const parsed = Number.parseInt(event.target.value.replace(/\D/g, ''), 10);
          if (Number.isFinite(parsed)) onChange(clamp(parsed));
        }}
        className="numeric w-12 border-x border-hairline bg-transparent text-center text-sm font-semibold text-fg focus:outline-none"
      />

      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        disabled={disabled || value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className="grid size-11 place-items-center text-lg text-fg-muted transition-colors hover:bg-panel-raised hover:text-fg disabled:cursor-not-allowed disabled:opacity-40"
      >
        +
      </button>
    </div>
  );
}
