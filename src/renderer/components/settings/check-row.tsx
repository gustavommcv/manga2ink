import type { ReactNode } from 'react';

import { cn } from '@/renderer/lib/utils';

/**
 * A checkbox with its words (ADR 0071): the box is on the line of the title, centered on it, one rule for
 * the steps of the queue and for the choices of the options page. What goes in `note` (what a step uses,
 * a description, or why the box cannot be changed) is under the row, in line with the title; however
 * long it is, it does not move the box.
 *
 * `besideField` is for a choice that sits in a grid next to a field that has a label above its control:
 * where there are two columns, the row is then as high as that control and the box and the title are
 * centered on it, below an empty slot as high as the label, so the choice is in line with the control
 * and its note with the field's own. A choice beside another choice, or alone, is not moved, and in one
 * column (a narrow window) there is no slot to leave empty.
 */
export function CheckRow({
  besideField = false,
  box,
  note,
  title,
}: {
  readonly besideField?: boolean;
  readonly box: ReactNode;
  readonly note?: ReactNode;
  readonly title: ReactNode;
}): React.JSX.Element {
  return (
    <div data-beside-field={besideField ? '' : undefined} data-slot="check-row">
      {besideField && (
        <div aria-hidden="true" className="mb-2 hidden h-5 sm:block" data-slot="check-row-lead" />
      )}
      <div className={cn('flex items-center gap-3', besideField && 'sm:min-h-9')}>
        {box}
        <div className="min-w-0 flex-1">{title}</div>
      </div>
      {/* In line with the title: the box is 16px wide and the gap 12px. */}
      {note !== undefined && (
        <div className={cn('mt-1 pl-7', besideField && 'sm:mt-2')}>{note}</div>
      )}
    </div>
  );
}
