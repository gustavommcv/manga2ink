import type { PipelineIssue } from './conversion';
import { lastPathPart } from './folder-names';
import { type AnyMessage, message } from './message';

/**
 * The names of the folders `mangabind` could not read as chapters, from what it reported. It says
 * so once for each (`unparsed_chapter`, with the folder's path), and such a folder is in no volume
 * and in no book: it is not in the draft the editor works with, so nothing else shows it is there.
 */
export function unrecognizedChapterNames(issues: readonly PipelineIssue[]): readonly string[] {
  return issues
    .filter((issue) => issue.code === 'unparsed_chapter' && issue.path !== undefined)
    .map((issue) => lastPathPart(issue.path!))
    .filter((name) => name !== '');
}

/**
 * What a person is told about those folders: that they are left out, which ones, and what to do.
 * `mangabind` reads a name for a chapter number, and the fix is in the name, since the app has no
 * way to place a folder whose chapter it cannot tell. Nothing is said when there are none.
 */
export function unrecognizedChaptersNote(
  names: readonly string[],
  /** What is added again once the names are fixed: the folder, or the library the title is in. */
  again: 'folder' | 'library' = 'folder',
): AnyMessage | undefined {
  return names.length === 0
    ? undefined
    : message('queue.note.unrecognizedChapters', { names, again });
}

/** The same for a library: the folders are named under the title they are in. */
export function unrecognizedInLibraryNote(
  titles: readonly { readonly title: string; readonly names: readonly string[] }[],
): AnyMessage | undefined {
  const affected = titles.filter((title) => title.names.length > 0);
  return affected.length === 0
    ? undefined
    : message('queue.note.unrecognizedInLibrary', { titles: affected });
}
