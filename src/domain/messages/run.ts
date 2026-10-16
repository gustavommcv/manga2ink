import type { NoValues } from './values';

/** Where a book is among the volumes a title makes: its 1-based number, out of how many. */
export interface VolumePosition {
  readonly number: number;
  readonly count: number;
}

/**
 * How a plan or a run treats the books: made from each volume, saved as the joined volumes without
 * running mangapress, or one book for the whole series.
 */
export type RunShape = 'books' | 'joined' | 'series';

/**
 * What a run says while it goes on, what a validated plan says of what it found, and the line under
 * the results, in the words of a code (ADR 0053). The workflows and the tools' adapters make them
 * and write no sentence of their own, so the window says them in its language.
 */
export interface RunMessageValues {
  /** The first thing a run says, before any tool has reported. */
  readonly 'progress.preparing': NoValues;
  readonly 'progress.inspecting': { readonly title: string };
  readonly 'progress.organizing': { readonly title: string };
  readonly 'progress.organizingChapters': { readonly chapters: number };
  readonly 'progress.bindingLibrary': NoValues;
  readonly 'progress.buildingVolume': { readonly volume: number; readonly volumes: number };
  readonly 'progress.converting': {
    readonly title?: string;
    readonly volume: VolumePosition;
  };
  readonly 'progress.savingVolume': {
    readonly title?: string;
    readonly volume: VolumePosition;
  };
  readonly 'progress.pageProcessed': { readonly completed: number; readonly total: number };
  /** A stage of the conversion began; `stage` is the tool's own word for it. */
  readonly 'progress.stageStarted': { readonly stage: string };
  readonly 'progress.savingBook': NoValues;
  readonly 'progress.volumesConverted': {
    readonly title?: string;
    readonly done: number;
    readonly total: number;
  };
  readonly 'progress.booksSaved': { readonly count: number };

  /** What validating one book or folder found, by the tool that read it. */
  readonly 'plan.mangapress': {
    readonly profile: string;
    readonly width: number;
    readonly height: number;
    /** A folder that is made one book, its chapters not grouped into volumes. */
    readonly chaptersNotGrouped: boolean;
  };
  readonly 'plan.mangabind': { readonly volumes: number; readonly shape: RunShape };
  readonly 'plan.library': {
    readonly titles: number;
    readonly volumes: number;
    readonly books: number;
    readonly shape: RunShape;
  };

  /** The line under the results: how the books were made. */
  readonly 'summary.joined': NoValues;
  readonly 'summary.books': {
    readonly device: string;
    /** The format as the file's extension is written, in capitals. */
    readonly format: string;
    /** How many of the items were made with options of their own. */
    readonly ownOptions: number;
  };
  readonly 'summary.earlier': NoValues;
}
