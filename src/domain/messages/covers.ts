import type { NoValues } from './values';

/**
 * What a person is told after a cover was chosen or a folder of covers was taken, in the words of a
 * code (ADR 0053). Several of them follow one another as the sentences of one note.
 */
export interface CoversMessageValues {
  readonly 'covers.typesSentence': NoValues;
  readonly 'covers.unreadableFile': NoValues;
  readonly 'covers.noImageFound': NoValues;
  readonly 'covers.kept': { readonly count: number };
  readonly 'covers.imagesUnreadable': {
    readonly count: number;
    /** The names of the first images that could not be read. */
    readonly names: readonly string[];
    /** How many more could not be read than are named. */
    readonly more: number;
  };
  readonly 'covers.unused': { readonly count: number; readonly books: number };
  readonly 'covers.fewImages': { readonly images: number; readonly books: number };
}
