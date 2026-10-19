import type React from 'react';

import { cn } from '@/renderer/lib/utils';

/**
 * An icon at the start of a text, centered on its first line (ADR 0077). The box of the icon is the
 * height of a line of the text it is at, so it is on the middle of the first line whatever the size
 * of the text and however many lines it takes, with no nudge: the text sets its size on the row, and
 * the first line of the content is of that size.
 */
export function IconLine({
  children,
  className,
  icon,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
  /** The icon, which is 16 px; its color is the caller's. */
  readonly icon?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className={cn('flex gap-3', className)}>
      {icon !== undefined && (
        <span aria-hidden="true" className="flex h-lh shrink-0 items-center [&_svg]:size-4">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
