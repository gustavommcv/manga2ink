import path from 'node:path';

import { pendingFolderName } from '@/adapters/library/processing-folders';
import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';

import type { MainContext } from './context';

type StatusContext = Pick<MainContext, 'appSettings' | 'pendingRuns' | 'processing'>;

/**
 * What the window is told of where the app works: the places in use, how much room the drive has,
 * and the other folders books are still waiting in, which stay listed (ADR 0056). It lets go of an
 * earlier folder once nothing is waiting in it, since there is nothing to look for there.
 */
export async function processingStatus(context: StatusContext): Promise<ProcessingFolderStatus> {
  const { appSettings, pendingRuns, processing } = context;
  if (appSettings === undefined || pendingRuns === undefined || processing === undefined) {
    throw new Error('Where the app works is not known yet.');
  }
  const runs = await pendingRuns.list();
  const waiting = (root: string): number =>
    runs
      .filter((run) => path.dirname(run.path) === root)
      .reduce((total, run) => total + run.books.length, 0);

  await forgetEmptiedFolders(
    context,
    runs.map((run) => path.dirname(run.path)),
  );

  const current = processing.pendingRoot();
  return {
    chosen: processing.chosen(),
    scratch: processing.scratchRoot(),
    pending: current,
    available: await processing.available(),
    freeBytes: await processing.freeBytes(),
    earlier: processing
      .pendingRoots()
      .filter((root) => root !== current)
      .map((folder) => ({ folder, books: waiting(folder) }))
      .filter((earlier) => earlier.books > 0),
  };
}

/**
 * Lets go of the earlier folders that are there and have no run in them. A folder that is not
 * there is kept: it may be a drive that is not connected, with books on it.
 */
export async function forgetEmptiedFolders(
  context: Pick<MainContext, 'appSettings' | 'processing'>,
  foldersWithRuns: readonly string[],
): Promise<void> {
  const { appSettings, processing } = context;
  if (appSettings === undefined || processing === undefined) return;
  const emptied: string[] = [];
  for (const folder of appSettings.processing().earlier) {
    if (foldersWithRuns.includes(path.join(folder, pendingFolderName))) continue;
    if (await processing.exists(folder)) emptied.push(folder);
  }
  await appSettings.forgetEarlierFolders(emptied);
}

/** At start-up: lets go of earlier folders that are there and hold nothing. */
export async function settleEarlierFolders(
  context: Pick<MainContext, 'appSettings' | 'pendingRuns' | 'processing'>,
): Promise<void> {
  if (context.pendingRuns === undefined) return;
  const runs = await context.pendingRuns.list();
  await forgetEmptiedFolders(
    context,
    runs.map((run) => path.dirname(run.path)),
  );
}
