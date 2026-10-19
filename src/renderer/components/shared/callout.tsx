import { X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type React from 'react';

import { Button } from '@/renderer/components/ui/button';
import { cn } from '@/renderer/lib/utils';

import { IconLine } from './icon-line';

/** The edge and the tint of a callout, and the color of its icon, by what it says (ADR 0077). */
const tones = {
  /** A thing to know, or to do something about. */
  warning: { box: 'border-status-warning/40 bg-status-warning/10', icon: 'text-status-warning' },
  /** What went wrong. */
  failed: { box: 'border-status-failed/50 bg-status-failed/10', icon: 'text-status-failed' },
  /** What one item sets over the queue's options (ADR 0047). */
  override: { box: 'border-override/40 bg-override/10', icon: 'text-override' },
  /** A remark, with nothing tinted. */
  neutral: { box: 'border-border bg-muted', icon: 'text-status-warning' },
} as const;

export type CalloutTone = keyof typeof tones;

/**
 * A box that tells a person something about what they are looking at: an icon on the first line, a
 * title, what it says, and what can be done about it. It is one box, with one edge, one padding and one
 * size of text, whether it is a banner above a page, a card beside a book, or the answer to an action.
 * What it says is `children`, in the muted color; a list that is a few lines of its own is a `ul`.
 */
export function Callout({
  action,
  'aria-label': ariaLabel,
  children,
  className,
  dismiss,
  icon: Icon,
  level = 2,
  role,
  title,
  tone = 'warning',
}: {
  /** What can be done about it, at the end of the box: a button. */
  readonly action?: React.ReactNode;
  readonly 'aria-label'?: string;
  readonly children?: React.ReactNode;
  readonly className?: string;
  /** For a callout that stays until it is put away. */
  readonly dismiss?: { readonly label: string; readonly onDismiss: () => void };
  readonly icon?: LucideIcon;
  /** The level of the title: 1 for a page that has nothing else to say it is. */
  readonly level?: 1 | 2;
  readonly role?: 'alert' | 'group' | 'status';
  readonly title?: string;
  readonly tone?: CalloutTone;
}): React.JSX.Element {
  const Heading = level === 1 ? 'h1' : 'h2';
  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        'flex flex-wrap items-start gap-x-3 gap-y-2 rounded-lg border px-4 py-3 text-sm',
        tones[tone].box,
        className,
      )}
      role={role}
    >
      <IconLine
        className="min-w-0 flex-1 basis-48"
        icon={Icon === undefined ? undefined : <Icon className={tones[tone].icon} />}
      >
        {title !== undefined && (
          <Heading className="text-foreground text-sm font-semibold">{title}</Heading>
        )}
        {children !== undefined && (
          <div className={cn('text-muted-foreground', title !== undefined && 'mt-1')}>
            {children}
          </div>
        )}
      </IconLine>
      {action !== undefined && <div className="self-center">{action}</div>}
      {dismiss !== undefined && (
        <Button
          aria-label={dismiss.label}
          className="self-center"
          flush="end"
          onClick={dismiss.onDismiss}
          size="icon"
          variant="ghost"
        >
          <X />
        </Button>
      )}
    </section>
  );
}
