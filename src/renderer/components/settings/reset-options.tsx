import { RotateCcw } from 'lucide-react';
import { useId, useRef, useState } from 'react';

import { Button } from '@/renderer/components/ui/button';
import { useFocusOnOpen } from '@/renderer/hooks/use-focus-on-open';
import { useMessages } from '@/renderer/hooks/use-messages';
import type { ResetScope } from '@/renderer/i18n/settings-messages';

/**
 * Puts options back to their defaults, after a second click: what it discards is also what was
 * saved for the next session (ADR 0014). It stays in place, dimmed, when there is nothing to
 * reset, so it can always be found and keyboard focus is never left on something that vanished.
 */
export function ResetOptions({
  changed,
  onReset,
  scope,
}: {
  /** Whether anything differs from the defaults. */
  readonly changed: boolean;
  readonly onReset: () => void;
  /** What goes back: the options of the queue screen, or of the page of conversion options. */
  readonly scope: ResetScope;
}): React.JSX.Element {
  const words = useMessages().settings.reset;
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const question = useFocusOnOpen<HTMLDivElement>(confirming && changed);
  const panelId = useId();
  const reasonId = useId();

  const close = (): void => {
    setConfirming(false);
    trigger.current?.focus();
  };

  return (
    <div className="space-y-2">
      <Button
        aria-controls={confirming ? panelId : undefined}
        aria-describedby={changed ? undefined : reasonId}
        aria-disabled={!changed}
        aria-expanded={confirming}
        className="aria-disabled:hover:text-muted-foreground -ml-3 aria-disabled:cursor-default aria-disabled:opacity-50 aria-disabled:hover:bg-transparent"
        onClick={() => {
          if (!changed) return;
          setDone(false);
          setConfirming(true);
        }}
        ref={trigger}
        size="sm"
        variant="ghost"
      >
        <RotateCcw /> {words.button}
      </Button>
      {!changed && (
        <span className="sr-only" id={reasonId}>
          {words.alreadyDefault}
        </span>
      )}
      {confirming && changed && (
        <div
          aria-label={words.confirmLabel}
          className="border-border bg-background focus-visible:ring-ring focus-visible:ring-offset-background space-y-3 rounded-lg border p-3 outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          id={panelId}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close();
          }}
          ref={question}
          role="group"
          tabIndex={-1}
        >
          <p className="text-muted-foreground text-xs leading-relaxed">{words.question[scope]}</p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                onReset();
                setDone(true);
                close();
              }}
              size="sm"
            >
              {words.confirm}
            </Button>
            <Button onClick={close} size="sm" variant="outline">
              {words.cancel}
            </Button>
          </div>
        </div>
      )}
      <p className="sr-only" role="status">
        {done ? words.done : ''}
      </p>
    </div>
  );
}
