import { Folder, Layers, SlidersHorizontal, UserPen } from 'lucide-react';

import { hasBookDetails } from '@/domain/book-details';
import {
  type BooksChoice,
  isPendingTitle,
  isWaitingTitle,
  type LibraryTitle,
} from '@/domain/input-queue';
import { hasItemOptions } from '@/domain/item-options';
import { skippedLinksNotice } from '@/domain/library-links';
import { unassignedChapterCount } from '@/domain/input-queue';
import { Button } from '@/renderer/components/ui/button';
import { SegmentedControl } from '@/renderer/components/ui/segmented-control';
import { useMessages, useSay, useSentenceMarks } from '@/renderer/hooks/use-messages';
import { Badge } from '@/renderer/components/shared/badge';
import { InfoBanner } from '@/renderer/components/shared/info-banner';
import { ListRow } from '@/renderer/components/shared/list-row';
import { Field } from '@/renderer/components/shared/field';
import { Screen } from '@/renderer/components/shared/screen';
import { ScreenHeader } from '@/renderer/components/shared/screen-header';
import { cn } from '@/renderer/lib/utils';

/** A library is joined title by title first, so it cannot be left as it is. */
type LibraryBooks = Exclude<BooksChoice, 'as-is'>;

export interface LibraryScreenProps {
  /** How the books of the library are made: one for each volume of a title, or one for each title (ADR 0094). */
  readonly books?: LibraryBooks;
  readonly name: string;
  readonly onBack: () => void;
  readonly onBooks?: (books: LibraryBooks) => void;
  readonly onEdit: (title: string) => void;
  /** Absent when the run does not make books with mangaprep, so there is nothing to edit. */
  readonly onEditDetails?: (title: string) => void;
  /** Absent when the run does not make books with mangaprep, so there are no options to set. */
  readonly onEditOptions?: (title: string) => void;
  /** Links in the library folder that were not followed: series that are not in the list. */
  readonly skippedLinks?: readonly string[];
  readonly titles: readonly LibraryTitle[];
}

/** The manga a library holds, and which of them still need their volumes grouped. */
export function LibraryScreen({
  books = 'volumes',
  name,
  onBack,
  onBooks,
  onEdit,
  onEditDetails,
  onEditOptions,
  skippedLinks = [],
  titles,
}: LibraryScreenProps): React.JSX.Element {
  const messages = useMessages();
  const words = messages.library;
  return (
    <Screen labelledBy="library-title" width="form">
      <ScreenHeader
        back={{ label: messages.queue.title, onBack }}
        description={words.summary(titles.length)}
        id="library-title"
        title={name}
      />
      {skippedLinks.length > 0 && <SkippedLinks names={skippedLinks} />}
      {onBooks !== undefined && (
        <Field
          description={books === 'series' ? words.books.seriesNote : words.books.perVolumeNote}
          label={words.books.label}
        >
          <SegmentedControl
            label={words.books.label}
            onChange={onBooks}
            options={[
              { value: 'volumes', label: words.books.perVolume },
              { value: 'series', label: words.books.series },
            ]}
            value={books}
          />
        </Field>
      )}
      <ul aria-label={words.titles} className="space-y-0.5">
        {titles.map((title) => (
          <TitleRow
            key={title.title}
            onEdit={onEdit}
            {...(onEditDetails === undefined ? {} : { onEditDetails })}
            {...(onEditOptions === undefined ? {} : { onEditOptions })}
            title={title}
          />
        ))}
      </ul>
    </Screen>
  );
}

/** Series kept as links are not in the list below, and nothing else says so. */
function SkippedLinks({ names }: { readonly names: readonly string[] }): React.JSX.Element {
  const { say } = useSay();
  const { gap, stop } = useSentenceMarks();
  const notice = skippedLinksNotice(names);
  return (
    <InfoBanner
      message={
        <>
          {say(notice.advice)}
          {gap}
          <strong className="text-foreground">{say(notice.names)}</strong>
          {stop}
        </>
      }
      title={say(notice.title)}
    />
  );
}

function TitleRow({
  onEdit,
  onEditDetails,
  onEditOptions,
  title,
}: {
  readonly onEdit: (title: string) => void;
  readonly onEditDetails?: (title: string) => void;
  readonly onEditOptions?: (title: string) => void;
  readonly title: LibraryTitle;
}): React.JSX.Element {
  const { say } = useSay();
  const messages = useMessages();
  const words = messages.library;
  const row = messages.queue.row;
  const saved = title.outcome?.status === 'done';
  const failed = title.outcome?.status === 'failed';
  const unassigned = unassignedChapterCount(title.draft);
  const chip = saved
    ? { label: words.chips.saved, tone: 'neutral' as const }
    : failed
      ? { label: words.chips.failed, tone: 'danger' as const }
      : isWaitingTitle(title)
        ? { label: words.chips.needsVolumes, tone: 'warning' as const }
        : { label: words.chips.volumes(title.volumes.length), tone: 'accent' as const };
  return (
    <ListRow
      // A saved title has none of its buttons, and leaves their places, so that the state of every
      // title is in one column.
      actions={[
        saved ? undefined : (
          <Button
            aria-label={row.editVolumesFor(title.title)}
            onClick={() => {
              onEdit(title.title);
            }}
            size="icon"
            title={row.editVolumes}
            variant="ghost"
          >
            <Layers />
          </Button>
        ),
        ...(onEditDetails === undefined
          ? []
          : [
              saved ? undefined : (
                <Button
                  aria-label={row.editDetailsOf(title.title)}
                  className={cn(hasBookDetails(title.details) && 'text-accent')}
                  onClick={() => {
                    onEditDetails(title.title);
                  }}
                  size="icon"
                  title={row.editDetails(hasBookDetails(title.details))}
                  variant="ghost"
                >
                  <UserPen />
                </Button>
              ),
            ]),
        ...(onEditOptions === undefined
          ? []
          : [
              saved ? undefined : (
                <Button
                  aria-label={row.editOptionsOf(title.title)}
                  className={cn(hasItemOptions(title.options) && 'text-override')}
                  onClick={() => {
                    onEditOptions(title.title);
                  }}
                  size="icon"
                  title={words.editOptions(hasItemOptions(title.options))}
                  variant="ghost"
                >
                  <SlidersHorizontal />
                </Button>
              ),
            ]),
      ]}
      detail={words.chapters(
        title.draft.chapters.length,
        unassigned > 0 && isPendingTitle(title) ? unassigned : 0,
      )}
      icon={<Folder />}
      {...(title.outcome?.status === 'failed' ? { notes: say(title.outcome.message) } : {})}
      status={<Badge tone={chip.tone}>{chip.label}</Badge>}
      title={title.title}
    />
  );
}
