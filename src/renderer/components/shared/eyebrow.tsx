import type React from 'react';

import { cn } from '@/renderer/lib/utils';

/** The small line above a title or a group of choices that says what they are for. */
export function Eyebrow({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}): React.JSX.Element {
  return <p className={cn('text-muted-foreground text-xs font-medium', className)}>{children}</p>;
}
