import type { NoValues } from './values';

/**
 * What the queue says about each of its rows (ADR 0053): a short status, the line under the name, and
 * what is worth knowing about the row. Each is a code and the values it is about; the window writes
 * it in its language.
 */
export interface QueueMessageValues {
  readonly 'queue.chip.checking': NoValues;
  readonly 'queue.chip.unreadable': NoValues;
  readonly 'queue.chip.nothingToJoin': NoValues;
  readonly 'queue.chip.ready': NoValues;
  readonly 'queue.chip.oneBook': NoValues;
  readonly 'queue.chip.notRecognized': NoValues;
  readonly 'queue.chip.needsVolumes': NoValues;
  readonly 'queue.chip.needsGrouping': NoValues;
  readonly 'queue.chip.saved': NoValues;
  readonly 'queue.chip.volumes': { readonly count: number };
  readonly 'queue.chip.titles': { readonly count: number };

  readonly 'queue.detail.folderReading': NoValues;
  readonly 'queue.detail.cbzChecking': NoValues;
  readonly 'queue.detail.folder': NoValues;
  readonly 'queue.detail.cbz': NoValues;
  readonly 'queue.detail.cbzOneVolume': NoValues;
  readonly 'queue.detail.cbzStraight': NoValues;
  readonly 'queue.detail.folderNoChapters': NoValues;
  /** A folder with chapters, and whether they are grouped, not grouped or grouped from their names. */
  readonly 'queue.detail.folderChapters': {
    readonly chapters: number;
    readonly grouping: 'plain' | 'not-grouped' | 'from-names';
  };
  readonly 'queue.detail.library': { readonly titles: number };
  readonly 'queue.detail.libraryVolumes': { readonly titles: number; readonly volumes: number };

  readonly 'queue.note.noChapters': NoValues;
  readonly 'queue.note.onlyLinks': { readonly names: readonly string[] };
  readonly 'queue.note.noVolumesYet': NoValues;
  readonly 'queue.note.unassigned': { readonly count: number };
  readonly 'queue.note.chaptersLeftOut': { readonly count: number };
  readonly 'queue.note.libraryEmpty': NoValues;
  readonly 'queue.note.titlesNeedVolumes': { readonly count: number };
  readonly 'queue.note.titlesLeftOut': { readonly count: number };
  readonly 'queue.note.titlesFailed': { readonly count: number };
  /** Folders mangabind could not read as chapters, and what is added again once they are renamed. */
  readonly 'queue.note.unrecognizedChapters': {
    readonly names: readonly string[];
    readonly again: 'folder' | 'library';
  };
  /** The same for a library: the folders are named under the title they are in. */
  readonly 'queue.note.unrecognizedInLibrary': {
    readonly titles: readonly { readonly title: string; readonly names: readonly string[] }[];
  };
}
