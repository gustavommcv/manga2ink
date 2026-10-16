import { ChevronLeft, Folder, Layers, SlidersHorizontal, UserPen } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { hasBookDetails } from '@/domain/book-details';
import { isPendingTitle, isWaitingTitle, type LibraryTitle } from '@/domain/input-queue';
import { hasItemOptions } from '@/domain/item-options';
import { skippedLinksNotice } from '@/domain/library-links';
import { unassignedChapterCount } from '@/domain/input-queue';
import { Button } from '@/renderer/components/ui/button';
import { useMessages, useSay } from '@/renderer/hooks/use-messages';
import { InfoBanner } from '@/renderer/components/shared/info-banner';
import { cn } from '@/renderer/lib/utils';

export interface LibraryScreenProps {
  readonly name: string;
  readonly onBack: () => void;
  readonly onEdit: (title: string) => void;
  /** Absent when the run does not make books with mangapress, so there is nothing to edit. */
  readonly onEditDetails?: (title: string) => void;
  /** Absent when the run does not make books with mangapress, so there are no options to set. */
  readonly onEditOptions?: (title: string) => void;
  readonly singleBook?: boolean;
  /** Links in the library folder that were not followed: series that are not in the list. */
  readonly skippedLinks?: readonly string[];
  readonly titles: readonly LibraryTitle[];
}

/** The manga a library holds, and which of them still need their volumes grouped. */
export function LibraryScreen({
  name,
  onBack,
  onEdit,
  onEditDetails,
  onEditOptions,
  singleBook,
  skippedLinks = [],
  titles,
}: LibraryScreenProps): React.JSX.Element {
  const messages = useMessages();
  const words = messages.library;
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  return (
    <section aria-labelledby="library-title" className="mx-auto max-w-3xl space-y-5">
      <Button onClick={onBack} variant="ghost">
        <ChevronLeft /> {messages.queue.title}
      </Button>
      <div>
        <h1
          className="focus-visible:ring-ring focus-visible:ring-offset-background rounded-md text-2xl font-semibold tracking-tight break-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          id="library-title"
          ref={titleRef}
          tabIndex={-1}
        >
          {name}
        </h1>
        <p className="text-subtle-foreground mt-1 text-sm">{words.summary(titles.length)}</p>
        {skippedLinks.length > 0 && <SkippedLinks names={skippedLinks} />}
        {singleBook && (
          <InfoBanner
            className="mt-3"
            message={words.singleBook.text}
            title={words.singleBook.title}
          />
        )}
      </div>
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
    </section>
  );
}

/** Series kept as links are not in the list below, and nothing else says so. */
function SkippedLinks({ names }: { readonly names: readonly string[] }): React.JSX.Element {
  const { say } = useSay();
  const notice = skippedLinksNotice(names);
  return (
    <InfoBanner
      className="mt-3"
      message={
        <>
          {say(notice.advice)} <strong className="text-foreground">{say(notice.names)}</strong>.
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
    ? { label: words.chips.saved, tone: 'bg-muted text-muted-foreground' }
    : failed
      ? { label: words.chips.failed, tone: 'bg-status-failed/15 text-status-failed' }
      : isWaitingTitle(title)
        ? { label: words.chips.needsVolumes, tone: 'bg-status-warning/15 text-status-warning' }
        : {
            label: words.chips.volumes(title.volumes.length),
            tone: 'bg-accent/15 text-accent',
          };
  return (
    <li className="hover:bg-muted/40 flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors">
      <span
        aria-hidden="true"
        className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg"
      >
        <Folder className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title.title}</p>
        <p className="text-subtle-foreground truncate text-xs">
          {words.chapters(
            title.draft.chapters.length,
            unassigned > 0 && isPendingTitle(title) ? unassigned : 0,
          )}
        </p>
        {title.outcome?.status === 'failed' && (
          <p className="text-muted-foreground mt-0.5 text-xs">{say(title.outcome.message)}</p>
        )}
      </div>
      <span
        className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap', chip.tone)}
      >
        {chip.label}
      </span>
      {saved ? (
        // Keeps the status chips of every title in one column: a space for each button the other
        // titles have.
        [onEdit, onEditDetails, onEditOptions]
          .filter((action) => action !== undefined)
          .map((_action, position) => (
            <span aria-hidden="true" className="size-9 shrink-0" key={String(position)} />
          ))
      ) : (
        <>
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
          {onEditDetails !== undefined && (
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
          )}
          {onEditOptions !== undefined && (
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
          )}
        </>
      )}
    </li>
  );
}
