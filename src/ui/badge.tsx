import * as React from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'ember' | 'ok' | 'warn' | 'danger' | 'info' | 'outline';

const TONE: Record<Tone, string> = {
  neutral: 'bg-panel text-fg-muted shadow-hairline',
  ember: 'bg-ember-wash text-ember shadow-[inset_0_0_0_1px_rgba(255,0,51,0.4)]',
  ok: 'bg-status-ok/10 text-status-ok shadow-[inset_0_0_0_1px_rgba(53,208,127,0.35)]',
  warn: 'bg-status-warn/10 text-status-warn shadow-[inset_0_0_0_1px_rgba(255,176,32,0.35)]',
  danger: 'bg-status-danger/10 text-status-danger shadow-[inset_0_0_0_1px_rgba(255,0,51,0.35)]',
  info: 'bg-status-info/10 text-status-info shadow-[inset_0_0_0_1px_rgba(110,168,255,0.35)]',
  outline: 'bg-transparent text-fg-dim shadow-hairline-strong',
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** Prepends a pulsing dot for live/active states. */
  live?: boolean;
}

export function Badge({ tone = 'neutral', live, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xs px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] whitespace-nowrap',
        TONE[tone],
        className,
      )}
      {...props}
    >
      {live && (
        <span aria-hidden className="size-1.5 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
      )}
      {children}
    </span>
  );
}
