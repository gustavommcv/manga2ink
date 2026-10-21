import { SlidersHorizontal } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Callout } from '@/renderer/components/shared/callout';
import { Button } from '@/renderer/components/ui/button';
import { useMessages, useSentenceMarks } from '@/renderer/hooks/use-messages';

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
  const words = useMessages().options.overrides;
  const { gap } = useSentenceMarks();
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
        {words.cleared(cleared)}
      </div>
    );
  }
  return (
    <Callout
      action={
        <Button
          onClick={() => {
            setCleared(count);
            onClear();
          }}
          size="sm"
          variant="outline"
        >
          {words.clearAll}
        </Button>
      }
      aria-label={words.label}
      icon={SlidersHorizontal}
      role="group"
      tone="override"
    >
      <span className="text-foreground font-medium">{words.some(count)}</span>
      {gap}
      {words.keep}
    </Callout>
  );
}
