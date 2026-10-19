import {
  FileArchive,
  Folder,
  Layers,
  Library,
  LoaderCircle,
  SlidersHorizontal,
  UserPen,
  X,
} from 'lucide-react';

import { hasBookDetails } from '@/domain/book-details';
import { describeRow, type QueueRow, rowMode } from '@/domain/input-queue';
import { hasItemOptions } from '@/domain/item-options';
import { type ProcessMode, usesMangapress } from '@/domain/process-mode';
import { Badge } from '@/renderer/components/shared/badge';
import { ListRow } from '@/renderer/components/shared/list-row';
import { Button } from '@/renderer/components/ui/button';
import { useMessages, useSay } from '@/renderer/hooks/use-messages';
import { cn } from '@/renderer/lib/utils';

/** One item in the queue: what it is, whether a run will process it, and how to change that. */
export function QueueRowItem({
  mode,
  onEdit,
  onEditDetails,
  onEditOptions,
  onRemove,
  row,
}: {
  readonly mode: ProcessMode;
  readonly onEdit: () => void;
  /** Opens the title, author and language of the item. */
  readonly onEditDetails: () => void;
  /** Opens the conversion options of the item, which are the queue's until it sets its own. */
  readonly onEditOptions: () => void;
  readonly onRemove: () => void;
  readonly row: QueueRow;
}): React.JSX.Element {
  const words = useMessages().queue.row;
  const { say, sayAll } = useSay();
  const view = describeRow(row, mode);
  const Icon = row.kind === 'folder' ? Folder : row.kind === 'library' ? Library : FileArchive;
  // A folder or a library has volumes to edit, and only while volumes are in play.
  const editable = row.state === 'inspected' && row.kind !== 'cbz' && mode !== 'convert-only';
  // A book's own title, author and language matter where mangapress makes the book. A library
  // has them per title, from the screen that lists its titles.
  const process = rowMode(row.kind, mode);
  const detailsEditable =
    row.state === 'inspected' &&
    row.kind !== 'library' &&
    process !== 'skip' &&
    usesMangapress(process);
  const detailsSet = row.state === 'inspected' && hasBookDetails(row.details);
  // Its conversion options matter wherever mangapress makes the book; a library has them per title.
  const optionsSet = row.state === 'inspected' && hasItemOptions(row.options);
  return (
    <ListRow
      actions={[
        editable ? (
          <Button
            aria-label={
              row.kind === 'library'
                ? words.editTitlesOf(row.displayName)
                : words.editVolumesFor(row.displayName)
            }
            onClick={onEdit}
            size="icon"
            title={row.kind === 'library' ? words.editTitles : words.editVolumes}
            variant="ghost"
          >
            <Layers />
          </Button>
        ) : undefined,
        detailsEditable ? (
          <Button
            aria-label={words.editDetailsOf(row.displayName)}
            className={cn(detailsSet && 'text-accent')}
            onClick={onEditDetails}
            size="icon"
            title={words.editDetails(detailsSet)}
            variant="ghost"
          >
            <UserPen />
          </Button>
        ) : undefined,
        detailsEditable ? (
          <Button
            aria-label={words.editOptionsOf(row.displayName)}
            className={cn(optionsSet && 'text-override')}
            onClick={onEditOptions}
            size="icon"
            title={words.editOptions(optionsSet)}
            variant="ghost"
          >
            <SlidersHorizontal />
          </Button>
        ) : undefined,
        <Button
          aria-label={words.remove(row.displayName)}
          onClick={onRemove}
          size="icon"
          variant="ghost"
        >
          <X />
        </Button>,
      ]}
      detail={say(view.detail)}
      icon={row.state === 'inspecting' ? <LoaderCircle className="animate-spin" /> : <Icon />}
      {...(view.notes.length > 0 ? { notes: sayAll(view.notes) } : {})}
      status={<Badge tone={view.tone}>{say(view.chip)}</Badge>}
      title={row.displayName}
      titleHint={row.displayPath}
    />
  );
}
