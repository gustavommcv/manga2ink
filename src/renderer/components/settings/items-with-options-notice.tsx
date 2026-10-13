import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/renderer/components/ui/button';

const items = (count: number): string => `${String(count)} ${count === 1 ? 'item' : 'items'}`;

/**
 * Says, on the page of the queue's options, how many items are converted with options of their own,
 * and puts them all back to the queue's (ADR 0049). Without it there is no telling, from this page,
 * that what is chosen here does not reach an option an item set. It is not shown when none has.
 *
 * The button goes with the notice, so the answer takes its place and holds the focus: a keyboard
 * is never left on something that vanished.
 */
export function ItemsWithOptionsNotice({
  count,
  onClear,
}: {
  /** How many inputs, and titles of libraries, have options of their own. */
  readonly count: number;
  readonly onClear: () => void;
}): React.JSX.Element | null {
  const [cleared, setCleared] = useState<number | undefined>(undefined);
  const answer = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (count === 0 && cleared !== undefined) answer.current?.focus();
  }, [cleared, count]);

  if (count === 0) {
    if (cleared === undefined) return null;
    return (
      <div
        className="border-border text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-background rounded-lg border px-4 py-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        ref={answer}
        role="status"
        tabIndex={-1}
      >
        {items(cleared)} now follow{cleared === 1 ? 's' : ''} the queue’s options.
      </div>
    );
  }
  return (
    <div
      aria-label="Items with options of their own"
      className="border-override/40 bg-override/10 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-lg border px-4 py-3"
      role="group"
    >
      <SlidersHorizontal aria-hidden="true" className="text-override size-4 shrink-0" />
      <p className="text-muted-foreground min-w-48 flex-1 text-xs leading-relaxed">
        <span className="text-foreground font-medium">
          {items(count)} in the queue {count === 1 ? 'is' : 'are'} converted with options of their
          own.
        </span>{' '}
        They keep what they set; every other option follows what you choose here.
      </p>
      <Button
        onClick={() => {
          setCleared(count);
          onClear();
        }}
        size="sm"
        variant="outline"
      >
        Use the queue’s options for all
      </Button>
    </div>
  );
}
