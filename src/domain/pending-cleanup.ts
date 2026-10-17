/**
 * How long a conversion may have waited, untouched, before the clean-up of the Processing tab offers
 * to delete it (ADR 0061). The window names one of these; it never says a folder or a run.
 */
export const idleDays = [7, 30, 90] as const;

export type IdleDays = (typeof idleDays)[number];

/** What is waiting to be saved, or what a clean-up would take or took: conversions, their books, their size. */
export interface WaitingBooks {
  readonly runs: number;
  readonly books: number;
  readonly bytes: number;
}
