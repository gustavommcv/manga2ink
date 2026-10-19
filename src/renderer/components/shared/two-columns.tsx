import type React from 'react';

import { cn } from '@/renderer/lib/utils';

/**
 * What a screen is about, and a card beside it that is about the same thing: the queue and its
 * options, the books and how to share them. The card comes below the rest when the window is
 * narrow, and without one the rest has the whole width. The two screens share the one proportion,
 * so the card begins at the same place on both (ADR 0073).
 */
export function TwoColumns({
  aside,
  children,
  className,
}: {
  readonly aside?: React.ReactNode;
  readonly children: React.ReactNode;
  /** For the space between what the first column is made of. */
  readonly className?: string;
}): React.JSX.Element {
  const main = <div className={cn('min-w-0', className)}>{children}</div>;
  if (aside === undefined) return main;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      {main}
      {aside}
    </div>
  );
}
