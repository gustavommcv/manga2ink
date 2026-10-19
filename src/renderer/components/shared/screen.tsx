import type React from 'react';

import { cn } from '@/renderer/lib/utils';

/**
 * How wide a screen is, by what it is for. `wide` is the page as it is (the whole of what the window
 * gives), for a screen that sets things beside each other; `form` is a column to read and fill in;
 * `status` is a short column that says one thing (ADR 0073).
 */
const widths = {
  wide: '',
  form: 'mx-auto max-w-3xl',
  status: 'mx-auto max-w-xl',
} as const;

export type ScreenWidth = keyof typeof widths;

/** One screen of the app: its width, and the space between what it is made of. */
export function Screen({
  children,
  className,
  labelledBy,
  width = 'wide',
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  /** The id of the title the section is named by (`ScreenHeader`'s `id`). */
  readonly labelledBy: string;
  readonly width?: ScreenWidth;
}): React.JSX.Element {
  return (
    <section aria-labelledby={labelledBy} className={cn('space-y-6', widths[width], className)}>
      {children}
    </section>
  );
}
