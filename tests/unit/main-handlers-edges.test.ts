import type { IpcMainInvokeEvent } from 'electron';

import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { cleanUpBeforeQuit, type QuitCleanup } from '@/main/quit-cleanup';
import { opdsPort } from '@/main/constants';
import { registerInputHandlers } from '@/main/ipc/inputs';
import { registerOpdsHandlers } from '@/main/ipc/opds';
import { failed, ok } from '@/main/ipc/result';
import { PendingRunActivity } from '@/main/pending-run-activity';
import { sortNewestFirst } from '@/library/publish';
import type { LibraryBookEntry } from '@/library/manifest';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const electron = vi.hoisted(() => ({
  listeners: new Map<string, Listener>(),
  showOpenDialog: vi.fn(),
}));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      electron.listeners.set(channel, listener);
    },
  },
  dialog: { showOpenDialog: electron.showOpenDialog },
}));

const mainFrame = {};
const event = { sender: { mainFrame }, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;
const call = (channel: string, payload?: unknown): Promise<WorkflowResult<unknown>> =>
  electron.listeners.get(channel)!(event, payload);

let logged: MockInstance<typeof console.error>;
beforeEach(() => {
  logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  electron.listeners.clear();
  electron.showOpenDialog.mockReset();
  vi.restoreAllMocks();
});

describe('what is let go of when the app quits', () => {
  const nothing = (): QuitCleanup => ({
    activeJobs: new Map(),
    releaseAll: undefined,
    stopSharing: undefined,
    settlePreferences: undefined,
    pruneCompleted: undefined,
  });

  it('is only what was built: a quit before the tools were ready reports nothing and quits', async () => {
    const quit = vi.fn();
    const report = vi.fn();

    await cleanUpBeforeQuit(nothing(), quit, report);

    expect(report).not.toHaveBeenCalled();
    expect(quit).toHaveBeenCalledOnce();
  });

  it.each(['releaseAll', 'stopSharing', 'settlePreferences', 'pruneCompleted'] as const)(
    'does not miss %s when it is the only thing there is, and does not wait for what is not',
    async (step) => {
      const done = vi.fn().mockResolvedValue(undefined);
      const quit = vi.fn();
      const report = vi.fn();

      await cleanUpBeforeQuit({ ...nothing(), [step]: done }, quit, report);

      expect(done).toHaveBeenCalledOnce();
      expect(report).not.toHaveBeenCalled();
      expect(quit).toHaveBeenCalledOnce();
    },
  );

  it('stops the jobs first, finishes the steps whatever one does, and prunes last', async () => {
    const order: string[] = [];
    const job = { abort: vi.fn(() => order.push('abort')) };
    const quit = vi.fn(() => order.push('quit'));

    await cleanUpBeforeQuit(
      {
        activeJobs: new Map([['job', job]]),
        releaseAll: () => {
          order.push('release');
          return Promise.reject(new Error('busy'));
        },
        stopSharing: () => {
          order.push('stop');
          return Promise.resolve();
        },
        settlePreferences: () => {
          order.push('settle');
          return Promise.resolve();
        },
        pruneCompleted: () => {
          order.push('prune');
          return Promise.resolve();
        },
      },
      quit,
      vi.fn(),
    );

    expect(order).toEqual(['abort', 'release', 'stop', 'settle', 'prune', 'quit']);
  });

  it('reports a prune that failed, with the reason, and quits all the same', async () => {
    const cause = new Error('locked');
    const report = vi.fn();
    const quit = vi.fn();

    await cleanUpBeforeQuit(
      { ...nothing(), pruneCompleted: () => Promise.reject(cause) },
      quit,
      report,
    );

    expect(report).toHaveBeenCalledExactlyOnceWith(
      'Could not clear exported pending books.',
      cause,
    );
    expect(quit).toHaveBeenCalledOnce();
  });
});

describe('the books of the catalog, newest first', () => {
  const entry = (relativePath: string, convertedAt: string): LibraryBookEntry => ({
    relativePath,
    title: relativePath,
    author: 'Unknown',
    format: 'epub',
    bytes: 1,
    convertedAt,
  });
  const names = (books: readonly LibraryBookEntry[]): string[] =>
    books.map((book) => book.relativePath);

  it('puts the later conversion first', () => {
    const books = [entry('a', '2026-01-01T00:00:00Z'), entry('b', '2026-01-02T00:00:00Z')];

    expect(names(sortNewestFirst(books))).toEqual(['b', 'a']);
    expect(names(sortNewestFirst([...books].reverse()))).toEqual(['b', 'a']);
  });

  it('puts books converted at the same moment in the order of their names, whichever way they came', () => {
    const same = '2026-01-01T00:00:00Z';
    const books = [entry('b', same), entry('c', same), entry('a', same)];

    expect(names(sortNewestFirst(books))).toEqual(['a', 'b', 'c']);
    expect(names(sortNewestFirst([...books].reverse()))).toEqual(['a', 'b', 'c']);
  });

  it('leaves a book with the same name and time where it was, and does not change what it was given', () => {
    const books = [entry('a', '2026-01-01T00:00:00Z'), entry('a', '2026-01-01T00:00:00Z')];
    const copy = [...books];

    const sorted = sortNewestFirst(books);

    expect(sorted).toHaveLength(2);
    expect(sorted[0]).toBe(books[0]);
    expect(books).toEqual(copy);
  });
});

describe('the answers every handler is written in', () => {
  it('is a value for a success and an error for a failure, nothing more', () => {
    expect(ok(3)).toEqual({ ok: true, value: 3 });
    expect(failed({ code: 'x', message: 'y' })).toEqual({
      ok: false,
      error: { code: 'x', message: 'y' },
    });
  });
});

describe('choosing what to convert', () => {
  const register = (lastPickerFolder?: string) => {
    const context = {
      lastPickerFolder,
      selectedInputs: new Map(),
      selectedLibraries: new Map(),
      preferences: undefined,
    };
    registerInputHandlers(context as never);
    return context;
  };

  it.each([
    ['folders', 'Choose manga folders', ['openDirectory', 'multiSelections']],
    ['files', 'Choose comic files', ['openFile', 'multiSelections']],
  ] as const)(
    'asks for %s with its own title and kind of selection',
    async (kind, title, properties) => {
      electron.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
      register();

      await call('workflow:choose-inputs', kind);

      expect(electron.showOpenDialog).toHaveBeenCalledOnce();
      const asked = electron.showOpenDialog.mock.calls[0]?.[0] as Record<string, unknown>;
      expect(asked).toMatchObject({ title, properties });
      expect('filters' in asked).toBe(kind === 'files');
    },
  );

  it('remembers the folder of what was chosen, and where the next dialog opens', async () => {
    electron.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    const context = register('/kept');
    await call('workflow:choose-inputs', 'folders');
    expect(electron.showOpenDialog.mock.calls[0]?.[0]).toMatchObject({ defaultPath: '/kept' });
    expect(context.lastPickerFolder).toBe('/kept');

    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/library/A'] });
    await call('workflow:choose-library');
    expect(context.lastPickerFolder).toBe('/library/A');
  });

  it('chooses nothing, remembers nothing, when the library dialog is cancelled or gives no path', async () => {
    const context = register('/kept');

    electron.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: ['/library/A'] });
    expect(await call('workflow:choose-library')).toEqual({ ok: true, value: null });

    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: [] });
    expect(await call('workflow:choose-library')).toEqual({ ok: true, value: null });

    expect(context.lastPickerFolder).toBe('/kept');
    expect(context.selectedLibraries.size).toBe(0);
  });
});

describe('starting to share', () => {
  const start = {
    libraryId: 'lib',
    interfaceAddress: '192.168.1.10',
    auth: { username: '', password: '' },
  };
  const running = {
    url: 'http://192.168.1.10:48123/',
    interfaceAddress: '192.168.1.10',
    port: opdsPort,
    stop: vi.fn().mockResolvedValue(undefined),
  };
  function register(overrides: Record<string, unknown> = {}) {
    const context = {
      selectedLibraries: new Map([['lib', '/books/Shelf']]),
      activeSharing: undefined as unknown,
      activeSharingTarget: undefined as unknown,
      pendingRunActivity: new PendingRunActivity(),
      pendingCatalog: { read: vi.fn().mockResolvedValue({ books: [] }) },
      opdsServer: { start: vi.fn().mockResolvedValue(running) },
      networkInterfaces: { list: vi.fn(), canShareOn: vi.fn().mockReturnValue(true) },
      pendingRuns: { root: '/pending' } as unknown,
      ...overrides,
    };
    registerOpdsHandlers(context as never);
    return context;
  }

  it.each([
    ['a share is running', { activeSharing: running }],
    ['a share is being started', { activeSharingTarget: { path: '/x', title: 'x' } }],
  ])('is refused while %s, whichever of the two says so', async (_what, overrides) => {
    const context = register(overrides);

    expect(await call('opds:start-sharing', start)).toMatchObject({
      ok: false,
      error: { code: 'sharing_already_active' },
    });
    expect(context.opdsServer.start).not.toHaveBeenCalled();
  });

  it('shares a library before the place for the pending books is made', async () => {
    const context = register({ pendingRuns: undefined });

    expect(await call('opds:start-sharing', start)).toMatchObject({ ok: true });
    expect(context.opdsServer.start).toHaveBeenCalledWith(
      expect.objectContaining({ libraryPath: '/books/Shelf' }),
    );
  });

  it('writes to the log why a catalog could not be read, and why a server could not be started', async () => {
    const unreadable = new Error('damaged');
    register({ pendingCatalog: { read: vi.fn().mockRejectedValue(unreadable) } });
    await call('opds:start-sharing', start);
    expect(logged).toHaveBeenCalledWith(
      'The library catalog could not be read to start sharing.',
      unreadable,
    );

    electron.listeners.clear();
    logged.mockClear();
    const taken = Object.assign(new Error('in use'), { code: 'EADDRINUSE' });
    register({ opdsServer: { start: vi.fn().mockRejectedValue(taken) } });
    expect(await call('opds:start-sharing', start)).toMatchObject({ ok: false });
    expect(logged).toHaveBeenCalledWith('The sharing server could not be started.', taken);
  });

  it('is a failure the person is told of, not a reply with nothing in it, for an error that is not the network’s', async () => {
    const context = register({
      opdsServer: { start: vi.fn().mockRejectedValue(new Error('something else')) },
    });

    const result = await call('opds:start-sharing', start);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(typeof result.error.code).toBe('string');
      expect(result.error.message).not.toBe('');
    }
    expect(context.activeSharingTarget).toBeUndefined();
  });
});
