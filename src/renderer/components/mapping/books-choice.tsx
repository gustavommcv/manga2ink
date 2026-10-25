import type { BookFormat } from '@/domain/conversion';
import type { BooksChoice as Books } from '@/domain/input-queue';
import { Choice } from '@/renderer/components/shared/choice';
import { useMessages } from '@/renderer/hooks/use-messages';

/**
 * How the books of a series are made (ADR 0094), chosen where its chapters are grouped: one for each
 * volume, one for the whole series, or the folder as it is. What is said under the second is what the
 * book is in the format it will be made in, when that is known. `asIsReason` is why the third cannot be
 * had, for a folder whose chapters are archives that have to be joined before they can be converted.
 */
export function BooksChoice({
  asIsReason,
  format,
  onChange,
  value,
}: {
  readonly asIsReason?: string | undefined;
  readonly format?: BookFormat | undefined;
  readonly onChange: (books: Books) => void;
  readonly value: Books;
}): React.JSX.Element {
  const words = useMessages().mapping.editor.books;
  return (
    <fieldset className="border-border bg-surface space-y-2 rounded-xl border p-5">
      <legend className="px-1 text-sm font-semibold">{words.legend}</legend>
      <Choice
        checked={value === 'volumes'}
        field="books"
        help={words.perVolume.help}
        id="books-volumes"
        label={words.perVolume.label}
        onChoose={() => {
          onChange('volumes');
        }}
      />
      <Choice
        checked={value === 'series'}
        field="books"
        help={format === undefined ? words.series.help : words.series.produces[format]}
        id="books-series"
        label={words.series.label}
        onChoose={() => {
          onChange('series');
        }}
      />
      <Choice
        checked={value === 'as-is'}
        disabled={asIsReason !== undefined}
        field="books"
        help={asIsReason ?? words.asIs.help}
        id="books-as-is"
        label={words.asIs.label}
        onChoose={() => {
          onChange('as-is');
        }}
      />
    </fieldset>
  );
}
