import type { MappingDraft } from '@/domain/mapping';
import { Button } from '@/renderer/components/ui/button';
import { useMessages } from '@/renderer/hooks/use-messages';

export function MappingSummary({
  draft,
  onConfirm,
  onEdit,
}: {
  readonly draft: MappingDraft;
  readonly onConfirm: () => void;
  readonly onEdit: () => void;
}): React.JSX.Element {
  const words = useMessages().mapping;
  const volumes = [...draft.volumes].sort(
    (left, right) => Number(left.number) - Number(right.number),
  );
  const assignedCount = volumes.reduce((count, volume) => count + volume.chapterIds.length, 0);

  return (
    <section
      aria-labelledby="mapping-summary-title"
      className="border-border bg-surface rounded-xl border p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold" id="mapping-summary-title">
            {words.summary.title}
          </h2>
          <p className="text-muted-foreground mt-1 text-xs">
            {words.summary.counts(volumes.length, assignedCount, draft.chapters.length)}
          </p>
        </div>
        <Button onClick={onEdit} size="sm" variant="outline">
          {words.summary.edit}
        </Button>
      </div>
      <ol className="border-border mt-4 divide-y border-y">
        {volumes.map((volume) => {
          const chapterNames = draft.chapters
            .filter((chapter) => volume.chapterIds.includes(chapter.id))
            .map((chapter) => chapter.name);
          return (
            <li
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-sm"
              key={volume.id}
            >
              <span className="font-medium">{words.editor.chapters.volume(volume.number)}</span>
              <span className="text-muted-foreground min-w-0 truncate text-xs">
                {words.summary.volumeLine(
                  chapterNames.length,
                  chapterNames[0] ?? '',
                  chapterNames.at(-1) ?? '',
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-xs">{words.summary.review}</p>
        <Button onClick={onConfirm}>{words.summary.confirm}</Button>
      </div>
    </section>
  );
}
