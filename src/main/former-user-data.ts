import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  renameSync,
  rmdirSync,
} from 'node:fs';
import path from 'node:path';

import { formerName } from '@/adapters/library/pending-path';

/** What moving the former settings folder needs from the file system. */
export interface FormerUserDataFileSystem {
  readonly exists: (target: string) => boolean;
  /** The names in a folder; throws when it cannot be read as one. */
  readonly entries: (folder: string) => readonly string[];
  readonly removeEmptyFolder: (folder: string) => void;
  readonly makeFolder: (folder: string) => void;
  readonly rename: (from: string, to: string) => void;
  /** Whether a running app holds this file open, as Chromium holds its `lockfile` on Windows. */
  readonly held: (file: string) => boolean;
}

function held(file: string): boolean {
  try {
    closeSync(openSync(file, 'r+'));
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EBUSY';
  }
}

/** The disk itself. */
export const diskFileSystem: FormerUserDataFileSystem = {
  exists: existsSync,
  entries: (folder) => readdirSync(folder),
  removeEmptyFolder: (folder) => {
    rmdirSync(folder);
  },
  makeFolder: (folder) => {
    mkdirSync(folder, { recursive: true });
  },
  rename: renameSync,
  held,
};

/**
 * What came of it: nothing left to move (moved now, before, or never there), Mangabound still open,
 * or what went wrong, for the log once it is open.
 */
export type FormerUserDataMove =
  | { readonly kind: 'settled' }
  | { readonly kind: 'former-open' }
  | { readonly kind: 'failed'; readonly problem: string };

const settled: FormerUserDataMove = { kind: 'settled' };

function isEmpty(folder: string, fileSystem: FormerUserDataFileSystem): boolean {
  try {
    return fileSystem.entries(folder).length === 0;
  } catch {
    return false;
  }
}

/**
 * Moves the folder Mangabound kept its settings, window state and logs in (and, on macOS, its
 * pending books and covers) to the one Manga2Ink uses, the first time Manga2Ink starts (ADR 0085).
 * It runs before anything puts something in the new folder, the single-instance lock included, so
 * the folder moves whole, in one rename beside itself.
 *
 * Electron makes the new folder, empty, the first time its path is asked for, so an empty one is
 * still a first start; one with anything in it is Manga2Ink's own, and nothing is moved. Only the
 * app's own folder is filled this way: a settings folder chosen on the command line (a test's, for
 * one) is never filled with a person's.
 *
 * On Windows a running Mangabound holds its folder, and a move that failed would never be tried
 * again, since the app would then fill the new folder. So the move waits: the caller says so and
 * quits before anything is put in the new folder, and the next start moves it.
 */
export function moveFormerUserData(
  appData: string,
  userData: string,
  platform: NodeJS.Platform = process.platform,
  fileSystem: FormerUserDataFileSystem = diskFileSystem,
): FormerUserDataMove {
  if (path.relative(path.resolve(appData), path.dirname(path.resolve(userData))) !== '') {
    return settled;
  }
  const former = path.join(appData, formerName);
  if (path.resolve(former).toLowerCase() === path.resolve(userData).toLowerCase()) return settled;
  if (!fileSystem.exists(former)) return settled;
  const made = fileSystem.exists(userData);
  if (made && !isEmpty(userData, fileSystem)) return settled;
  if (platform === 'win32' && fileSystem.held(path.join(former, 'lockfile'))) {
    return { kind: 'former-open' };
  }
  try {
    if (made) fileSystem.removeEmptyFolder(userData);
    fileSystem.rename(former, userData);
    return settled;
  } catch (error) {
    // Electron expects the folder it made to be there.
    try {
      fileSystem.makeFolder(userData);
    } catch {
      // The problem below is the one to tell.
    }
    return {
      kind: 'failed',
      problem: `Could not move ${former} to ${userData}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
