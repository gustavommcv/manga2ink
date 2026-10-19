import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type React from 'react';

import { Button } from '@/renderer/components/ui/button';
import { cn } from '@/renderer/lib/utils';

export interface ScreenHeaderProps {
  /** What the screen puts at the end of the header: a reset, a way out. */
  readonly actions?: React.ReactNode;
  /** The way back to where the screen was opened from; absent on a screen that has none. */
  readonly back?: { readonly label: string; readonly onBack: () => void };
  /** Beside the title, such as how many are in the list it heads. */
  readonly badge?: React.ReactNode;
  readonly description?: React.ReactNode;
  /** The line above the title; a badge may follow it. */
  readonly eyebrow?: React.ReactNode;
  /** What the screen's section is labelled by. */
  readonly id: string;
  /** `section` is the title of a screen that is one list among others, not a page of its own. */
  readonly size?: 'page' | 'section';
  readonly title: string;
  /** For a screen that puts focus on its title again, after something it did there. */
  readonly titleRef?: React.RefObject<HTMLHeadingElement | null>;
}

/**
 * The top of a screen: the way back, the line above, the title, and what it says. The title takes
 * focus when the screen opens, so a screen reader says where it is and a keyboard starts there; it
 * cannot be reached by Tab, and so it draws no ring (ADR 0072).
 */
export function ScreenHeader({
  actions,
  back,
  badge,
  description,
  eyebrow,
  id,
  size = 'page',
  title,
  titleRef,
}: ScreenHeaderProps): React.JSX.Element {
  const own = useRef<HTMLHeadingElement>(null);
  const heading = titleRef ?? own;
  useEffect(() => {
    heading.current?.focus();
  }, [heading]);
  const page = size === 'page';

  return (
    <header className="space-y-5">
      {back !== undefined && (
        <Button onClick={back.onBack} variant="ghost">
          <ChevronLeft /> {back.label}
        </Button>
      )}
      <div
        className={cn(
          'flex flex-wrap justify-between gap-x-4 gap-y-2',
          page ? 'items-start' : 'items-center',
        )}
      >
        <div className="min-w-0 flex-1 basis-60 space-y-1">
          {eyebrow !== undefined && (
            <div className="flex flex-wrap items-center gap-2">{eyebrow}</div>
          )}
          <div className="flex items-center gap-2">
            <h1
              className={cn(
                'rounded-md wrap-anywhere outline-none',
                page ? 'text-2xl font-semibold tracking-tight' : 'text-base font-medium',
              )}
              id={id}
              ref={heading}
              tabIndex={-1}
            >
              {title}
            </h1>
            {badge}
          </div>
          {description !== undefined && (
            <div className="text-muted-foreground max-w-2xl text-sm">{description}</div>
          )}
        </div>
        {actions}
      </div>
    </header>
  );
}
