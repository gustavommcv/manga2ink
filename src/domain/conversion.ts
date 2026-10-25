import { type BookDetails, volumeBookTitle } from './book-details';
import type { MappingDraft } from './mapping';
import type { AnyMessage } from './message';
import type { VolumePosition } from './messages/run';
import type { MangaprepSettings } from './output-profile';
import type { ProcessMode } from './process-mode';

export type InputKind = 'folder' | 'cbz';
/** What an input turned out to be once read: a library is a folder of manga folders. */
export type InspectedKind = InputKind | 'library';
export type BookFormat = 'epub' | 'cbz' | 'pdf';

export interface InputSelection {
  readonly inputPath: string;
  readonly displayName: string;
  readonly kind: InputKind;
}

/** One manga folder inside a library, with the grouping mangabind proposes for it. */
export interface InspectedTitle {
  readonly title: string;
  readonly draft: MappingDraft;
  readonly volumes: readonly PlannedBook[];
  readonly issues: readonly PipelineIssue[];
  /** The author and language kept with the title's folder, when there are any. */
  readonly details?: BookDetails;
  /** The names of the title's folders its tool could not read as chapters: left out of its books. */
  readonly unrecognized?: readonly string[];
}

export interface InspectedInput {
  readonly sessionId: string;
  readonly displayName: string;
  readonly kind: InspectedKind;
  readonly mapping?: MappingDraft;
  /** The author and language kept with the folder, when there are any. */
  readonly details?: BookDetails;
  /** The manga folders of a library. Their paths stay with the workflow. */
  readonly titles?: readonly InspectedTitle[];
  /** The names of the folders of a manga that its tool could not read as chapters: left out of every book. */
  readonly unrecognized?: readonly string[];
  /** The names of links in a library folder that its tool did not follow: no manga, and in no book. */
  readonly skippedLinks?: readonly string[];
  readonly issues: readonly PipelineIssue[];
}

export interface LibraryPlan {
  readonly titles: readonly InspectedTitle[];
  readonly issues: readonly PipelineIssue[];
}

export interface PipelineIssue {
  readonly tool: 'mangabind' | 'mangaprep' | 'manga2ink';
  readonly severity: 'warning' | 'error';
  readonly code: string;
  readonly stage: string;
  readonly recoverable: boolean;
  readonly message: string;
  readonly diagnostic?: string;
  readonly manga?: string;
  readonly volume?: string;
  readonly chapter?: string;
  readonly page?: number;
  readonly path?: string;
}

/** Something mangaprep noticed about a book and went on from: the book was still made. */
export interface BookWarning {
  /** The tool's stable code; what is shown is chosen by it, never by the English text. */
  readonly code: string;
  /** The tool's own sentence, shown as it is for a code the app does not know. */
  readonly message: string;
}

export interface ConversionArtifact {
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly bytes: number;
  readonly format: BookFormat;
  readonly title: string;
  readonly author: string;
  readonly warnings?: readonly BookWarning[];
}

/** A chapter of a planned book, called what the book's table of contents will call it. */
export interface PlannedChapter {
  readonly label: string;
  readonly pageCount: number;
}

export interface PlannedBook {
  readonly name: string;
  readonly pageCount: number;
  /** The one book a whole series is bound into: `name` is the series, and the window says what it makes. */
  readonly wholeSeries?: true;
  /** The file the book will be, with the extension of its format, when it is known before it is made. */
  readonly file?: string;
  /** The chapters in the book, in reading order, when the tool tells them. */
  readonly chapters?: readonly PlannedChapter[];
}

/**
 * The name of the book mangaprep makes of one joined volume, which is not the name of the CBZ
 * mangabind joined it into: the typed title and the number of the volume if there is a title, else
 * the file's own name, and the extension of the format chosen. (A Kobo's EPUB has another
 * extension, which this does not know.)
 */
export function plannedVolumeBookName(
  volume: { readonly name: string; readonly number?: number },
  typedTitle: string | undefined,
  format: BookFormat,
): string {
  const title =
    typedTitle !== undefined && volume.number !== undefined
      ? volumeBookTitle(typedTitle, volume.number)
      : volume.name.replace(/\.cbz$/iu, '');
  return `${title}.${format}`;
}

/** A combined series is one planned EPUB; its volumes remain table-of-contents sections. */
export function plannedSingleBook(
  title: string,
  volumes: readonly PlannedBook[],
  file?: string,
): PlannedBook {
  const chapters = volumes.flatMap((volume) => volume.chapters ?? []);
  return {
    name: title,
    pageCount: volumes.reduce((total, volume) => total + volume.pageCount, 0),
    wholeSeries: true,
    ...(file === undefined ? {} : { file }),
    ...(chapters.length === 0 ? {} : { chapters }),
  };
}

export interface WorkflowPlan {
  readonly tool: 'mangabind' | 'mangaprep';
  readonly title: string;
  /** What validating found, said by the window in its language. */
  readonly message: AnyMessage;
  readonly books: readonly PlannedBook[];
  readonly issues: readonly PipelineIssue[];
  /** The files left out because another version of their chapter was chosen, by name. */
  readonly leftOut?: readonly string[];
}

export interface BatchTitleOutcome {
  readonly title: string;
  readonly status: 'done' | 'failed';
  readonly artifacts: readonly ConversionArtifact[];
  readonly error?: unknown;
}

export interface VolumeConversionProgress {
  /** 1-based position in the bound series. */
  readonly number: number;
  readonly status: 'waiting' | 'processing' | 'saving' | 'done';
  readonly completed?: number;
  readonly total?: number;
}

export interface ConversionProgress {
  readonly stage: 'binding' | 'processing' | 'saving';
  /** What the run is doing, said by the window in its language. */
  readonly message: AnyMessage;
  /** The final page can be copied before the CBZ archive has closed successfully. */
  readonly bindingState?: 'started' | 'advanced' | 'completed';
  readonly title?: string;
  /** Which volume of the title this is about, when it is about one. */
  readonly volume?: VolumePosition;
  readonly chapter?: string;
  readonly page?: number;
  readonly completed?: number;
  readonly total?: number;
  /** Snapshot for the optional per-volume details; absent for a single book. */
  readonly volumes?: readonly VolumeConversionProgress[];
}

export interface ConversionRequest {
  readonly sessionId: string;
  readonly libraryPath: string;
  readonly settings: MangaprepSettings;
  readonly format: BookFormat;
  readonly mapping?: MappingDraft;
  /** Defaults to running both tools when omitted. */
  readonly mode?: ProcessMode;
  readonly singleBook?: boolean;
  /** What was typed for this input's title, author and language; the defaults apply otherwise. */
  readonly details?: BookDetails;
}

/**
 * A request the workflow refused. What it says to the person is `said`, a code the window writes in
 * its language (ADR 0053); the message of the error itself is that code, for the log.
 */
export class ConversionWorkflowError extends Error {
  constructor(
    readonly code:
      | 'binding_failed'
      | 'details_save_failed'
      | 'invalid_mapping'
      | 'invalid_settings'
      | 'mapping_save_failed'
      | 'mapping_required'
      | 'no_volumes'
      | 'not_a_library'
      | 'publish_failed'
      | 'session_not_found'
      | 'title_not_found'
      | 'unsupported_mode'
      | 'versions_pending',
    readonly said: AnyMessage,
    options?: ErrorOptions,
  ) {
    super(said.id, options);
    this.name = 'ConversionWorkflowError';
  }
}

export class ToolExecutionError extends Error {
  /** What the app says of it when the tool's own words are not what the person needs. */
  readonly said: AnyMessage | undefined;

  constructor(
    readonly issue: PipelineIssue,
    readonly exitCode: number | null,
    options?: ErrorOptions & { readonly said?: AnyMessage },
  ) {
    super(issue.message, options);
    this.name = 'ToolExecutionError';
    this.said = options?.said;
  }
}
