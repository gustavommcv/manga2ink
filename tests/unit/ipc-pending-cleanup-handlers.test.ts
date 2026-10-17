import type { IpcMainInvokeEvent } from 'electron';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PendingRun } from '@/adapters/library/fs-pending-runs';
import { message } from '@/domain/message';
import { registerPendingCleanupHandlers } from '@/main/ipc/pending-cleanup';
import { PendingRunActivity } from '@/main/pending-run-activity';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const electron = vi.hoisted(() => ({ listeners: new Map<string, Listener>() }));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      electron.listeners.set(channel, listener);
    },
  },
}));

const mainFrame = {};
const event = { sender: { mainFrame }, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;
const call = (channel: string, payload?: unknown): Promise<WorkflowResult<unknown>> =>
  electron.listeners.get(channel)!(event, payload);

const day = 24 * 60 * 60 * 1000;

const run = (id: string, sizes: readonly number[]): PendingRun => ({
  id,
  path: `/pending/${id}`,
  createdAt: 1,
  books: sizes.map((bytes, index) => ({
    entry: {
      relativePath: `${String(index)}.epub`,
      title: 'Book',
      author: 'A',
      format: 'epub',
      bytes,
      convertedAt: '2026-10-16T00:00:00.000Z',
    },
    path: `/pending/${id}/${String(index)}.epub`,
  })),
});

const idle = [run('run-1', [10, 20]), run('run-2', [300])];

function register(overrides: Record<string, unknown> = {}) {
  const context = {
    activeJobs: new Map<string, AbortController>(),
    activeSharingTarget: undefined as unknown,
    artifactPaths: new Map([
      ['book-1', '/pending/run-1/0.epub'],
      ['book-2', '/pending/run-2/0.epub'],
    ]),
    pendingArtifacts: new Map([
      ['book-1', { runId: 'run-1', relativePath: '0.epub' }],
      ['book-2', { runId: 'run-2', relativePath: '0.epub' }],
    ]),
    pendingRunActivity: new PendingRunActivity(),
    pendingRuns: {
      idleRuns: vi.fn<(milliseconds: number) => Promise<readonly PendingRun[]>>(() =>
        Promise.resolve(idle),
      ),
      discard: vi.fn<(id: string) => Promise<boolean>>(() => Promise.resolve(true)),
    },
    selectedLibraries: new Map([
      ['run-1', '/pending/run-1'],
      ['run-2', '/pending/run-2'],
    ]),
    ...overrides,
  };
  registerPendingCleanupHandlers(context as never);
  return context;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  electron.listeners.clear();
  vi.restoreAllMocks();
});

describe('asking what a clean-up would delete', () => {
  it('says what the conversions untouched for that many days hold, and deletes nothing', async () => {
    const context = register();

    expect(await call('pending:count-idle', { days: 30 })).toEqual({
      ok: true,
      value: { runs: 2, books: 3, bytes: 330 },
    });

    expect(context.pendingRuns.idleRuns).toHaveBeenCalledExactlyOnceWith(30 * day);
    expect(context.pendingRuns.discard).not.toHaveBeenCalled();
  });

  it.each([[{ days: 3 }], [{ days: '30' }], [{}], [undefined]])(
    'does not take %j for a number of days it offers',
    async (payload) => {
      const context = register();

      expect(await call('pending:count-idle', payload)).toMatchObject({ ok: false });
      expect(context.pendingRuns.idleRuns).not.toHaveBeenCalled();
    },
  );

  it('is a failure, not an answer, when the pending storage is not there yet', async () => {
    register({ pendingRuns: undefined });

    expect(await call('pending:count-idle', { days: 7 })).toMatchObject({ ok: false });
  });
});

describe('deleting what has waited', () => {
  it('deletes each of those conversions, forgets what the page held of them, and says what went', async () => {
    const context = register();

    expect(await call('pending:delete-idle', { days: 90 })).toEqual({
      ok: true,
      value: { runs: 2, books: 3, bytes: 330 },
    });

    expect(context.pendingRuns.idleRuns).toHaveBeenCalledExactlyOnceWith(90 * day);
    expect(context.pendingRuns.discard.mock.calls).toEqual([['run-1'], ['run-2']]);
    expect(context.pendingArtifacts.size).toBe(0);
    expect(context.artifactPaths.size).toBe(0);
    expect(context.selectedLibraries.size).toBe(0);
  });

  it('is refused while the ready books are shared, and again while a conversion runs, and deletes nothing', async () => {
    const context = register();

    context.activeSharingTarget = { readyBooks: true };
    expect(await call('pending:delete-idle', { days: 30 })).toMatchObject({
      ok: false,
      error: { code: 'pending_in_use', said: message('failure.readyBooksShared', {}) },
    });
    context.activeSharingTarget = undefined;
    context.activeJobs.set('job', new AbortController());
    expect(await call('pending:delete-idle', { days: 30 })).toMatchObject({
      ok: false,
      error: { code: 'pending_in_use', said: message('failure.waitForConversion', {}) },
    });

    expect(context.pendingRuns.discard).not.toHaveBeenCalled();
  });

  it('leaves a conversion that is being saved from, and deletes the rest', async () => {
    const context = register();
    const release = context.pendingRunActivity.beginExport('run-1');

    expect(await call('pending:delete-idle', { days: 30 })).toEqual({
      ok: true,
      value: { runs: 1, books: 1, bytes: 300 },
    });

    expect(context.pendingRuns.discard.mock.calls).toEqual([['run-2']]);
    expect(context.selectedLibraries.has('run-1')).toBe(true);
    expect(context.pendingArtifacts.has('book-1')).toBe(true);
    release?.();
  });

  it('does not count a conversion that was gone already, and lets each go of its claim as it is done', async () => {
    const context = register();
    context.pendingRuns.discard.mockImplementation((id: string) => Promise.resolve(id === 'run-2'));

    expect(await call('pending:delete-idle', { days: 30 })).toEqual({
      ok: true,
      value: { runs: 1, books: 1, bytes: 300 },
    });

    // Neither is left claimed as being deleted.
    expect(context.pendingRunActivity.isDeletingAny()).toBe(false);
    expect(context.selectedLibraries.has('run-1')).toBe(true);
  });

  it('says plainly that it could not delete, and leaves nothing claimed, when the disk refuses', async () => {
    const context = register();
    context.pendingRuns.discard.mockRejectedValue(new Error('EBUSY'));

    expect(await call('pending:delete-idle', { days: 30 })).toMatchObject({
      ok: false,
      error: { code: 'pending_delete_failed', said: message('failure.pendingDeleteFailed', {}) },
    });

    expect(context.pendingRunActivity.isDeletingAny()).toBe(false);
  });

  it('is a failure, not an answer, when the pending storage is not there yet', async () => {
    register({ pendingRuns: undefined });

    expect(await call('pending:delete-idle', { days: 7 })).toMatchObject({ ok: false });
  });
});
