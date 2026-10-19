import type { ReactNode } from 'react';

import { Checkbox } from '@/renderer/components/ui/checkbox';
import { Label } from '@/renderer/components/ui/label';
import { cn } from '@/renderer/lib/utils';

/**
 * A checkbox with its words (ADR 0071, ADR 0075): the box is on the line of the title, centered on
 * it, one rule for every box in the app: the steps and the options of the queue, the choices of the
 * options page, the settings, the chapters of a volume. The title is a text, which the row makes the
 * label of the box, or a node for a title that is more than that (a name with its reset). What goes
 * in `note` (what a step uses, a description, or why the box cannot be changed) is under the row, in
 * line with the title; however long it is, it does not move the box. The ids of what describes the box
 * are in `describedBy`.
 *
 * `besideField` is for a choice that sits in a grid next to a field that has a label above its control:
 * where there are two columns, the row is then as high as that control and the box and the title are
 * centered on it, below an empty slot as high as the label, so the choice is in line with the control
 * and its note with the field's own. A choice beside another choice, or alone, is not moved, and in one
 * column (a narrow window) there is no slot to leave empty.
 */
export function CheckRow({
  'aria-label': ariaLabel,
  besideField = false,
  checked,
  describedBy,
  disabled = false,
  id,
  note,
  onChange,
  title,
}: {
  /** For a box whose title is not on the page as a label of its own. */
  readonly 'aria-label'?: string;
  readonly besideField?: boolean;
  readonly checked: boolean;
  readonly describedBy?: string;
  readonly disabled?: boolean;
  readonly id: string;
  readonly note?: ReactNode;
  readonly onChange: (checked: boolean) => void;
  readonly title: ReactNode;
}): React.JSX.Element {
  return (
    <div data-beside-field={besideField ? '' : undefined} data-slot="check-row">
      {besideField && (
        <div aria-hidden="true" className="mb-2 hidden h-5 sm:block" data-slot="check-row-lead" />
      )}
      <div
        className={cn('flex items-center gap-3', besideField && 'sm:min-h-9')}
        data-slot="check-row-line"
      >
        <Checkbox
          aria-describedby={describedBy}
          aria-label={ariaLabel}
          checked={checked}
          disabled={disabled}
          id={id}
          onCheckedChange={(value) => {
            onChange(value === true);
          }}
        />
        {/* The size of the label, so that the line is its line and not the page's: ADR 0071. */}
        <div className="min-w-0 flex-1 text-sm">
          {typeof title === 'string' ? (
            <Label className={cn(disabled && 'text-muted-foreground')} htmlFor={id}>
              {title}
            </Label>
          ) : (
            title
          )}
        </div>
      </div>
      {/* In line with the title: the box is 16px wide and the gap 12px. */}
      {note !== undefined && (
        <div className={cn('mt-1 pl-7', besideField && 'sm:mt-2')}>{note}</div>
      )}
    </div>
  );
}
