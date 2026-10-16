import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { PendingRun } from '@/adapters/library/fs-pending-runs';
import type { ProcessingFolders } from '@/adapters/library/processing-folders';
import type { AppSettingsWorkflow } from '@/application/workflows/app-settings';
import type { ProcessingChoice } from '@/domain/app-settings';
import {
  forgetEmptiedFolders,
  processingStatus,
  settleEarlierFolders,
} from '@/main/processing-status';

const at = (...parts: string[]): string => path.resolve(...parts);
const own = at('data', 'pending');

/** A run with `count` books, in the folder it was made in. */
const run = (folder: string, id: string, count = 1): PendingRun => ({
  id,
  path: path.join(folder, id),
  createdAt: 1,
  books: Array.from({ length: count }, (_, index) => ({
    entry: {
      relativePath: `${String(index)}.epub`,
      title: 'Book',
      author: 'A',
      format: 'epub',
      bytes: 1,
      convertedAt: '2026-10-16T00:00:00.000Z',
    },
    path: path.join(folder, id, `${String(index)}.epub`),
  })),
});

function contextFor(options: {
  readonly choice?: ProcessingChoice;
  readonly runs?: readonly PendingRun[];
  readonly there?: readonly string[];
  readonly available?: boolean;
  readonly freeBytes?: number | null;
}): {
  readonly context: Parameters<typeof processingStatus>[0];
  readonly forget: ReturnType<typeof vi.fn<AppSettingsWorkflow['forgetEarlierFolders']>>;
} {
  const choice = options.choice ?? { folder: null, earlier: [] };
  const chosenPending = choice.folder === null ? own : path.join(choice.folder, 'Pending');
  const forget = vi.fn<AppSettingsWorkflow['forgetEarlierFolders']>(() => Promise.resolve());
  const processing = {
    chosen: () => choice.folder,
    pendingRoot: () => chosenPending,
    scratchRoot: () => (choice.folder === null ? at('tmp') : path.join(choice.folder, 'Scratch')),
    pendingRoots: () => [
      chosenPending,
      ...(choice.folder === null ? [] : [own]),
      ...choice.earlier.map((folder) => path.join(folder, 'Pending')),
    ],
    available: () => Promise.resolve(options.available ?? true),
    freeBytes: () => Promise.resolve(options.freeBytes === undefined ? 1000 : options.freeBytes),
    exists: (folder: string) => Promise.resolve((options.there ?? []).includes(folder)),
  } as unknown as ProcessingFolders;
  return {
    forget,
    context: {
      appSettings: {
        processing: () => choice,
        forgetEarlierFolders: forget,
      } as unknown as AppSettingsWorkflow,
      pendingRuns: { list: () => Promise.resolve(options.runs ?? []) } as never,
      processing,
    },
  };
}

describe('what the window is told of where the app works', () => {
  it('is the app’s own places, with nothing waiting elsewhere, when no folder is chosen', async () => {
    const { context } = contextFor({ freeBytes: 5000 });

    expect(await processingStatus(context)).toEqual({
      chosen: null,
      scratch: at('tmp'),
      pending: own,
      available: true,
      freeBytes: 5000,
      earlier: [],
    });
  });

  it('is the folder that was chosen, with Pending and Scratch in it', async () => {
    const { context } = contextFor({ choice: { folder: at('big'), earlier: [] } });

    expect(await processingStatus(context)).toMatchObject({
      chosen: at('big'),
      scratch: path.join(at('big'), 'Scratch'),
      pending: path.join(at('big'), 'Pending'),
    });
  });

  it('says how many books are waiting in each other folder, and leaves out the ones with none', async () => {
    const earlier = at('old');
    const { context } = contextFor({
      choice: { folder: at('big'), earlier: [earlier, at('older')] },
      runs: [
        run(own, 'a', 2),
        run(own, 'b', 1),
        run(path.join(earlier, 'Pending'), 'c', 3),
        run(path.join(at('big'), 'Pending'), 'd', 4),
      ],
      there: [earlier, at('older')],
    });

    expect((await processingStatus(context)).earlier).toEqual([
      { folder: own, books: 3 },
      { folder: path.join(earlier, 'Pending'), books: 3 },
    ]);
  });

  it('says when the folder that was chosen is not there, and when nothing is known of the room', async () => {
    const { context } = contextFor({
      choice: { folder: at('gone'), earlier: [] },
      available: false,
      freeBytes: null,
    });

    expect(await processingStatus(context)).toMatchObject({ available: false, freeBytes: null });
  });

  it('lets go of an earlier folder that is there and has nothing waiting in it', async () => {
    const { context, forget } = contextFor({
      choice: { folder: at('big'), earlier: [at('empty'), at('has-books')] },
      runs: [run(path.join(at('has-books'), 'Pending'), 'x')],
      there: [at('empty'), at('has-books')],
    });

    await processingStatus(context);

    expect(forget).toHaveBeenCalledExactlyOnceWith([at('empty')]);
  });

  it('is not known yet before the app settings and the folders are built', async () => {
    const { context } = contextFor({});

    await expect(processingStatus({ ...context, appSettings: undefined })).rejects.toThrow(
      'not known yet',
    );
    await expect(processingStatus({ ...context, pendingRuns: undefined })).rejects.toThrow(
      'not known yet',
    );
    await expect(processingStatus({ ...context, processing: undefined })).rejects.toThrow(
      'not known yet',
    );
  });
});

describe('letting go of earlier folders', () => {
  it('keeps one that is not there, since a drive that is not connected may have books on it', async () => {
    const { context, forget } = contextFor({
      choice: { folder: null, earlier: [at('unplugged'), at('empty')] },
      there: [at('empty')],
    });

    await forgetEmptiedFolders(context, []);

    expect(forget).toHaveBeenCalledExactlyOnceWith([at('empty')]);
  });

  it('is nothing to do before the app settings and the folders are built', async () => {
    const { context, forget } = contextFor({});

    await forgetEmptiedFolders({ ...context, appSettings: undefined }, []);
    await forgetEmptiedFolders({ ...context, processing: undefined }, []);

    expect(forget).not.toHaveBeenCalled();
  });

  it('is told, at start-up, by the folders the runs are in', async () => {
    const { context, forget } = contextFor({
      choice: { folder: null, earlier: [at('kept'), at('empty')] },
      runs: [run(path.join(at('kept'), 'Pending'), 'r')],
      there: [at('kept'), at('empty')],
    });

    await settleEarlierFolders(context);

    expect(forget).toHaveBeenCalledExactlyOnceWith([at('empty')]);
  });

  it('does nothing at start-up when the runs are not there to ask', async () => {
    const { context, forget } = contextFor({});

    await settleEarlierFolders({ ...context, pendingRuns: undefined });

    expect(forget).not.toHaveBeenCalled();
  });
});
