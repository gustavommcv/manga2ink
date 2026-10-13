import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (...args: never[]) => unknown;
const fake = vi.hoisted(() => {
  const calls: string[] = [];
  const state = {
    calls,
    started: false,
    lock: true,
    windows: [] as { isMinimized: () => boolean; restore: () => void; focus: () => void }[],
    listeners: new Map<string, (...args: never[]) => unknown>(),
    ready: undefined as undefined | (() => Promise<void>),
    invoked: new Map<string, (...args: never[]) => unknown>(),
    legacyMove: undefined as undefined | Record<string, unknown>,
    context: undefined as unknown as Record<string, unknown>,
    quit: undefined as unknown as { mock: { calls: unknown[][] } } & (() => void),
  };
  return state;
});

vi.mock('electron', () => ({
  app: {
    on: (event: string, listener: Handler) => {
      fake.listeners.set(event, listener);
    },
    quit: () => {
      fake.calls.push('quit');
    },
    requestSingleInstanceLock: () => fake.lock,
    whenReady: () => ({
      then: (callback: () => Promise<void>) => {
        fake.ready = callback;
        return Promise.resolve();
      },
    }),
    getPath: (name: string) => `/home/${name}`,
  },
  BrowserWindow: { getAllWindows: () => fake.windows },
  ipcMain: {
    handle: (channel: string, listener: Handler) => {
      fake.invoked.set(channel, listener);
    },
  },
}));
vi.mock('electron-squirrel-startup', () => ({
  get default() {
    return fake.started;
  },
}));

const step = (name: string) => (): void => {
  fake.calls.push(name);
};

vi.mock('@/adapters/library/directory-exists', () => ({ directoryExists: () => true }));
vi.mock('@/adapters/covers/fs-cover-store', () => ({
  FsCoverStore: class {
    constructor(readonly root: string) {
      fake.calls.push(`cover-store:${root}`);
    }
  },
}));
vi.mock('@/adapters/fs/stale-scratch', () => ({
  removeStaleScratch: (...args: unknown[]) => {
    fake.calls.push(`stale-scratch:${String(args[1])}`);
    return fake.context['scratchFails'] === true
      ? Promise.reject(new Error('scratch'))
      : Promise.resolve();
  },
}));
vi.mock('@/adapters/library/fs-pending-runs', () => ({
  FsPendingRuns: class {
    readonly root = '/pending';
    constructor(readonly storage: string) {
      fake.calls.push(`pending-runs:${storage}`);
    }
    pruneCompleted(): Promise<void> {
      fake.calls.push('prune-completed');
      return fake.context['completedFails'] === true
        ? Promise.reject(new Error('completed'))
        : Promise.resolve();
    }
    pruneAbandoned(age: number): Promise<void> {
      fake.calls.push(`prune-abandoned:${String(age)}`);
      return fake.context['abandonedFails'] === true
        ? Promise.reject(new Error('abandoned'))
        : Promise.resolve();
    }
  },
}));
vi.mock('@/adapters/library/legacy-storage', () => ({
  moveLegacyStorage: (options: Record<string, unknown>) => {
    fake.calls.push('legacy-move');
    fake.legacyMove = options;
    return Promise.resolve();
  },
}));
vi.mock('@/adapters/library/pending-path', () => ({
  coversRoot: () => '/covers',
  pendingRoot: () => '/pending-root',
  legacyStorageMove: () => fake.context['legacy'],
}));
vi.mock('@/adapters/settings/fs-settings-store', () => ({
  FsSettingsStore: class {
    constructor(readonly file: string) {
      fake.calls.push(`settings-store:${file}`);
    }
  },
}));
vi.mock('@/application/workflows/preferences', () => ({
  PreferencesWorkflow: class {
    settled = (): Promise<void> => Promise.resolve();
    constructor() {
      fake.calls.push('preferences');
    }
  },
}));
vi.mock('@/main/app-protocol', () => ({
  registerRendererScheme: step('register-scheme'),
  serveRenderer: step('serve-renderer'),
}));
vi.mock('@/main/context', () => ({ createMainContext: () => fake.context }));
vi.mock('@/main/quit-cleanup', () => ({
  cleanUpBeforeQuit: (
    steps: Record<string, unknown>,
    quit: () => void,
    report: (message: string, cause: unknown) => void,
  ) => {
    fake.calls.push('clean-up');
    fake.context['cleanUp'] = { steps, quit, report };
    return Promise.resolve();
  },
}));
vi.mock('@/main/ipc/artifacts', () => ({ registerArtifactHandlers: step('handlers:artifacts') }));
vi.mock('@/main/ipc/conversion', () => ({
  registerConversionHandlers: step('handlers:conversion'),
}));
vi.mock('@/main/ipc/covers', () => ({ registerCoverHandlers: step('handlers:covers') }));
vi.mock('@/main/ipc/inputs', () => ({ registerInputHandlers: step('handlers:inputs') }));
vi.mock('@/main/ipc/metadata', () => ({ registerMetadataHandlers: step('handlers:metadata') }));
vi.mock('@/main/ipc/opds', () => ({ registerOpdsHandlers: step('handlers:opds') }));
vi.mock('@/main/ipc/pending', () => ({ registerPendingHandlers: step('handlers:pending') }));
vi.mock('@/main/ipc/settings', () => ({ registerSettingsHandlers: step('handlers:settings') }));
vi.mock('@/main/toolchain-bootstrap', () => ({
  bootstrapToolchain: () => {
    fake.calls.push('bootstrap');
    return Promise.resolve({ state: 'blocked', tools: [], message: 'Not ready.' });
  },
}));
vi.mock('@/main/window', () => ({ createMainWindow: step('window') }));

const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
const onPlatform = (platform: NodeJS.Platform): void => {
  Object.defineProperty(process, 'platform', { configurable: true, value: platform });
};

/** Loads the entry point as Electron would: the module runs, and `ready` is the callback it left. */
async function start(): Promise<() => Promise<void>> {
  vi.resetModules();
  await import('@/main/index');
  const { ready } = fake;
  if (ready === undefined) throw new Error('Start-up never waited for the app to be ready');
  return ready;
}
const cleanUp = (): {
  steps: Record<string, unknown>;
  quit: () => void;
  report: (message: string, cause: unknown) => void;
} => fake.context['cleanUp'] as never;
const dispatch = (event: string, ...args: unknown[]): unknown =>
  (fake.listeners.get(event) as (...given: unknown[]) => unknown)(...args);

beforeEach(() => {
  fake.calls.length = 0;
  fake.started = false;
  fake.lock = true;
  fake.windows = [];
  fake.listeners.clear();
  fake.invoked.clear();
  fake.ready = undefined;
  fake.legacyMove = undefined;
  fake.context = {
    activeJobs: new Map(),
    pendingCatalog: { useRoot: step('use-root') },
    workflow: undefined,
    activeSharing: undefined,
    preferences: undefined,
    pendingRuns: undefined,
  };
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  if (originalPlatform !== undefined) Object.defineProperty(process, 'platform', originalPlatform);
  vi.restoreAllMocks();
});

describe('starting the app', () => {
  it('registers its scheme at once, before the app is ready, and does nothing else until it is', async () => {
    await start();

    expect(fake.calls).toEqual(['register-scheme']);
  });

  it('brings everything up in the order each step needs, and shows the window last', async () => {
    const ready = await start();

    await ready();

    expect(fake.calls).toEqual([
      'register-scheme',
      'cover-store:/covers',
      'bootstrap',
      `settings-store:${path.join('/home/userData', 'settings.json')}`,
      'preferences',
      'pending-runs:/pending-root',
      'use-root',
      'prune-completed',
      `prune-abandoned:${String(24 * 60 * 60 * 1000)}`,
      `stale-scratch:${String(24 * 60 * 60 * 1000)}`,
      'handlers:settings',
      'handlers:inputs',
      'handlers:conversion',
      'handlers:covers',
      'handlers:metadata',
      'handlers:artifacts',
      'handlers:pending',
      'handlers:opds',
      'serve-renderer',
      'window',
    ]);
  });

  it('keeps what it built on the context every handler is given', async () => {
    const ready = await start();

    await ready();

    expect(fake.context['coverStore']).toBeDefined();
    expect(fake.context['preferences']).toBeDefined();
    expect(fake.context['pendingRuns']).toBeDefined();
  });

  it('answers the toolchain status question with what the bootstrap found', async () => {
    const ready = await start();
    await ready();

    const answer = fake.invoked.get('toolchain:get-status')?.();

    expect(answer).toEqual({ state: 'blocked', tools: [], message: 'Not ready.' });
  });

  it('moves what an earlier version kept in the installer’s folder before anything reads it', async () => {
    fake.context['legacy'] = { from: '/old', to: '/new' };
    const ready = await start();

    await ready();

    expect(fake.calls.indexOf('legacy-move')).toBeGreaterThan(-1);
    expect(fake.calls.indexOf('legacy-move')).toBeLessThan(
      fake.calls.indexOf('cover-store:/covers'),
    );
    expect(fake.legacyMove).toMatchObject({ from: '/old', to: '/new' });
    const onProblem = fake.legacyMove?.['onProblem'] as (message: string, cause: unknown) => void;
    onProblem('Could not move it.', new Error('busy'));
    expect(console.error).toHaveBeenCalledWith('Could not move it.', expect.any(Error));
  });

  it('moves nothing when there is nothing from an earlier version to move', async () => {
    const ready = await start();

    await ready();

    expect(fake.calls).not.toContain('legacy-move');
  });

  it.each([
    [
      'the books of an earlier run',
      { completedFails: true },
      'Could not clear previously exported pending books.',
    ],
    [
      'a run that was killed',
      { abandonedFails: true },
      'Could not clear a run that was interrupted before its first book.',
    ],
    [
      'the scratch folders it left',
      { scratchFails: true },
      'Could not clear scratch folders an earlier run left behind.',
    ],
  ])('reports, and goes on, when clearing %s fails', async (_what, failure, message) => {
    Object.assign(fake.context, failure);
    const ready = await start();

    await ready();

    expect(console.error).toHaveBeenCalledWith(message, expect.any(Error));
    expect(fake.calls.at(-1)).toBe('window');
  });

  it('shows the window again from the dock only when there is none', async () => {
    const ready = await start();
    await ready();
    fake.calls.length = 0;

    dispatch('activate');
    expect(fake.calls).toEqual(['window']);

    fake.windows = [{ isMinimized: () => false, restore: vi.fn(), focus: vi.fn() }];
    fake.calls.length = 0;
    dispatch('activate');
    expect(fake.calls).toEqual([]);
  });
});

describe('a second copy of the app', () => {
  it('quits, and touches neither the settings nor the pending books of the first', async () => {
    fake.lock = false;
    const ready = await start();

    await ready();

    expect(fake.calls).toEqual(['register-scheme', 'quit']);
  });

  it('brings the window of the first one forward, restoring it when it was minimized', async () => {
    const minimized = { isMinimized: () => true, restore: vi.fn(), focus: vi.fn() };
    const shown = { isMinimized: () => false, restore: vi.fn(), focus: vi.fn() };
    await start();

    fake.windows = [minimized];
    dispatch('second-instance');
    fake.windows = [shown];
    dispatch('second-instance');
    fake.windows = [];
    expect(() => dispatch('second-instance')).not.toThrow();

    expect(minimized.restore).toHaveBeenCalledOnce();
    expect(minimized.focus).toHaveBeenCalledOnce();
    expect(shown.restore).not.toHaveBeenCalled();
    expect(shown.focus).toHaveBeenCalledOnce();
  });
});

describe('an installer that is still running', () => {
  it('lets the app quit at once, so the installer’s own start-up is not raced', async () => {
    fake.started = true;

    await start();

    expect(fake.calls).toContain('quit');
  });
});

describe('quitting', () => {
  it('holds the quit once to clean up first, and then lets it through', async () => {
    await start();
    const first = { preventDefault: vi.fn() };
    const second = { preventDefault: vi.fn() };

    dispatch('before-quit', first);
    dispatch('before-quit', second);

    expect(first.preventDefault).toHaveBeenCalledOnce();
    expect(second.preventDefault).not.toHaveBeenCalled();
    expect(fake.calls.filter((call) => call === 'clean-up')).toHaveLength(1);
  });

  it('cleans up only what was built, so a quit before the tools were ready is not a crash', async () => {
    await start();

    dispatch('before-quit', { preventDefault: vi.fn() });

    const { steps } = cleanUp();
    expect(steps['activeJobs']).toBe(fake.context['activeJobs']);
    expect(steps['releaseAll']).toBeUndefined();
    expect(steps['stopSharing']).toBeUndefined();
    expect(steps['settlePreferences']).toBeUndefined();
    expect(steps['pruneCompleted']).toBeUndefined();
  });

  it('releases the books, stops the share and writes the last change when they exist', async () => {
    const workflow = { releaseAll: vi.fn(() => 'released') };
    const sharing = { stop: vi.fn(() => 'stopped') };
    const preferences = { settled: vi.fn(() => 'settled') };
    const pendingRuns = { pruneCompleted: vi.fn(() => 'pruned') };
    Object.assign(fake.context, {
      workflow,
      activeSharing: sharing,
      preferences,
      pendingRuns,
    });
    await start();

    dispatch('before-quit', { preventDefault: vi.fn() });

    const { steps, quit, report } = cleanUp();
    expect((steps['releaseAll'] as () => unknown)()).toBe('released');
    expect((steps['stopSharing'] as () => unknown)()).toBe('stopped');
    expect((steps['settlePreferences'] as () => unknown)()).toBe('settled');
    expect((steps['pruneCompleted'] as () => unknown)()).toBe('pruned');
    fake.calls.length = 0;
    quit();
    expect(fake.calls).toEqual(['quit']);
    report('Could not stop it.', new Error('busy'));
    expect(console.error).toHaveBeenCalledWith('Could not stop it.', expect.any(Error));
  });

  it.each([
    ['linux', true],
    ['win32', true],
    ['darwin', false],
  ] as const)('on %s, closing the last window quits the app: %s', async (platform, quits) => {
    onPlatform(platform);
    await start();
    fake.calls.length = 0;

    dispatch('window-all-closed');

    expect(fake.calls).toEqual(quits ? ['quit'] : []);
  });
});
