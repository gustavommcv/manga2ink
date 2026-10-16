import type { NoValues } from './values';

/** Why something given to the queue was not added, in the words of a code (ADR 0053). */
export interface InputMessageValues {
  readonly 'input.unreadable': NoValues;
  readonly 'input.onlyFoldersAndCbz': NoValues;
  /** What was past the limit of an add: it names no item, so it reads on its own. */
  readonly 'input.overLimit': { readonly left: number; readonly limit: number };
}
