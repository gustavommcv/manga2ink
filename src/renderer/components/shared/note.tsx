import type React from 'react';

import { cn } from '@/renderer/lib/utils';

/**
 * A line or two of what something is for or why it is as it is, under what it is about (ADR 0079):
 * what a step uses, the description of a choice, why a button cannot be pressed. One size, one grey
 * and one height of line for every one of them, so a note is read as a note wherever it is. A note
 * that is several lines of its own, a paragraph and a list, is a `div`.
 */
export function Note({
  as: Tag = 'p',
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { readonly as?: 'div' | 'p' }): React.JSX.Element {
  return (
    <Tag className={cn('text-muted-foreground text-xs leading-normal', className)} {...props} />
  );
}
