import { existsSync, renameSync } from 'node:fs';
import path from 'node:path';

import { formerName } from '@/adapters/library/pending-path';

/** What moving the former settings folder needs from the file system. */
export interface FormerUserDataFileSystem {
  readonly exists: (target: string) => boolean;
  readonly rename: (from: string, to: string) => void;
}

const nodeFileSystem: FormerUserDataFileSystem = { exists: existsSync, rename: renameSync };

/**
 * Moves the folder Mangabound kept its settings, window state and logs in (and, on macOS, its
 * pending books and covers) to the one Manga2Ink uses, the first time Manga2Ink starts (ADR 0085).
 * It runs before anything makes the new folder, the single-instance lock included, so the folder
 * moves whole, in one rename beside itself.
 *
 * Only the app's own folder is filled this way: a settings folder chosen on the command line (a
 * test's, for one) is never filled with a person's. Nothing is moved when the new folder is there
 * already. Returns what went wrong, for the log once it is open, or `undefined`.
 */
export function moveFormerUserData(
  appData: string,
  userData: string,
  fileSystem: FormerUserDataFileSystem = nodeFileSystem,
): string | undefined {
  if (path.relative(path.resolve(appData), path.dirname(path.resolve(userData))) !== '') {
    return undefined;
  }
  const former = path.join(appData, formerName);
  if (path.resolve(former).toLowerCase() === path.resolve(userData).toLowerCase()) return undefined;
  if (!fileSystem.exists(former) || fileSystem.exists(userData)) return undefined;
  try {
    fileSystem.rename(former, userData);
    return undefined;
  } catch (error) {
    return `Could not move ${former} to ${userData}: ${error instanceof Error ? error.message : String(error)}`;
  }
}
