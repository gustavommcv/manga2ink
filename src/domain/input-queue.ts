import { type BookDetails, hasBookDetails, normalizeBookDetails } from './book-details';
import { chooseVersions, clearVersionChoice, pendingVersionGroups } from './chapter-versions';
import { hasItemOptions, type ItemOptions } from './item-options';
import { onlyLinksNote } from './library-links';
import { hasArchiveChapters, type MappingDraft, mappingSignature } from './mapping';
import { type AnyMessage, message } from './message';
import {
  archivesReason,
  libraryReason,
  type ModeInput,
  type ProcessMode,
  resolveMode,
} from './process-mode';
import { unrecognizedChaptersNote, unrecognizedInLibraryNote } from './unrecognized-chapters';

/** What can be added to the queue: a folder or one comic archive. */
export type QueueInputKind = 'folder' | 'cbz';

/**
 * What a row turned out to be. A library, a folder of manga folders, only shows itself once a
 * folder has been read: it is added like any other folder.
 */
export type QueueRowKind = QueueInputKind | 'library';

/**
 * How the books of a series are made (ADR 0094): one for each volume, which is what a series is until
 * its person says otherwise; one for the whole series, which needs no volumes; or, for a folder, as it
 * is, with nothing grouped. It is the choice of each series, made where its chapters are grouped.
 */
export type BooksChoice = 'volumes' | 'series' | 'as-is';

/** What a row holds of that choice: one for each volume is no choice, and is not kept. */
export type OwnBooks = Exclude<BooksChoice, 'volumes'>;

/** What a run did with one manga of a library. */
export type TitleOutcome =
  { readonly status: 'done' } | { readonly status: 'failed'; readonly message: AnyMessage };

/** One manga folder of a library: the grouping mangabind proposed for it, and how it went. */
export interface LibraryTitle {
  readonly title: string;
  readonly draft: MappingDraft;
  readonly volumes: readonly { readonly name: string; readonly pageCount: number }[];
  readonly outcome?: TitleOutcome;
  /** What was typed for this title's title, author and language (ADR 0030). */
  readonly details?: BookDetails;
  /** What this title is converted with differently from the queue's options (ADR 0046). */
  readonly options?: ItemOptions;
  /** Folders of the title that could not be read as chapters, and are in no book. */
  readonly unrecognized?: readonly string[];
}

/**
 * A title as it is read, before any run has done anything with it. It carries the author and
 * language kept with its folder, when there are any (ADR 0032).
 */
export type ReadTitle = Omit<LibraryTitle, 'options' | 'outcome'>;

interface QueueRowBase {
  /** The id the main process registered the input under. */
  readonly id: string;
  readonly kind: QueueRowKind;
  readonly displayName: string;
  readonly displayPath: string;
}

export type QueueRow = QueueRowBase &
  (
    | { readonly state: 'inspecting' }
    | { readonly state: 'unreadable'; readonly message: AnyMessage }
    | {
        readonly state: 'inspected';
        readonly sessionId: string;
        readonly mapping?: MappingDraft;
        /** What mangabind proposed, so a later change can be told apart from the start. */
        readonly proposedSignature?: string;
        /** The user opened the editor and accepted the mapping, gaps included. */
        readonly confirmed: boolean;
        /** The manga a library holds. */
        readonly titles?: readonly LibraryTitle[];
        /** What was typed for this input's title, author and language (ADR 0030). */
        readonly details?: BookDetails;
        /** What this input is converted with differently from the queue's options (ADR 0046). */
        readonly options?: ItemOptions;
        /** How its books are made, when not one for each volume (ADR 0094). */
        readonly books?: OwnBooks;
        /** Folders of the manga that could not be read as chapters, and are in no book. */
        readonly unrecognized?: readonly string[];
        /** Links in a library folder that were not followed: manga that are in no list of titles. */
        readonly skippedLinks?: readonly string[];
      }
  );

export type InspectedRow = Extract<QueueRow, { readonly state: 'inspected' }>;

export interface QueueInput {
  readonly id: string;
  readonly kind: QueueInputKind;
  readonly displayName: string;
  readonly displayPath: string;
}

export type QueueAction =
  | { readonly type: 'add'; readonly inputs: readonly QueueInput[] }
  | {
      readonly type: 'inspected';
      readonly id: string;
      readonly sessionId: string;
      /** What the folder was taken for once read; a library is only known by reading it. */
      readonly kind?: QueueRowKind;
      readonly mapping?: MappingDraft;
      readonly titles?: readonly ReadTitle[];
      /** The author and language kept with the folder, when there are any. */
      readonly details?: BookDetails;
      /** Folders that could not be read as chapters. */
      readonly unrecognized?: readonly string[];
      /** Links in the folder that were not followed. */
      readonly skippedLinks?: readonly string[];
    }
  | { readonly type: 'inspect-failed'; readonly id: string; readonly message: AnyMessage }
  /** The library was read again, after a title had its volumes saved. Saved titles stay saved. */
  | {
      readonly type: 'library-planned';
      readonly id: string;
      readonly titles: readonly ReadTitle[];
    }
  | {
      readonly type: 'library-results';
      readonly id: string;
      readonly results: readonly { readonly title: string; readonly outcome: TitleOutcome }[];
    }
  | { readonly type: 'confirm-mapping'; readonly id: string; readonly mapping: MappingDraft }
  /**
   * Which of the files that claim a chapter to use: one, several or none; with no files, the choice is
   * taken back and the chapter waits for one again.
   */
  | {
      readonly type: 'set-versions';
      readonly id: string;
      readonly token: string;
      readonly use: readonly string[] | undefined;
    }
  /** How the books of this input are made; one for each volume puts it back. */
  | { readonly type: 'set-books'; readonly id: string; readonly books: BooksChoice }
  | { readonly type: 'set-details'; readonly id: string; readonly details: BookDetails }
  | {
      readonly type: 'set-title-details';
      readonly id: string;
      readonly title: string;
      readonly details: BookDetails;
    }
  /** The options this input is converted with differently from the queue's; none puts it back. */
  | {
      readonly type: 'set-options';
      readonly id: string;
      readonly options: ItemOptions | undefined;
    }
  | {
      readonly type: 'set-title-options';
      readonly id: string;
      readonly title: string;
      readonly options: ItemOptions | undefined;
    }
  /** Every input and title follows the queue's options again, whatever it had set of its own. */
  | { readonly type: 'clear-options' }
  | { readonly type: 'remove'; readonly ids: readonly string[] }
  | { readonly type: 'clear' };

export const emptyQueue: readonly QueueRow[] = [];

export function queueReducer(rows: readonly QueueRow[], action: QueueAction): readonly QueueRow[] {
  switch (action.type) {
    case 'add': {
      // The same folder or file added twice (a second drop, a re-pick) stays one row.
      const known = new Set(rows.map((row) => row.displayPath));
      const added: QueueRow[] = [];
      for (const input of action.inputs) {
        if (known.has(input.displayPath)) continue;
        known.add(input.displayPath);
        added.push({ ...input, state: 'inspecting' });
      }
      return added.length === 0 ? rows : [...rows, ...added];
    }
    case 'inspected':
      return rows.map((row) =>
        row.id === action.id && row.state === 'inspecting'
          ? {
              id: row.id,
              kind: action.kind ?? row.kind,
              displayName: row.displayName,
              displayPath: row.displayPath,
              state: 'inspected',
              sessionId: action.sessionId,
              confirmed: false,
              ...(action.mapping === undefined
                ? {}
                : { mapping: action.mapping, proposedSignature: mappingSignature(action.mapping) }),
              ...(action.titles === undefined ? {} : { titles: action.titles.map(readTitle) }),
              ...(action.details === undefined || !hasBookDetails(action.details)
                ? {}
                : { details: normalizeBookDetails(action.details) }),
              ...(action.unrecognized === undefined || action.unrecognized.length === 0
                ? {}
                : { unrecognized: action.unrecognized }),
              ...(action.skippedLinks === undefined || action.skippedLinks.length === 0
                ? {}
                : { skippedLinks: action.skippedLinks }),
            }
          : row,
      );
    case 'inspect-failed':
      return rows.map((row) =>
        row.id === action.id && row.state === 'inspecting'
          ? {
              id: row.id,
              kind: row.kind,
              displayName: row.displayName,
              displayPath: row.displayPath,
              state: 'unreadable',
              message: action.message,
            }
          : row,
      );
    case 'library-planned':
      return rows.map((row) =>
        row.id === action.id && row.state === 'inspected' && row.titles !== undefined
          ? {
              ...row,
              titles: action.titles.map((planned) => {
                const saved = row.titles?.find((known) => known.title === planned.title);
                // What a person typed for a title is theirs, and outlives the library being read again;
                // what the read found kept with its folder only fills in where nothing was typed.
                const details = saved?.details ?? planned.details;
                return {
                  ...readTitle(planned),
                  ...(details === undefined ? {} : { details }),
                  // What a person chose for a title is theirs too.
                  ...(saved?.options === undefined ? {} : { options: saved.options }),
                  ...(saved?.outcome?.status === 'done' ? { outcome: saved.outcome } : {}),
                };
              }),
            }
          : row,
      );
    case 'library-results':
      return rows.map((row) =>
        row.id === action.id && row.state === 'inspected' && row.titles !== undefined
          ? {
              ...row,
              titles: row.titles.map((title) => {
                const result = action.results.find((candidate) => candidate.title === title.title);
                return result === undefined ? title : { ...title, outcome: result.outcome };
              }),
            }
          : row,
      );
    case 'confirm-mapping':
      return rows.map((row) =>
        row.id === action.id && row.state === 'inspected'
          ? { ...row, mapping: action.mapping, confirmed: true }
          : row,
      );
    case 'set-versions':
      return rows.map((row) =>
        row.id === action.id && row.state === 'inspected' && row.mapping !== undefined
          ? { ...row, mapping: withVersions(row.mapping, action.token, action.use) }
          : row,
      );
    case 'set-books':
      return rows.map((row) =>
        row.id === action.id && row.state === 'inspected' ? withBooks(row, action.books) : row,
      );
    case 'set-details':
      return rows.map((row) =>
        row.id === action.id && row.state === 'inspected'
          ? { ...row, details: normalizeBookDetails(action.details) }
          : row,
      );
    case 'set-title-details':
      return rows.map((row) =>
        row.id === action.id && row.state === 'inspected' && row.titles !== undefined
          ? {
              ...row,
              titles: row.titles.map((title) =>
                title.title === action.title
                  ? { ...title, details: normalizeBookDetails(action.details) }
                  : title,
              ),
            }
          : row,
      );
    case 'set-options':
      return rows.map((row) =>
        row.id === action.id && row.state === 'inspected' ? withOptions(row, action.options) : row,
      );
    case 'set-title-options':
      return rows.map((row) =>
        row.id === action.id && row.state === 'inspected' && row.titles !== undefined
          ? {
              ...row,
              titles: row.titles.map((title) =>
                title.title === action.title ? withOptions(title, action.options) : title,
              ),
            }
          : row,
      );
    case 'clear-options':
      return rows.map((row) => {
        if (row.state !== 'inspected') return row;
        const own = hasItemOptions(row.options);
        const ofTitles = row.titles?.some((title) => hasItemOptions(title.options)) ?? false;
        if (!own && !ofTitles) return row;
        const cleared = withOptions(row, undefined);
        return row.titles === undefined
          ? cleared
          : { ...cleared, titles: row.titles.map((title) => withOptions(title, undefined)) };
      });
    case 'remove': {
      const removed = new Set(action.ids);
      return rows.filter((row) => !removed.has(row.id));
    }
    case 'clear':
      return emptyQueue;
  }
}

/** The draft with a choice among the files of a chapter made or taken back; the same draft if the chapter is not one. */
function withVersions(
  mapping: MappingDraft,
  token: string,
  use: readonly string[] | undefined,
): MappingDraft {
  try {
    return use === undefined
      ? clearVersionChoice(mapping, token)
      : chooseVersions(mapping, token, use);
  } catch {
    return mapping;
  }
}

/**
 * The row with these books. A comic file is one book already and a library is joined title by title, so
 * neither can be left as it is: what a row cannot have is not given to it.
 */
function withBooks(row: InspectedRow, books: BooksChoice): InspectedRow {
  if (row.kind === 'cbz') return row;
  const { books: previous, ...rest } = row;
  void previous;
  if (books === 'volumes' || (row.kind === 'library' && books === 'as-is')) return rest;
  return { ...rest, books };
}

/** The row or title with these options of its own, or without any when there are none. */
function withOptions<T extends { readonly options?: ItemOptions }>(
  target: T,
  options: ItemOptions | undefined,
): T {
  const { options: previous, ...rest } = target;
  void previous;
  return (hasItemOptions(options) ? { ...rest, options } : rest) as T;
}

/** Keeps what the queue needs of a title, dropping anything else the read carried. */
function readTitle(title: ReadTitle): ReadTitle {
  return {
    title: title.title,
    draft: title.draft,
    volumes: title.volumes,
    ...(title.details === undefined || !hasBookDetails(title.details)
      ? {}
      : { details: normalizeBookDetails(title.details) }),
    ...(title.unrecognized === undefined || title.unrecognized.length === 0
      ? {}
      : { unrecognized: title.unrecognized }),
  };
}

/** A title a run would make books of: it has volumes, and was not already saved. */
export function isPendingTitle(title: LibraryTitle): boolean {
  return title.volumes.length > 0 && title.outcome?.status !== 'done';
}

/** A title with no volumes yet: a run leaves it out until it has some. */
export function isWaitingTitle(title: LibraryTitle): boolean {
  return title.volumes.length === 0 && title.outcome?.status !== 'done';
}

/** The scratch sessions a set of rows holds, which must be released when the rows go away. */
export function sessionIds(rows: readonly QueueRow[]): readonly string[] {
  return rows.flatMap((row) => (row.state === 'inspected' ? [row.sessionId] : []));
}

export function unassignedChapterCount(mapping: MappingDraft): number {
  const assigned = new Set(mapping.volumes.flatMap((volume) => volume.chapterIds));
  return mapping.chapters.filter((chapter) => !assigned.has(chapter.id)).length;
}

/** How the books of a row are made: what it was given, and one for each volume where it was given none. */
export function booksOf(row: QueueRow): BooksChoice {
  if (row.state !== 'inspected' || row.kind === 'cbz') return 'volumes';
  if (row.kind === 'library') return row.books === 'series' ? 'series' : 'volumes';
  return row.books ?? 'volumes';
}

/**
 * The process a row gets under the steps of the queue and its own books: a series made into one book is
 * joined and converted, a folder left as it is is only converted, and the steps are for the rest, which
 * is how the other options of a row go too: its own choice is above the queue's.
 */
export function rowProcess(row: QueueRow, mode: ProcessMode): ProcessMode | 'skip' {
  const books = booksOf(row);
  if (books === 'series') return 'bind-and-convert';
  if (books === 'as-is') return 'convert-only';
  return rowMode(row.kind, mode);
}

/**
 * The process a row gets under the chosen mode, or `skip` when the mode has nothing to do for it:
 * a CBZ is already one volume, so a run that only joins volumes leaves it alone rather than
 * converting something the user did not ask to convert.
 */
export function rowMode(kind: QueueRowKind, mode: ProcessMode): ProcessMode | 'skip' {
  if (kind === 'cbz' && mode === 'bind-only') return 'skip';
  // A library is joined title by title first: asked not to group, it is left out, not grouped anyway.
  if (kind === 'library' && mode === 'convert-only') return 'skip';
  return resolveMode(kind, mode);
}

/**
 * What the steps of the queue are limited to: a queue of one kind only limits them to what that kind
 * allows, and a mixed one does not. A queue of folders that all hold chapters that are CBZ files
 * cannot skip joining them.
 */
export function queueModeInput(rows: readonly QueueRow[]): ModeInput {
  const first = rows[0];
  if (first === undefined) return 'folder';
  if (rows.every((row) => row.kind === first.kind) && first.kind !== 'folder') return first.kind;
  const archives = (row: QueueRow): boolean =>
    row.state === 'inspected' && row.kind === 'folder' && hasArchiveChapters(row.mapping);
  return rows.every(archives) ? 'archives' : 'folder';
}

export type RowTone = 'neutral' | 'accent' | 'warning' | 'danger';

export interface RowView {
  /** The short status shown on the row. */
  readonly chip: AnyMessage;
  readonly tone: RowTone;
  /** The line under the name. */
  readonly detail: AnyMessage;
  /** Whether a run would process this row (otherwise it is left out and reported). */
  readonly runnable: boolean;
  /** Why the row is left out, or something worth knowing about it: sentences that follow one another. */
  readonly notes: readonly AnyMessage[];
}

export function describeRow(row: QueueRow, mode: ProcessMode): RowView {
  const view = describeRowBase(row, mode);
  // Folders the tool could not read as chapters are in no book, whatever else the row says.
  const told = row.state === 'inspected' ? leftOutNote(row) : undefined;
  return told === undefined ? view : { ...view, notes: [...view.notes, told] };
}

function leftOutNote(row: InspectedRow): AnyMessage | undefined {
  return row.kind === 'library'
    ? unrecognizedInLibraryNote(
        (row.titles ?? []).map((title) => ({
          title: title.title,
          names: title.unrecognized ?? [],
        })),
      )
    : unrecognizedChaptersNote(row.unrecognized ?? []);
}

function describeRowBase(row: QueueRow, mode: ProcessMode): RowView {
  if (row.state === 'inspecting') {
    return {
      chip: message('queue.chip.checking', {}),
      tone: 'neutral',
      detail:
        row.kind === 'folder'
          ? message('queue.detail.folderReading', {})
          : message('queue.detail.cbzChecking', {}),
      runnable: false,
      notes: [],
    };
  }
  if (row.state === 'unreadable') {
    return {
      chip: message('queue.chip.unreadable', {}),
      tone: 'danger',
      detail:
        row.kind === 'folder'
          ? message('queue.detail.folder', {})
          : message('queue.detail.cbz', {}),
      runnable: false,
      // Why it could not be read is what the tool or the system said, in their own words.
      notes: [row.message],
    };
  }
  if (row.kind === 'cbz') {
    return rowMode('cbz', mode) === 'skip'
      ? {
          chip: message('queue.chip.nothingToJoin', {}),
          tone: 'neutral',
          detail: message('queue.detail.cbzOneVolume', {}),
          runnable: false,
          notes: [message('mode.cbzIsOneVolume', {})],
        }
      : {
          chip: message('queue.chip.ready', {}),
          tone: 'neutral',
          detail: message('queue.detail.cbzStraight', {}),
          runnable: true,
          notes: [],
        };
  }

  if (row.kind === 'library') return describeLibrary(row, mode);

  const process = rowProcess(row, mode);
  const series = booksOf(row) === 'series';
  const stepsNote = stepsNotHere(row, mode);
  const chapters = row.mapping?.chapters.length ?? 0;
  const volumes = row.mapping?.volumes.length ?? 0;
  const unassigned = row.mapping === undefined ? 0 : unassignedChapterCount(row.mapping);
  if (process === 'convert-only' && hasArchiveChapters(row.mapping)) {
    // Chapters that are CBZ files are not pages the converter can read from the folder.
    return {
      chip: message('queue.chip.needsGrouping', {}),
      tone: 'warning',
      detail: message('queue.detail.folderChapters', { chapters, grouping: 'plain' }),
      runnable: false,
      notes: [archivesReason],
    };
  }
  if (process === 'convert-only') {
    return {
      chip: message('queue.chip.oneBook', {}),
      tone: 'neutral',
      detail: message('queue.detail.folderChapters', { chapters, grouping: 'not-grouped' }),
      runnable: true,
      notes: stepsNote,
    };
  }
  if (chapters === 0) {
    return {
      chip: message('queue.chip.notRecognized', {}),
      tone: 'danger',
      detail: message('queue.detail.folderNoChapters', {}),
      runnable: false,
      // A folder of links holds manga that were not read, and grouping is not why none was found.
      notes: [
        row.skippedLinks === undefined
          ? message('queue.note.noChapters', {})
          : onlyLinksNote(row.skippedLinks),
      ],
    };
  }
  // Only volumes the names gave are "from names": a folder whose names give none has not been grouped.
  const grouping =
    volumes > 0 &&
    row.mapping !== undefined &&
    row.proposedSignature !== undefined &&
    mappingSignature(row.mapping) === row.proposedSignature
      ? 'from-names'
      : 'plain';
  const detail = message('queue.detail.folderChapters', { chapters, grouping });
  // Files that claim one chapter are not decided by the app: nothing runs until a person has.
  const undecided = pendingVersionGroups(row.mapping).length;
  if (undecided > 0) {
    return {
      chip: message('queue.chip.reviewVersions', {}),
      tone: 'warning',
      detail,
      runnable: false,
      notes: [message('queue.note.versionsPending', { count: undecided })],
    };
  }
  // The whole series is one book, and a series with no volumes is one book of its chapters: nothing
  // is missing, and nothing is left out for want of a volume (ADR 0094).
  if (series && volumes === 0) {
    return {
      chip: message('queue.chip.wholeSeries', {}),
      tone: 'accent',
      detail,
      runnable: true,
      notes: stepsNote,
    };
  }
  if (volumes === 0 || (unassigned > 0 && !row.confirmed)) {
    return {
      chip: message('queue.chip.needsVolumes', {}),
      tone: 'warning',
      detail,
      runnable: false,
      notes: [
        volumes === 0
          ? message('queue.note.noVolumesYet', {})
          : message('queue.note.unassigned', { count: unassigned }),
      ],
    };
  }
  return {
    chip: series
      ? message('queue.chip.wholeSeries', {})
      : message('queue.chip.volumes', { count: volumes }),
    tone: 'accent',
    detail,
    runnable: true,
    notes: [
      ...stepsNote,
      ...(unassigned > 0 ? [message('queue.note.chaptersLeftOut', { count: unassigned })] : []),
    ],
  };
}

/**
 * What a row says when its own books are above the steps of the queue: they are not what it is made
 * with, and a person who turned a step off would not otherwise be told that this row ignores it.
 */
function stepsNotHere(row: InspectedRow, mode: ProcessMode): readonly AnyMessage[] {
  const process = rowProcess(row, mode);
  if (process === rowMode(row.kind, mode)) return [];
  return process === 'convert-only'
    ? [message('queue.note.stepsNotForAsIs', {})]
    : [
        message('queue.note.stepsNotForSeries', {
          of: row.kind === 'library' ? 'library' : 'series',
        }),
      ];
}

function describeLibrary(row: InspectedRow, mode: ProcessMode): RowView {
  const titles = row.titles ?? [];
  const detail = message('queue.detail.library', { titles: titles.length });
  if (titles.length === 0) {
    return {
      chip: message('queue.chip.notRecognized', {}),
      tone: 'danger',
      detail,
      runnable: false,
      notes: [message('queue.note.libraryEmpty', {})],
    };
  }
  if (rowProcess(row, mode) === 'skip') {
    return {
      chip: message('queue.chip.needsGrouping', {}),
      tone: 'neutral',
      detail,
      runnable: false,
      notes: [libraryReason],
    };
  }
  const pending = titles.filter(isPendingTitle);
  const waiting = titles.filter(isWaitingTitle);
  if (pending.length === 0) {
    return waiting.length === 0
      ? {
          chip: message('queue.chip.saved', {}),
          tone: 'neutral',
          detail,
          runnable: false,
          notes: [],
        }
      : {
          chip: message('queue.chip.needsVolumes', {}),
          tone: 'warning',
          detail,
          runnable: false,
          notes: [message('queue.note.titlesNeedVolumes', { count: waiting.length })],
        };
  }
  const failed = titles.filter((title) => title.outcome?.status === 'failed');
  const notes = [
    ...(waiting.length === 0
      ? []
      : [message('queue.note.titlesLeftOut', { count: waiting.length })]),
    ...(failed.length === 0 ? [] : [message('queue.note.titlesFailed', { count: failed.length })]),
  ];
  const volumes = pending.reduce((count, title) => count + title.volumes.length, 0);
  return {
    chip: message('queue.chip.titles', { count: pending.length }),
    tone: 'accent',
    detail: message('queue.detail.libraryVolumes', { titles: titles.length, volumes }),
    runnable: true,
    notes: [...stepsNotHere(row, mode), ...notes],
  };
}

export interface QueueSummary {
  readonly total: number;
  /** Rows a run would process. */
  readonly runnable: number;
  /** Rows a run would leave out and report. */
  readonly skipped: number;
  /** Rows still being read: a run should wait for them. */
  readonly inspecting: number;
}

export function summarizeQueue(rows: readonly QueueRow[], mode: ProcessMode): QueueSummary {
  let runnable = 0;
  let inspecting = 0;
  for (const row of rows) {
    if (row.state === 'inspecting') inspecting += 1;
    else if (describeRow(row, mode).runnable) runnable += 1;
  }
  return { total: rows.length, runnable, skipped: rows.length - runnable - inspecting, inspecting };
}

/**
 * How many inputs, and titles of libraries, are converted with options of their own (ADR 0046):
 * what the options page of the queue says does not reach them for the options they set.
 */
export function itemsWithOptions(rows: readonly QueueRow[]): number {
  let count = 0;
  for (const row of rows) {
    if (row.state !== 'inspected') continue;
    if (hasItemOptions(row.options)) count += 1;
    count += row.titles?.filter((title) => hasItemOptions(title.options)).length ?? 0;
  }
  return count;
}

/** The rows a run processes, in the order the user added them, each with its process. */
export function runnableRows(
  rows: readonly QueueRow[],
  mode: ProcessMode,
): readonly { readonly row: InspectedRow; readonly mode: ProcessMode }[] {
  const result: { readonly row: InspectedRow; readonly mode: ProcessMode }[] = [];
  for (const row of rows) {
    if (row.state !== 'inspected') continue;
    const process = rowProcess(row, mode);
    if (process === 'skip' || !describeRow(row, mode).runnable) continue;
    result.push({ row, mode: process });
  }
  return result;
}
