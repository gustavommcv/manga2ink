import { Note } from '@/renderer/components/shared/note';
import { cn } from '@/renderer/lib/utils';

/**
 * One of several exclusive choices, each with what it means under its name: a radio with its words in a
 * box. The choices of one group share a `field`; `help` is what the choice is, or why it cannot be had.
 */
export function Choice({
  checked,
  disabled = false,
  field,
  help,
  id,
  label,
  onChoose,
}: {
  readonly checked: boolean;
  readonly disabled?: boolean;
  readonly field: string;
  readonly help: string;
  readonly id: string;
  readonly label: string;
  readonly onChoose: () => void;
}): React.JSX.Element {
  return (
    <label
      className={cn(
        'border-border has-focus-visible:ring-ring flex cursor-pointer items-start gap-3 rounded-lg border p-3 has-focus-visible:ring-2',
        checked && 'border-accent bg-accent/5',
        disabled && 'cursor-not-allowed opacity-60',
      )}
      htmlFor={id}
    >
      <input
        aria-describedby={`${id}-help`}
        checked={checked}
        className="accent-accent mt-1 size-4 shrink-0"
        disabled={disabled}
        id={id}
        name={field}
        onChange={onChoose}
        type="radio"
      />
      <span className="min-w-0 flex-1 space-y-0.5">
        <span className="block text-sm font-medium">{label}</span>
        <Note id={`${id}-help`}>{help}</Note>
      </span>
    </label>
  );
}
