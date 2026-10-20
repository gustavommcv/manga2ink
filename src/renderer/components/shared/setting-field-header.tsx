import { RotateCcw } from 'lucide-react';
import { useRef } from 'react';

import { Button } from '@/renderer/components/ui/button';
import { Label } from '@/renderer/components/ui/label';
import { useMessages } from '@/renderer/hooks/use-messages';
import { cn } from '@/renderer/lib/utils';

/**
 * A changed setting is recognizable by color and by its labeled, keyboard-accessible action. The header
 * is set in the label's own size (14px, a line of 20px): in the page's (16px, a line of 24px) the label
 * sits in the middle of a taller line, and whatever is aligned to the header starts a few pixels away
 * from where the text is (ADR 0071).
 */
export function SettingFieldHeader({
  changed,
  disabled = false,
  id,
  label,
  onReset,
  optional = false,
  resetsTo = 'default',
}: {
  readonly changed: boolean;
  readonly disabled?: boolean;
  readonly id?: string;
  readonly label: string;
  readonly onReset: () => void;
  readonly optional?: boolean;
  /** What the reset puts back: the app's default, or the options of the queue (for one item). */
  readonly resetsTo?: 'default' | 'queue';
}): React.JSX.Element {
  const header = useRef<HTMLDivElement>(null);
  const words = useMessages().settings.field;
  const resetLabel =
    resetsTo === 'queue' ? words.useQueueValue(label) : words.restoreDefault(label);
  const labelClass = cn(
    'text-sm font-medium',
    disabled && 'text-muted-foreground',
    changed && (resetsTo === 'queue' ? 'text-override' : 'text-accent'),
  );

  return (
    <div
      className="focus-visible:ring-ring relative pr-7 text-sm outline-none focus-visible:rounded-sm focus-visible:ring-2"
      ref={header}
      tabIndex={-1}
    >
      {id === undefined ? (
        <span className={labelClass}>{label}</span>
      ) : (
        <Label className={labelClass} htmlFor={id}>
          {label}
          {optional && (
            <>
              {' '}
              <span className="text-muted-foreground font-normal">{words.optional}</span>
            </>
          )}
        </Label>
      )}
      {changed && (
        <Button
          aria-label={resetLabel}
          className={cn(
            'absolute -top-0.5 right-0 size-6 p-0',
            resetsTo === 'queue'
              ? 'text-override hover:bg-override/10 hover:text-override'
              : 'text-accent hover:bg-accent/10 hover:text-accent',
          )}
          onClick={() => {
            onReset();
            const control = id === undefined ? null : document.getElementById(id);
            if (control instanceof HTMLElement && !control.matches(':disabled')) control.focus();
            else header.current?.focus();
          }}
          size="icon"
          title={resetLabel}
          variant="ghost"
        >
          <RotateCcw aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
