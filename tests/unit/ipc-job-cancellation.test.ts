import type { IpcMainInvokeEvent } from 'electron';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerConversionHandlers } from '@/main/ipc/conversion';
import { registerCoverHandlers } from '@/main/ipc/covers';
import { registerMetadataHandlers } from '@/main/ipc/metadata';
import { PendingRunActivity } from '@/main/pending-run-activity';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const electron = vi.hoisted(() => ({
  listeners: new Map<string, Listener>(),
  showOpenDialog: vi.fn(),
  openExternal: vi.fn(),
}));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      electron.listeners.set(channel, listener);
    },
  },
  dialog: { showOpenDialog: electron.showOpenDialog },
  shell: { openExternal: electron.openExternal },
}));

const mainFrame = {};
const event = { sender: { mainFrame }, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;
const call = (channel: string, payload?: unknown): Promise<WorkflowResult<unknown>> =>
  electron.listeners.get(channel)!(event, payload);

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  electron.listeners.clear();
  electron.showOpenDialog.mockReset();
  vi.restoreAllMocks();
});

/** A promise settled from outside, so that a job can be left running while it is cancelled. */
function pending<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
const settle = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

describe('cancelling a job that was started', () => {
  const conversionContext = (workflow: unknown) => ({
    mangapressCli: undefined,
    selectedLibraries: new Map<string, string>(),
    activeJobs: new Map<string, AbortController>(),
    workflow,
    artifactPaths: new Map(),
    libraryPublisher: {},
    pendingRuns: undefined,
    pendingArtifacts: new Map(),
    pendingRunActivity: new PendingRunActivity(),
  });
  const metadataContext = (provider: unknown) => ({
    metadataProviders: new Map([['source', provider]]),
    activeJobs: new Map<string, AbortController>(),
  });

  /**
   * Starts a job that does not finish, cancels it by the id the page was given, and says what the
   * work was told, whether the id was free to use again, and whether it was refused while it ran.
   */
  async function cancelling(
    start: () => Promise<WorkflowResult<unknown>>,
    jobId: string,
    signalOf: () => AbortSignal | undefined,
    finish: () => void,
    activeJobs: Map<string, AbortController>,
    again: () => Promise<WorkflowResult<unknown>>,
  ) {
    const running = start();
    await settle();
    const known = [...activeJobs.keys()];
    const whileRunning = await again();
    const cancelled = await call('workflow:cancel', jobId);
    const told = signalOf()?.aborted;
    finish();
    await running;
    const after = [...activeJobs.keys()];
    const unknown = await call('workflow:cancel', jobId);
    return { known, whileRunning, cancelled, told, after, unknown };
  }

  it('reaches the discovery of a library by the id the page was given, and frees the id', async () => {
    const work = pending<unknown>();
    let signal: AbortSignal | undefined;
    const context = conversionContext({
      planLibrary: (_session: string, given: AbortSignal) => {
        signal = given;
        return work.promise;
      },
    });
    registerConversionHandlers(context as never);
    const command = { jobId: 'discover-1', sessionId: 'session-1' };

    const result = await cancelling(
      () => call('workflow:plan-library', command),
      'discover-1',
      () => signal,
      () => {
        work.resolve({ titles: [] });
      },
      context.activeJobs,
      () => call('workflow:plan-library', command),
    );

    expect(result.known).toEqual(['discover-1']);
    expect(result.whileRunning).toMatchObject({ ok: false, error: { code: 'job_exists' } });
    expect(result.cancelled).toEqual({ ok: true, value: undefined });
    expect(result.told).toBe(true);
    expect(result.after).toEqual([]);
    expect(result.unknown).toMatchObject({ ok: false, error: { code: 'job_not_found' } });
  });

  it.each([
    [
      'a search',
      'workflow:search-metadata',
      { jobId: 'search-1', providerId: 'source', title: 'Work' },
      'search',
    ],
    [
      'a lookup of volumes',
      'workflow:suggest-volumes',
      { jobId: 'search-1', providerId: 'source', workId: 'work-1' },
      'suggestVolumes',
    ],
  ] as const)(
    'reaches %s by the id the page was given, and frees the id',
    async (_what, channel, command, method) => {
      const work = pending<unknown>();
      let signal: AbortSignal | undefined;
      const provider = {
        search: (_title: string, given?: AbortSignal) => {
          signal = given;
          return work.promise;
        },
        suggestVolumes: (_id: string, options: { signal?: AbortSignal }) => {
          signal = options.signal;
          return work.promise;
        },
      };
      const context = metadataContext(provider);
      registerMetadataHandlers(context as never);
      // Cancelling is one handler for every kind of job, and shares the table of the running ones.
      registerConversionHandlers({
        ...conversionContext(undefined),
        activeJobs: context.activeJobs,
      } as never);
      expect(method in provider).toBe(true);

      const result = await cancelling(
        () => call(channel, command),
        'search-1',
        () => signal,
        () => {
          work.resolve(method === 'search' ? [] : { volumes: [] });
        },
        context.activeJobs,
        () => call(channel, command),
      );

      expect(result.known).toEqual(['search-1']);
      expect(result.whileRunning).toMatchObject({ ok: false, error: { code: 'job_exists' } });
      expect(result.told).toBe(true);
      expect(result.after).toEqual([]);
      expect(result.unknown).toMatchObject({ ok: false, error: { code: 'job_not_found' } });
    },
  );

  it('sends the language of the folders only when they declare one', async () => {
    const volumes = vi.fn().mockResolvedValue({ volumes: [] });
    const context = metadataContext({ search: vi.fn(), suggestVolumes: volumes });
    registerMetadataHandlers(context as never);

    await call('workflow:suggest-volumes', { jobId: 'a', providerId: 'source', workId: 'w' });
    await call('workflow:suggest-volumes', {
      jobId: 'b',
      providerId: 'source',
      workId: 'w',
      language: 'pt-br',
    });

    expect(volumes.mock.calls[0]?.[1]).not.toHaveProperty('language');
    expect(volumes.mock.calls[1]?.[1]).toMatchObject({ language: 'pt-br' });
  });
});

describe('choosing a cover', () => {
  const store = () => ({
    choose: vi.fn().mockResolvedValue({ covers: [] }),
    takeInOrder: vi.fn().mockResolvedValue({ covers: [] }),
  });
  const register = (lastPickerFolder?: string) => {
    const covers = store();
    registerCoverHandlers({ workflow: { covers }, lastPickerFolder } as never);
    return covers;
  };

  it.each([
    ['covers:choose', { sessionId: 's', slot: 1 }, 'choose'],
    ['covers:choose-folder', { sessionId: 's', slots: [1, 2] }, 'takeInOrder'],
  ] as const)(
    'is nothing when %s is closed, whatever it says was chosen',
    async (channel, command, method) => {
      const covers = register();
      electron.showOpenDialog.mockResolvedValue({
        canceled: true,
        filePaths: ['/pictures/01.jpg'],
      });

      expect(await call(channel, command)).toEqual({ ok: true, value: null });
      electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [] });
      expect(await call(channel, command)).toEqual({ ok: true, value: null });

      expect(covers[method]).not.toHaveBeenCalled();
    },
  );

  it('opens where the person last was, and nowhere in particular before that', async () => {
    electron.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    register();
    await call('covers:choose', { sessionId: 's', slot: 1 });
    await call('covers:choose-folder', { sessionId: 's', slots: [1] });
    for (const [asked] of electron.showOpenDialog.mock.calls as [Record<string, unknown>][]) {
      expect(asked).not.toHaveProperty('defaultPath');
    }

    electron.listeners.clear();
    electron.showOpenDialog.mockClear();
    register('/pictures');
    await call('covers:choose', { sessionId: 's', slot: 1 });
    await call('covers:choose-folder', { sessionId: 's', slots: [1] });
    for (const [asked] of electron.showOpenDialog.mock.calls as [Record<string, unknown>][]) {
      expect(asked).toMatchObject({ defaultPath: '/pictures' });
    }
  });

  it('names the title of a library only when the cover is for one of its titles', async () => {
    const covers = register();
    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/pictures/01.jpg'] });

    await call('covers:choose', { sessionId: 's', slot: 1 });
    await call('covers:choose', { sessionId: 's', title: 'Good', slot: 1 });

    expect(covers.choose.mock.calls[0]?.[0]).not.toHaveProperty('title');
    expect(covers.choose.mock.calls[1]?.[0]).toEqual({ sessionId: 's', title: 'Good' });
  });
});
