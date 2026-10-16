/**
 * What the screen of a library says of the links in its folder that were not followed, in the words
 * of a code (ADR 0053).
 */
export interface LibraryMessageValues {
  /** How many folders of the library were links, and so were not read. */
  readonly 'library.links.title': { readonly count: number };
  readonly 'library.links.advice': { readonly count: number };
  /** The names of those links, as many as are spelled out and how many more there are. */
  readonly 'library.links.names': { readonly names: readonly string[] };
}
