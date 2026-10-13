import type { IpcMainInvokeEvent } from 'electron';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { defaultMangapressSettings } from '@/domain/output-profile';
import { registerConversionHandlers } from '@/main/ipc/conversion';
import { registerPendingHandlers } from '@/main/ipc/pending';
import { PendingRunActivity } from '@/main/pending-run-activity';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const electron = vi.hoisted(() => ({
  listeners: new Map<string, Listener>(),
  showSaveDialog: vi.fn(),
  showOpenDialog: vi.fn(),
}));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      electron.listeners.set(channel, listener);
    },
  },
  dialog: { showSaveDialog: electron.showSaveDialog, showOpenDialog: electron.showOpenDialog },
  app: { getPath: () => '/documents' },
}));

const mainFrame = {};
const event = { sender: { mainFrame }, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;
const call = (channel: string, payload?: unknown): Promise<WorkflowResult<unknown>> =>
  electron.listeners.get(channel)!(event, payload);

let logged: MockInstance<typeof console.error>;
beforeEach(() => {
  logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
/** The first error that was written to the log as the reason of something. */
const causeLogged = (): Error | undefined =>
  logged.mock.calls
    .flatMap((args) => args as unknown[])
    .find((argument): argument is Error => argument instanceof Error);
afterEach(() => {
  electron.listeners.clear();
  electron.showSaveDialog.mockReset();
  electron.showOpenDialog.mockReset();
  vi.restoreAllMocks();
});

describe('pending books, at the edges', () => {
  const book = (name: string) => ({
    entry: { relativePath: name, format: 'epub', bytes: 10 },
    path: path.join('/pending', 'run-1', name),
  });
  const aRun = (books = [book('One.epub'), book('Two.epub')]) => ({
    id: 'run-1',
    path: path.join('/pending', 'run-1'),
    createdAt: 1,
    books,
  });
  function register(overrides: Record<string, unknown> = {}) {
    const pendingRuns = {
      create: vi.fn().mockResolvedValue({ id: 'run-new', path: '/pending/run-new' }),
      list: vi.fn().mockResolvedValue([aRun()]),
      discard: vi.fn().mockResolvedValue(true),
      exportAndRecord: vi.fn().mockResolvedValue({ status: 'saved' }),
    };
    const context = {
      pendingRuns: pendingRuns as unknown,
      selectedLibraries: new Map<string, string>(),
      pendingArtifacts: new Map<string, { runId: string; relativePath: string }>(),
      artifactPaths: new Map<string, string>(),
      lastPickerFolder: undefined,
      lastSaveFolder: '/books',
      preferences: undefined,
      currentPreferences: {},
      preferredNetworkInterface: undefined,
      activeSharingTarget: undefined,
      activeJobs: new Map<string, AbortController>(),
      pendingRunActivity: new PendingRunActivity(),
      ...overrides,
    };
    registerPendingHandlers(context as never);
    return { context, pendingRuns };
  }
  const listed = async () => {
    const result = (await call('pending:list')) as {
      value: { artifacts: { id: string; name: string }[] }[];
    };
    return result.value[0]!.artifacts;
  };

  it.each(['pending:create', 'pending:list', 'pending:discard'])(
    'says why %s cannot go on, for the log, when there is no place to keep the books',
    async (channel) => {
      register({ pendingRuns: undefined });

      const result = await call(channel, channel === 'pending:discard' ? 'run-1' : undefined);

      expect(result.ok).toBe(false);
      const failure = causeLogged();
      expect(failure).toMatchObject({ message: 'Pending storage is unavailable.' });
    },
  );

  it('lets the page ask for a run it has been told of, by the id it was given', async () => {
    const { context } = register();

    await call('pending:create');
    expect(context.selectedLibraries.get('run-new')).toBe('/pending/run-new');
    await call('pending:list');
    expect(context.selectedLibraries.get('run-1')).toBe(path.join('/pending', 'run-1'));
  });

  it('gives a book the id it already had, and one of its own to a book of another run with the same name', async () => {
    register({
      // Another run's book, of the same file name, was given its id before this run was listed.
      pendingArtifacts: new Map([['other-id', { runId: 'run-0', relativePath: 'One.epub' }]]),
    });

    const first = await listed();
    const second = await listed();

    expect(first.map((artifact) => artifact.id)).toEqual(second.map((artifact) => artifact.id));
    expect(new Set(first.map((artifact) => artifact.id)).size).toBe(2);
    expect(first.map((artifact) => artifact.id)).not.toContain('other-id');
  });

  it('remembers the folder a book was saved to, and says nothing of how it went when it went well', async () => {
    const { context, pendingRuns } = register();
    const [one] = await listed();
    electron.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/exports/One.epub' });

    const result = await call('pending:save-as', one!.id);

    expect(result).toEqual({ ok: true, value: { saved: true } });
    expect(result).not.toHaveProperty('value.warning');
    expect(context.lastSaveFolder).toBe('/exports');
    expect(pendingRuns.exportAndRecord).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      '/exports/One.epub',
      true,
    );
  });

  it('says it was copied and that recording it failed, and logs why', async () => {
    const { pendingRuns } = register();
    const [one] = await listed();
    const cause = new Error('disk full');
    pendingRuns.exportAndRecord.mockResolvedValue({ status: 'record_failed', cause });
    electron.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/exports/One.epub' });

    const result = (await call('pending:save-as', one!.id)) as {
      value: { saved: boolean; warning: string };
    };

    expect(result.value.saved).toBe(true);
    expect(result.value.warning).toContain('could not remember that it was saved');
    expect(logged).toHaveBeenCalledWith(
      'Could not finish recording an exported pending book.',
      cause,
    );
  });

  it('logs an unexpected failure of a save, and only that one, not a book that is not there', async () => {
    const { pendingRuns } = register();
    const [one] = await listed();
    electron.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/exports/One.epub' });
    const broken = new Error('EIO');
    pendingRuns.exportAndRecord.mockRejectedValue(broken);

    await call('pending:save-as', one!.id);
    expect(logged).toHaveBeenCalledWith('A pending book could not be saved.', broken);

    logged.mockClear();
    await call('pending:save-as', 'an-id-nobody-gave');
    expect(logged).not.toHaveBeenCalledWith(
      'A pending book could not be saved.',
      expect.anything(),
    );
  });

  it('tells a book whose run is gone from one whose file is gone from the run', async () => {
    const { pendingRuns } = register();
    const [one] = await listed();
    electron.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/exports/One.epub' });

    pendingRuns.list.mockResolvedValue([]);
    const noRun = await call('pending:save-as', one!.id);
    pendingRuns.list.mockResolvedValue([aRun([book('Other.epub')])]);
    const noBook = await call('pending:save-as', one!.id);

    for (const result of [noRun, noBook]) {
      expect(result).toMatchObject({ ok: false, error: { code: 'save_failed' } });
    }
    expect(pendingRuns.exportAndRecord).not.toHaveBeenCalled();
    // Both are what the person can be told plainly, not something that went wrong in the app.
    expect(logged).not.toHaveBeenCalledWith(
      'A pending book could not be saved.',
      expect.anything(),
    );
  });

  it('saves all of them to a chosen folder, without replacing a book already there', async () => {
    const { context, pendingRuns } = register();
    const ids = (await listed()).map((artifact) => artifact.id);
    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/exports'] });

    const result = await call('pending:save-all', ids);

    expect(electron.showOpenDialog.mock.calls[0]?.[0]).toMatchObject({
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: '/books',
    });
    expect(result).toMatchObject({ ok: true, value: { savedIds: ids } });
    for (const call of pendingRuns.exportAndRecord.mock.calls) expect(call[3]).toBe(false);
    // The folder of a destination is written the way this platform writes it.
    expect(context.lastSaveFolder).toBe(path.normalize('/exports'));
  });

  it('remembers the folder that was chosen even when none of the books could be saved into it', async () => {
    const { context, pendingRuns } = register();
    const ids = (await listed()).map((artifact) => artifact.id);
    pendingRuns.exportAndRecord.mockRejectedValue(new Error('EACCES'));
    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/exports'] });

    const result = await call('pending:save-all', ids);

    expect(result).toMatchObject({ ok: true, value: { savedIds: [] } });
    expect(context.lastSaveFolder).toBe('/exports');
  });

  it('saves nothing, and keeps the folder it had, when the dialog is cancelled or gives no folder', async () => {
    const { context, pendingRuns } = register();
    const ids = (await listed()).map((artifact) => artifact.id);

    electron.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: ['/exports'] });
    expect(await call('pending:save-all', ids)).toEqual({ ok: true, value: null });
    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [] });
    expect(await call('pending:save-all', ids)).toEqual({ ok: true, value: null });

    expect(context.lastSaveFolder).toBe('/books');
    expect(pendingRuns.exportAndRecord).not.toHaveBeenCalled();
  });

  it('logs why books could not be loaded or deleted, with the error', async () => {
    const { pendingRuns } = register();
    const unreadable = new Error('EACCES');
    pendingRuns.list.mockRejectedValue(unreadable);
    await call('pending:list');
    expect(logged).toHaveBeenCalledWith('Could not recover pending books.', unreadable);

    const locked = new Error('EBUSY');
    pendingRuns.discard.mockRejectedValue(locked);
    expect(await call('pending:discard', 'run-1')).toMatchObject({
      ok: false,
      error: { code: 'pending_delete_failed' },
    });
    expect(logged).toHaveBeenCalledWith('Could not delete pending books.', locked);
  });
});

describe('conversion, at the edges', () => {
  function register(overrides: Record<string, unknown> = {}) {
    const workflow = {
      plan: vi.fn().mockResolvedValue({ title: 'T', volumes: [] }),
      convert: vi.fn().mockResolvedValue([]),
    };
    const context = {
      mangapressCli: undefined as unknown,
      selectedLibraries: new Map<string, string>(),
      activeJobs: new Map<string, AbortController>(),
      workflow,
      artifactPaths: new Map<string, string>(),
      libraryPublisher: {},
      pendingRuns: { prepare: vi.fn().mockResolvedValue('/pending/run') } as unknown,
      pendingArtifacts: new Map(),
      pendingRunActivity: new PendingRunActivity(),
      ...overrides,
    };
    registerConversionHandlers(context as never);
    return { context, workflow };
  }
  const plan = {
    jobId: 'job-1',
    sessionId: 'session-1',
    format: 'epub',
    settings: defaultMangapressSettings,
  };

  it('says why the device list cannot be had when the tool is not there, for the log', async () => {
    register();

    const result = await call('workflow:get-device-profiles');

    expect(result.ok).toBe(false);
    const cause = causeLogged();
    expect(cause).toMatchObject({ message: 'mangapress is unavailable.' });
  });

  it('is a job that is known by its id while it runs, so that it can be cancelled', async () => {
    const seen: string[] = [];
    const { context, workflow } = register();
    workflow.plan.mockImplementation(() => {
      seen.push(...context.activeJobs.keys());
      return Promise.resolve({ title: 'T', volumes: [] });
    });

    await call('workflow:plan', plan);

    expect(seen).toEqual(['job-1']);
    expect(context.activeJobs.size).toBe(0);
  });

  it('passes only the parts of a plan that were asked for, not undefined ones', async () => {
    const { workflow } = register();

    await call('workflow:plan', plan);

    const sent = workflow.plan.mock.calls[0]?.[0] as Record<string, unknown>;
    for (const absent of ['mapping', 'mode', 'singleBook', 'details']) {
      expect(sent).not.toHaveProperty(absent);
    }
    expect(sent).toMatchObject({ sessionId: 'session-1', libraryPath: '/pending/run' });
  });

  it('passes the parts that were asked for', async () => {
    const { workflow } = register();

    await call('workflow:plan', {
      ...plan,
      mode: 'convert-only',
      singleBook: true,
      details: { title: 'Mine' },
    });

    expect(workflow.plan.mock.calls[0]?.[0]).toMatchObject({
      mode: 'convert-only',
      singleBook: true,
      details: { title: 'Mine' },
    });
  });

  it('says why it cannot plan when there is no place to keep what it makes, for the log', async () => {
    register({ pendingRuns: undefined });

    const result = await call('workflow:plan', plan);

    expect(result.ok).toBe(false);
    const cause = causeLogged();
    expect(cause).toMatchObject({ message: 'Pending storage is unavailable.' });
  });
});
