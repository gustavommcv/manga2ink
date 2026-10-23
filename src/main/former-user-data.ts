import { existsSync, mkdirSync, readdirSync, renameSync, rmdirSync } from 'node:fs';
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
};

/** The files the app keeps its settings in; one of them there means it has started before. */
const settingsFiles = ['app-settings.json', 'settings.json', 'window-state.json'];

/**
 * What the app keeps in its settings folder: the settings, the logs and, on macOS, the books not
 * yet saved and their covers. Everything else in the folder is Electron's own.
 */
const ownEntries = [...settingsFiles, 'logs', 'Pending', 'Covers'];

function isEmptyFolder(folder: string, fileSystem: FormerUserDataFileSystem): boolean {
  try {
    return fileSystem.entries(folder).length === 0;
  } catch {
    return false;
  }
}

/**
 * Moves what Mangabound kept in its settings folder (its settings, window state and logs and, on
 * macOS, its pending books and covers) to Manga2Ink's, the first time Manga2Ink starts (ADR 0085,
 * ADR 0087). Returns what could not be moved, for the log once it is open.
 *
 * The first time is told by Manga2Ink's own settings files: as long as none is there, Manga2Ink has
 * not started before. The folder itself says nothing, since Electron makes it and puts its caches
 * in it, and the installer's own runs of the app leave them there before the app first opens. So
 * what Mangabound kept moves one entry at a time, beside Electron's: an entry already there stays,
 * unless it is an empty folder, which Mangabound's replaces. Files that are not open can be moved
 * while Mangabound runs, so nothing waits for it to close.
 *
 * Only the app's own folder is filled this way: a settings folder chosen on the command line (a
 * test's, for one) is never filled with a person's.
 */
export function moveFormerUserData(
  appData: string,
  userData: string,
  fileSystem: FormerUserDataFileSystem = diskFileSystem,
): readonly string[] {
  if (path.relative(path.resolve(appData), path.dirname(path.resolve(userData))) !== '') return [];
  const former = path.join(appData, formerName);
  if (path.resolve(former).toLowerCase() === path.resolve(userData).toLowerCase()) return [];
  if (!fileSystem.exists(former)) return [];
  if (settingsFiles.some((name) => fileSystem.exists(path.join(userData, name)))) return [];
  const problems: string[] = [];
  for (const name of ownEntries) {
    const from = path.join(former, name);
    const to = path.join(userData, name);
    if (!fileSystem.exists(from)) continue;
    try {
      if (fileSystem.exists(to)) {
        if (!isEmptyFolder(to, fileSystem)) continue;
        fileSystem.removeEmptyFolder(to);
      }
      fileSystem.makeFolder(userData);
      fileSystem.rename(from, to);
    } catch (error) {
      problems.push(
        `Could not move ${from} to ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return problems;
}
