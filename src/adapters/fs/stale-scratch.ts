import type { Dirent } from 'node:fs';
import { readdir, rm } from 'node:fs/promises';
import path from 'node:path';

import { newestChange } from './newest-change';

/**
 * The name `mkdtemp` gives a scratch workspace made with the prefix `manga2ink-`, or with
 * `mangabound-` by a version from before the app's new name (ADR 0085): six letters or digits, and
 * nothing else. The test folders and the acquisition script's own use longer names.
 */
const workspaceName = /^(?:manga2ink|mangabound)-[A-Za-z0-9]{6}$/u;

/**
 * Removes the scratch workspaces an earlier run of the app left in the temporary folder, and says
 * which. A workspace holds every volume bound during a run and is removed when the run lets go of
 * it, so one that is still there was left by a run that was killed; on Windows nothing else clears
 * the temporary folder. One changed more recently than `olderThanMs` ago is left, since it may
 * belong to another copy of the app that is still working.
 */
export async function removeStaleScratch(
  root: string,
  olderThanMs: number,
  now = Date.now(),
): Promise<readonly string[]> {
  const removed: string[] = [];
  let children: Dirent[];
  try {
    children = await readdir(root, { withFileTypes: true });
  } catch (error) {
    // A folder that was chosen for the app to work in and is not there now has nothing to clear.
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOENT' || code === 'ENOTDIR') return removed;
    throw error;
  }
  for (const child of children) {
    if (!child.isDirectory() || !workspaceName.test(child.name)) continue;
    const scratch = path.join(root, child.name);
    if (now - (await newestChange(scratch)) <= olderThanMs) continue;
    await rm(scratch, { recursive: true, force: true });
    removed.push(child.name);
  }
  return removed;
}
