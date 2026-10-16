import { randomUUID } from 'node:crypto';
import { mkdir, rm, stat, statfs, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { ProcessingChoice } from '@/domain/app-settings';

import type { PendingRoots } from './fs-pending-runs';

/** Where, inside a folder a person chose, finished books wait to be saved. */
export const pendingFolderName = 'Pending';
/** Where, inside a folder a person chose, volumes are built while the app converts. */
export const scratchFolderName = 'Scratch';

/** The places the app works in until a person chooses another: its own data, and the system's temporary folder. */
export interface ProcessingDefaults {
  readonly pending: string;
  readonly scratch: string;
}

/**
 * Why a folder cannot be worked in. `unavailable` is a folder that was chosen and is not there now (a
 * drive that was taken out); `unusable` is one that cannot be chosen: not a folder, not an absolute
 * path, or one the app cannot write in.
 */
export class ProcessingFolderError extends Error {
  constructor(
    readonly reason: 'unavailable' | 'unusable',
    message: string,
    options?: { readonly cause: unknown },
  ) {
    super(message, options);
    this.name = 'ProcessingFolderError';
  }
}

export interface ProcessingFoldersIo {
  readonly isDirectory: (folder: string) => Promise<boolean>;
  readonly makeDirectory: (folder: string) => Promise<void>;
  /** Writes a file and removes it again; throws when the folder cannot be written in. */
  readonly probeWrite: (folder: string) => Promise<void>;
  /** The bytes a person can still write on the drive `folder` is on, or null when it cannot be said. */
  readonly freeBytes: (folder: string) => Promise<number | null>;
}

/** What the disk is asked, so the answers to the ways it can fail can be tried without failing a disk. */
export interface DiskCalls {
  readonly stat: (folder: string) => Promise<{ readonly isDirectory: () => boolean }>;
  readonly statfs: (folder: string) => Promise<{ readonly bavail: number; readonly bsize: number }>;
  readonly mkdir: (folder: string, options: { readonly recursive: true }) => Promise<unknown>;
  readonly writeFile: (file: string, contents: string) => Promise<void>;
  readonly rm: (file: string, options: { readonly force: true }) => Promise<void>;
  readonly createId: () => string;
}

const realDisk: DiskCalls = { stat, statfs, mkdir, writeFile, rm, createId: randomUUID };

/** A path that is not there, or has a file where a folder should be, as against one that cannot be looked at. */
function isMissing(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  return code === 'ENOENT' || code === 'ENOTDIR';
}

export function diskIoOver(disk: DiskCalls): ProcessingFoldersIo {
  return {
    isDirectory: async (folder) => {
      try {
        return (await disk.stat(folder)).isDirectory();
      } catch (error) {
        if (isMissing(error)) return false;
        throw error;
      }
    },
    makeDirectory: async (folder) => {
      await disk.mkdir(folder, { recursive: true });
    },
    probeWrite: async (folder) => {
      const probe = path.join(folder, `.mangabound-write-test-${disk.createId()}`);
      await disk.writeFile(probe, '');
      await disk.rm(probe, { force: true });
    },
    freeBytes: async (folder) => {
      // The folder may not be made yet: the drive is the one the nearest folder that is there is on.
      for (let here = folder; ; here = path.dirname(here)) {
        try {
          const space = await disk.statfs(here);
          return space.bavail * space.bsize;
        } catch (error) {
          if (!isMissing(error) || path.dirname(here) === here) return null;
        }
      }
    },
  };
}

const diskIo = diskIoOver(realDisk);

/**
 * Where the app works (ADR 0055). With no folder chosen it is where it always was: finished books
 * wait in its own data folder and volumes are built in the system's temporary folder. With a folder
 * chosen both are inside it, in `Pending` and `Scratch`, so that a person can point the app at a
 * drive with room. The choice is read each time, so a change is the next thing the app does.
 *
 * Nothing falls back: a chosen folder that is not there is an error that says so, and not a quiet
 * return to a temporary folder that may be the very reason the folder was chosen.
 */
export class ProcessingFolders {
  constructor(
    private readonly defaults: ProcessingDefaults,
    private readonly choice: () => ProcessingChoice,
    private readonly io: ProcessingFoldersIo = diskIo,
  ) {}

  /** The folder a person chose, or null while the app picks the places. */
  chosen(): string | null {
    return this.choice().folder;
  }

  pendingRoot(): string {
    const { folder } = this.choice();
    return folder === null ? this.defaults.pending : path.join(folder, pendingFolderName);
  }

  scratchRoot(): string {
    const { folder } = this.choice();
    return folder === null ? this.defaults.scratch : path.join(folder, scratchFolderName);
  }

  /**
   * Every folder finished books may be waiting in: the one in use, then the app's own (a folder
   * that was chosen after books were made there), then the ones chosen before.
   */
  pendingRoots(): readonly string[] {
    return unique([
      this.pendingRoot(),
      this.defaults.pending,
      ...this.choice().earlier.map((folder) => path.join(folder, pendingFolderName)),
    ]);
  }

  /** Every folder a volume that was being built may have been left in, as `pendingRoots`. */
  scratchRoots(): readonly string[] {
    return unique([
      this.scratchRoot(),
      this.defaults.scratch,
      ...this.choice().earlier.map((folder) => path.join(folder, scratchFolderName)),
    ]);
  }

  /** The pending folders, as `FsPendingRuns` asks for them. */
  asPendingRoots(): PendingRoots {
    return {
      current: () => this.pendingRoot(),
      all: () => this.pendingRoots(),
      prepare: async () => {
        await this.prepare();
      },
    };
  }

  /**
   * Gets the places in use ready, and says where they are. A chosen folder that is not there is not
   * made: that would put it on the drive the app is on when the one it was meant for is not plugged in.
   */
  async prepare(): Promise<{ readonly pending: string; readonly scratch: string }> {
    const { folder } = this.choice();
    if (folder !== null && !(await this.io.isDirectory(folder))) {
      throw new ProcessingFolderError(
        'unavailable',
        `The processing folder ${folder} is not available. Connect it again, or choose another one in the app settings.`,
      );
    }
    const places = { pending: this.pendingRoot(), scratch: this.scratchRoot() };
    await this.io.makeDirectory(places.pending);
    await this.io.makeDirectory(places.scratch);
    return places;
  }

  /**
   * Whether a folder can be worked in: a folder that is there, with a path that does not depend on
   * where the app was started, in which the app can make its two folders and write. Makes them.
   */
  async check(folder: string): Promise<void> {
    if (!path.isAbsolute(folder) || !(await this.io.isDirectory(folder))) {
      throw new ProcessingFolderError('unusable', `${folder} is not a folder the app can work in.`);
    }
    try {
      await this.io.makeDirectory(path.join(folder, pendingFolderName));
      await this.io.makeDirectory(path.join(folder, scratchFolderName));
      await this.io.probeWrite(path.join(folder, pendingFolderName));
    } catch (cause) {
      throw new ProcessingFolderError('unusable', `The app cannot write in ${folder}.`, { cause });
    }
  }

  /** Whether the folder a person chose is there now; the app's own places always are. */
  available(): Promise<boolean> {
    const { folder } = this.choice();
    return folder === null ? Promise.resolve(true) : this.io.isDirectory(folder);
  }

  /** Whether a folder is there: an earlier one may be on a drive that is not connected now. */
  exists(folder: string): Promise<boolean> {
    return this.io.isDirectory(folder);
  }

  /** What is left on the drive finished books are kept on, or null when that cannot be said. */
  freeBytes(): Promise<number | null> {
    return this.io.freeBytes(this.pendingRoot());
  }
}

function unique(folders: readonly string[]): readonly string[] {
  return folders.filter((folder, index) => folders.indexOf(folder) === index);
}
