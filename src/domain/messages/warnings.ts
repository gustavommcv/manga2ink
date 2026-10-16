import type { NoValues } from './values';

/**
 * The warnings the app has words for: each is a code the tools say, and the app writes the heading
 * and the advice for it itself, since a tool's sentence is written for a terminal.
 */
export const knownWarningCodes = [
  'images_smaller_than_device',
  'source_already_converted',
  'skipped_non_images',
  'spread_labels_ignored',
  'spread_labels_skipped',
  'output_collision',
  'page_truncated',
  // From mangabind, which joins the chapters, not from mangapress: the notes it gives when it had
  // to leave something out of a book.
  'chapter_conflict',
  'chapter_gap',
  'empty_chapter',
  'link_skipped',
  'unsupported_page_files',
  'page_entries_too_large',
] as const;

export type KnownWarningCode = (typeof knownWarningCodes)[number];

/** What the results say of the warnings a run gave its books, in the words of a code (ADR 0053). */
export interface WarningMessageValues {
  readonly 'warning.title': { readonly code: KnownWarningCode };
  readonly 'warning.advice': { readonly code: KnownWarningCode };
  /** The heading of a note from a tool that a later version added, under which its own sentence is said. */
  readonly 'warning.unknownTitle': NoValues;
  readonly 'warning.inAll': { readonly count: number };
  readonly 'warning.inOne': { readonly first: string };
  readonly 'warning.inTwo': { readonly first: string; readonly second: string };
  readonly 'warning.inMore': {
    readonly first: string;
    readonly second: string;
    readonly more: number;
  };
}
