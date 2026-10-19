import { FolderOpen, X } from 'lucide-react';

import type { AttachedCover, CoverSlot } from '@/domain/book-covers';
import type { AnyMessage } from '@/domain/message';
import { Button } from '@/renderer/components/ui/button';
import { useMessages, useSay } from '@/renderer/hooks/use-messages';
import { Note } from '@/renderer/components/shared/note';

/** What the covers of an item can be told to do; the item itself is the page's. */
export interface BookCoverControls {
  readonly attached: readonly AttachedCover[];
  /** What the last change left to say: images that were not used, covers that were kept. */
  readonly note?: readonly AnyMessage[];
  readonly onChoose: (slot: CoverSlot) => void;
  readonly onRemove: (slot: CoverSlot) => void;
  readonly onChooseFolder: () => void;
  /** Files dropped on one book, or on the list when no book is named. */
  readonly onDropFiles: (slot: CoverSlot | undefined, files: readonly File[]) => void;
}

interface BookCoversProps extends BookCoverControls {
  /** The books the item makes, in order. Empty while a series has no volumes yet. */
  readonly books: readonly { readonly slot: CoverSlot; readonly title: string }[];
  /** Why covers have no effect right now, when they have none. */
  readonly unavailable?: string;
}

const carriesFiles = (event: React.DragEvent): boolean =>
  event.dataTransfer.types.includes('Files');

/**
 * A cover of the person's own for each book of an item (ADR 0040): chosen or dropped for one
 * book, or taken from a folder in order. A book without one keeps its first page.
 */
export function BookCovers({
  attached,
  books,
  note,
  onChoose,
  onChooseFolder,
  onDropFiles,
  onRemove,
  unavailable,
}: BookCoversProps): React.JSX.Element {
  const words = useMessages().details.covers;
  const { sayAll } = useSay();
  const coverOf = (slot: CoverSlot): AttachedCover | undefined =>
    attached.find((cover) => cover.slot === slot);
  const dropOn = (slot: CoverSlot | undefined) => (event: React.DragEvent) => {
    if (!carriesFiles(event)) return;
    event.preventDefault();
    // A drop on a book is that book's alone; the list around it must not take it again.
    event.stopPropagation();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) onDropFiles(slot, files);
  };
  const allowDrop = (event: React.DragEvent): void => {
    if (carriesFiles(event)) event.preventDefault();
  };

  return (
    <section
      aria-labelledby="book-covers-title"
      className="border-border bg-surface space-y-4 rounded-xl border p-6"
      onDragOver={allowDrop}
      onDrop={dropOn(undefined)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-56 flex-1">
          <h2 className="text-lg font-semibold" id="book-covers-title">
            {words.title}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">{unavailable ?? words.help}</p>
        </div>
        {books.length > 0 && (
          <Button onClick={onChooseFolder} variant="outline">
            <FolderOpen /> {words.addFolder}
          </Button>
        )}
      </div>
      {books.length === 0 ? (
        <p className="text-muted-foreground text-sm">{words.onceSet}</p>
      ) : (
        <ul aria-label={words.list}>
          {books.map((book) => {
            const cover = coverOf(book.slot);
            return (
              <li
                className="border-border flex items-center gap-3 border-t py-2.5 first:border-t-0"
                key={String(book.slot)}
                onDragOver={allowDrop}
                onDrop={dropOn(book.slot)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{book.title}</p>
                  <Note className="truncate">
                    {cover === undefined
                      ? words.firstPage
                      : cover.origin === 'folder'
                        ? words.fromFolder(cover.name)
                        : cover.name}
                  </Note>
                </div>
                <Button
                  aria-label={
                    cover === undefined ? words.choose(book.title) : words.change(book.title)
                  }
                  onClick={() => {
                    onChoose(book.slot);
                  }}
                  size="sm"
                  variant="outline"
                >
                  {cover === undefined ? words.chooseButton : words.changeButton}
                </Button>
                {cover !== undefined && (
                  <Button
                    aria-label={words.remove(book.title)}
                    onClick={() => {
                      onRemove(book.slot);
                    }}
                    size="icon"
                    variant="outline"
                  >
                    <X />
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {note !== undefined && <Note role="status">{sayAll(note)}</Note>}
    </section>
  );
}
