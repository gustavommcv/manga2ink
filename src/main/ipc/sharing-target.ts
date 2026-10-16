import path from 'node:path';

/** What a share serves: the folder, the name the reader shows for it, and what kind of books it is. */
export interface SharingTarget {
  readonly path: string;
  readonly title: string;
  /** Every book that is ready to be saved, from all the pending conversions, and not one folder. */
  readonly readyBooks: boolean;
}

/**
 * What to serve when a library is shared. A pending conversion is asked for by its own folder, but
 * the books ready to be saved are all of them, and a person who shares them expects the book
 * converted next to arrive too: so a pending conversion stands for the folder that holds them
 * all. A conversion left in a folder the app worked in before (ADR 0055) is shared on its own, as
 * ready books too, since a folder named by its id would be what a reader showed. Any other folder is
 * served as it is, under its own name.
 */
export function sharingTarget(
  libraryPath: string,
  pendingRoot: string | undefined,
  earlierRoots: readonly string[] = [],
): SharingTarget {
  const parent = path.dirname(path.resolve(libraryPath));
  if (pendingRoot !== undefined && parent === path.resolve(pendingRoot)) {
    return { path: pendingRoot, title: 'Mangabound ready books', readyBooks: true };
  }
  if (earlierRoots.some((root) => path.resolve(root) === parent)) {
    return { path: libraryPath, title: 'Mangabound ready books', readyBooks: false };
  }
  return { path: libraryPath, title: path.basename(libraryPath), readyBooks: false };
}
