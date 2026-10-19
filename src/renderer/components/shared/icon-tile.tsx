import type React from 'react';

import { cn } from '@/renderer/lib/utils';

/** The square at the start of a row that says what kind of thing it is: an icon, or a letter. */
export function IconTile({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}): React.JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4',
        className,
      )}
    >
      {children}
    </span>
  );
}
