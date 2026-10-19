import type React from 'react';

import { cn } from '@/renderer/lib/utils';

/** What a badge says about what it is on, by the color of its tint (ADR 0078). */
const tones = {
  /** A state with nothing to do about it: saved, ready, checking. */
  neutral: 'bg-muted text-muted-foreground',
  /** What is as it should be, or chosen. */
  accent: 'bg-accent/15 text-accent',
  /** What needs something done. */
  warning: 'bg-status-warning/15 text-status-warning',
  /** What went wrong. */
  danger: 'bg-status-failed/15 text-status-failed',
} as const;

export type BadgeTone = keyof typeof tones;

/** A short state or count in a pill: how many are in a list, what became of an item. */
export function Badge({
  children,
  className,
  tone = 'neutral',
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  readonly tone?: BadgeTone;
}): React.JSX.Element {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
