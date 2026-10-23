import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { dialogMessages } from '@/i18n/dialog-messages';

type Handler = (...args: never[]) => unknown;
const fake = vi.hoisted(() => {
  const calls: string[] = [];
  const state = {
    calls,
    started: false,
    packaged: true,
    lock: true,
    windows: [] as { isMinimized: () => boolean; restore: () => void; focus: () => void }[],
    listeners: new Map<string, (...args: never[]) => unknown>(),
    ready: undefined as undefined | (() => Promise<void>),
    invoked: new Map<string, (...args: never[]) => unknown>(),
    legacyMove: undefined as undefined | Record<string, unknown>,
    moves: [] as Record<string, unknown>[],
    locked: false,
    errorBoxes: [] as { title: string; text: string }[],
    formerUserData: undefined as
      undefined | { appData: string; userData: string; beforeLock: boolean },
    context: undefined as unknown as Record<string, unknown>,
    quit: undefined as unknown as { mock: { calls: unknown[][] } } & (() => void),
    nativeTheme: { themeSource: 'system', shouldUseDarkColors: false },
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
    exit: (code: number) => {
      fake.calls.push(`exit:${String(code)}`);
    },
    requestSingleInstanceLock: () => {
      fake.locked = true;
      return fake.lock;
    },
    whenReady: () => ({
      then: (callback: () => Promise<void>) => {
        fake.ready = callback;
        return Promise.resolve();
      },
    }),
    getPath: (name: string) => `/home/${name}`,
    getVersion: () => '0.1.0-alpha.15',
    get isPackaged() {
      return fake.packaged;
    },
    getPreferredSystemLanguages: () => ['pt-BR', 'en-US'],
  },
  BrowserWindow: { getAllWindows: () => fake.windows },
  dialog: {
    showErrorBox: (title: string, text: string) => {
      fake.errorBoxes.push({ title, text });
    },
  },
  nativeTheme: fake.nativeTheme,
  screen: {
    getPrimaryDisplay: () => ({ id: 2, workArea: { x: 0, y: 0, width: 1920, height: 1040 } }),
    getAllDisplays: () => [
      { id: 1, workArea: { x: -1280, y: 0, width: 1280, height: 984 } },
      { id: 2, workArea: { x: 0, y: 0, width: 1920, height: 1040 } },
    ],
  },
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
vi.mock('@/adapters/log/file-log', () => ({
  FileLog: class {
    constructor(
      readonly options: { directory: string; onFailure: (message: string, cause: unknown) => void },
    ) {
      fake.calls.push(`log:${options.directory}`);
      fake.context['logOptions'] = options;
    }
    settled = (): string => 'log settled';
  },
}));
vi.mock('@/main/log', () => ({
  logFolder: (userData: string) => `${userData}/logs`,
  installLog: (_log: unknown, targets: unknown, started: string) => {
    fake.calls.push('install-log');
    fake.context['logTargets'] = targets;
    fake.context['logStarted'] = started;
  },
}));
vi.mock('@/adapters/covers/fs-cover-store', () => ({
  FsCoverStore: class {
    constructor(readonly root: string) {
      fake.calls.push(`cover-store:${root}`);
    }
  },
}));
vi.mock('@/adapters/fs/stale-scratch', () => ({
  removeStaleScratch: (...args: unknown[]) => {
    fake.calls.push(`stale-scratch:${String(args[0])}:${String(args[1])}`);
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
vi.mock('@/adapters/library/processing-folders', () => ({
  ProcessingFolders: class {
    constructor(
      readonly defaults: { pending: string; scratch: string },
      readonly choice: () => unknown,
    ) {
      fake.calls.push(`processing-folders:${defaults.pending},${defaults.scratch}`);
      fake.context['processingChoice'] = choice;
    }
    pendingRoot(): string {
      return '/where/books/wait';
    }
    asPendingRoots(): string {
      return 'pending-roots';
    }
    scratchRoots(): readonly string[] {
      return ['/scratch/now', '/scratch/before'];
    }
  },
}));
vi.mock('@/adapters/library/legacy-storage', () => ({
  moveLegacyStorage: (options: Record<string, unknown>) => {
    fake.calls.push('legacy-move');
    fake.legacyMove = options;
    fake.moves.push(options);
    return Promise.resolve();
  },
}));
vi.mock('@/adapters/library/pending-path', () => ({
  coversRoot: () => '/covers',
  pendingRoot: () => '/pending-root',
  legacyStorageMove: () => fake.context['legacy'],
  formerStorageMove: () => fake.context['former'],
}));
vi.mock('@/main/former-user-data', () => ({
  moveFormerUserData: (appData: string, userData: string) => {
    fake.formerUserData = { appData, userData, beforeLock: !fake.locked };
    return fake.context['formerMove'] ?? { kind: 'settled' };
  },
}));
vi.mock('@/adapters/settings/fs-settings-store', () => ({
  FsSettingsStore: class {
    constructor(readonly file: string) {
      fake.calls.push(`settings-store:${file}`);
    }
  },
}));
vi.mock('@/adapters/settings/fs-app-settings-store', () => ({
  FsAppSettingsStore: class {
    constructor(readonly file: string) {
      fake.calls.push(`app-settings-store:${file}`);
    }
  },
}));
vi.mock('@/adapters/settings/fs-window-state-store', () => ({
  FsWindowStateStore: class {
    constructor(readonly file: string) {
      fake.calls.push(`window-state-store:${file}`);
    }
  },
}));
vi.mock('@/main/window-state', () => ({
  windowPositionsAreKnown: (platform: string, env: unknown) => {
    fake.context['positionsAsked'] = { platform, env };
    return fake.context['positionsKnown'] !== false;
  },
  WindowStateKeeper: class {
    constructor(
      readonly store: unknown,
      readonly areas: () => unknown,
      readonly positionsKnown: boolean,
      readonly report: (message: string, cause: unknown) => void,
    ) {
      fake.context['keeper'] = this;
    }
    restore = (): Promise<void> => {
      fake.calls.push('window-state:restore');
      return Promise.resolve();
    };
    flush = (): string => 'window state kept';
  },
}));
vi.mock('@/application/workflows/app-settings', () => ({
  AppSettingsWorkflow: class {
    settled = (): Promise<void> => Promise.resolve();
    restore = (): Promise<void> => {
      fake.calls.push('restore');
      return Promise.resolve();
    };
    processing = (): unknown => ({ folder: '/chosen', earlier: [] });
    language = (): string => 'pt-BR';
    theme = (): string => fake.context['theme'] as string;
    queueChoices = (): unknown => ({ keepAwake: false, notifyWhenDone: true });
    constructor(
      _store: unknown,
      readonly systemLanguages: () => readonly string[],
    ) {
      fake.calls.push('app-settings');
      fake.context['systemLanguages'] = systemLanguages;
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
  serveRenderer: (theme: unknown) => {
    fake.calls.push('serve-renderer');
    fake.context['servedTheme'] = theme;
  },
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
vi.mock('@/main/ipc/queue-runs', () => ({
  electronQueueSystem: () => 'the system of the app',
  registerQueueRunHandlers: (handlers: unknown, system: unknown) => {
    fake.calls.push('handlers:queue-runs');
    fake.context['queueHandlers'] = { handlers, system };
  },
}));
vi.mock('@/main/ipc/covers', () => ({ registerCoverHandlers: step('handlers:covers') }));
vi.mock('@/main/ipc/inputs', () => ({ registerInputHandlers: step('handlers:inputs') }));
vi.mock('@/main/ipc/metadata', () => ({ registerMetadataHandlers: step('handlers:metadata') }));
vi.mock('@/main/ipc/opds', () => ({ registerOpdsHandlers: step('handlers:opds') }));
vi.mock('@/main/ipc/pending', () => ({ registerPendingHandlers: step('handlers:pending') }));
vi.mock('@/main/ipc/app-settings', () => ({
  registerAppSettingsHandlers: (_workflow: unknown, themed: unknown) => {
    fake.calls.push('handlers:app-settings');
    fake.context['themed'] = themed;
  },
}));
vi.mock('@/main/ipc/troubleshooting', () => ({
  registerTroubleshootingHandlers: step('handlers:troubleshooting'),
}));
vi.mock('@/main/ipc/processing-folder', () => ({
  registerProcessingFolderHandlers: step('handlers:processing-folder'),
}));
vi.mock('@/main/processing-status', () => ({
  settleEarlierFolders: () => {
    fake.calls.push('settle-earlier');
    return fake.context['settleFails'] === true
      ? Promise.reject(new Error('settle'))
      : Promise.resolve();
  },
}));
vi.mock('@/main/ipc/settings', () => ({ registerSettingsHandlers: step('handlers:settings') }));
vi.mock('@/main/toolchain-bootstrap', () => ({
  bootstrapToolchain: () => {
    fake.calls.push('bootstrap');
    return Promise.resolve({ state: 'blocked', tools: [], message: 'Not ready.' });
  },
}));
vi.mock('@/main/window', () => ({
  applyThemeToApp: (system: unknown, preference: unknown) => {
    ((fake.context['themedApp'] ??= []) as unknown[]).push({ system, preference });
  },
  applyThemePreference: (system: unknown, windows: unknown, preference: unknown) => {
    ((fake.context['themedWindows'] ??= []) as unknown[]).push({ system, windows, preference });
  },
  followSystemTheme: (system: unknown, preference: unknown, windows: unknown) => {
    fake.context['followed'] = { system, preference, windows };
  },
  createMainWindow: (leaving: unknown, keeper: unknown, theme: unknown) => {
    fake.calls.push('window');
    fake.context['windowTheme'] = theme;
    fake.context['windowLeaving'] = leaving;
    fake.context['windowKeeper'] = keeper;
  },
}));
vi.mock('@/main/leaving', () => ({
  LeavingGuard: class {
    constructor(
      readonly converting: () => boolean,
      readonly ask: () => Promise<boolean>,
    ) {
      fake.context['leavingGuard'] = this;
    }
    allows(leave: () => void): boolean {
      fake.context['leaveWith'] = leave;
      return fake.context['leavingAllowed'] !== false;
    }
  },
  askToLeave: (words: unknown, window: unknown) => {
    fake.context['asked'] = { words, window };
    return Promise.resolve(true);
  },
}));

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
  fake.nativeTheme.shouldUseDarkColors = false;
  fake.calls.length = 0;
  fake.started = false;
  fake.packaged = true;
  fake.lock = true;
  fake.windows = [];
  fake.listeners.clear();
  fake.invoked.clear();
  fake.ready = undefined;
  fake.legacyMove = undefined;
  fake.moves = [];
  fake.locked = false;
  fake.errorBoxes = [];
  fake.formerUserData = undefined;
  fake.context = {
    theme: 'dark',
    activeJobs: new Map(),
    conversions: new Set(),
    queueRuns: { running: false, releaseAll: vi.fn() },
    pendingCatalog: { useRoot: step('use-root') },
    workflow: undefined,
    activeSharing: undefined,
    preferences: undefined,
    appSettings: undefined,
    processing: undefined,
    pendingRuns: undefined,
    log: undefined,
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
      // The log comes first, so that what goes wrong from here on is in it.
      'log:/home/userData/logs',
      'install-log',
      'cover-store:/covers',
      // Where the app works depends on what a person chose, so the settings are read before the rest.
      `app-settings-store:${path.join('/home/userData', 'app-settings.json')}`,
      'app-settings',
      'restore',
      'processing-folders:/pending-root,' + tmpdir(),
      'bootstrap',
      `settings-store:${path.join('/home/userData', 'settings.json')}`,
      'preferences',
      'pending-runs:pending-roots',
      'use-root',
      'prune-completed',
      `prune-abandoned:${String(24 * 60 * 60 * 1000)}`,
      `stale-scratch:/scratch/now:${String(24 * 60 * 60 * 1000)}`,
      `stale-scratch:/scratch/before:${String(24 * 60 * 60 * 1000)}`,
      'settle-earlier',
      'handlers:settings',
      'handlers:app-settings',
      'handlers:processing-folder',
      'handlers:troubleshooting',
      'handlers:inputs',
      'handlers:conversion',
      'handlers:queue-runs',
      'handlers:covers',
      'handlers:metadata',
      'handlers:artifacts',
      'handlers:pending',
      'handlers:opds',
      'serve-renderer',
      // What was kept of the window is read before it is made, so it opens as it was left.
      `window-state-store:${path.join('/home/userData', 'window-state.json')}`,
      'window-state:restore',
      'window',
    ]);
  });

  it('keeps what it built on the context every handler is given', async () => {
    const ready = await start();

    await ready();

    expect(fake.context['coverStore']).toBeDefined();
    expect(fake.context['preferences']).toBeDefined();
    expect(fake.context['appSettings']).toBeDefined();
    expect(fake.context['processing']).toBeDefined();
    // What the tools were found to be, for the diagnostics.
    expect(fake.context['toolchainStatus']).toEqual({
      state: 'blocked',
      tools: [],
      message: 'Not ready.',
    });
    expect(fake.context['pendingRuns']).toBeDefined();
  });

  it('puts the log in a folder of its own in the folder of the data, and says how the app started', async () => {
    const ready = await start();

    await ready();

    expect(fake.context['log']).toBeDefined();
    expect(String(fake.context['logStarted'])).toMatch(
      /^Manga2Ink \d.* started \((packaged|development build), Electron \S+, \S+ \S+\)\.$/u,
    );
    expect(fake.context['logTargets']).toMatchObject({ console, process });
  });

  it('says a build that is not packaged is a development build', async () => {
    fake.packaged = false;
    const ready = await start();

    await ready();

    expect(String(fake.context['logStarted'])).toContain('(development build,');
  });

  it('tells the terminal, which the log has not yet taken over, when the log cannot be written', async () => {
    // The terminal as it is when the log is made: its own `warn`, and not the log's.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const ready = await start();
    await ready();

    (
      fake.context['logOptions'] as { onFailure: (message: string, cause: unknown) => void }
    ).onFailure('The log could not be written.', new Error('disk'));

    expect(warn).toHaveBeenCalledWith('The log could not be written.', expect.any(Error));
  });

  it('lets the sharing of ready books follow the folder the books are in now', async () => {
    const useRoot = vi.fn();
    (fake.context['pendingCatalog'] as { useRoot: unknown }).useRoot = useRoot;
    const ready = await start();

    await ready();

    const root = useRoot.mock.calls[0]?.[0] as () => string;
    expect(root()).toBe('/where/books/wait');
  });

  it('works where the app settings say, and asks them each time', async () => {
    const ready = await start();

    await ready();

    expect((fake.context['processingChoice'] as () => unknown)()).toEqual({
      folder: '/chosen',
      earlier: [],
    });
  });

  it('lets the app settings read the languages the system prefers, when they are asked for', async () => {
    const ready = await start();

    await ready();

    expect((fake.context['systemLanguages'] as () => unknown)()).toEqual(['pt-BR', 'en-US']);
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

  it('moves Mangabound’s settings folder to the new name before the single-instance lock makes it', async () => {
    await start();

    expect(fake.formerUserData).toEqual({
      appData: '/home/appData',
      userData: '/home/userData',
      beforeLock: true,
    });
  });

  it('leaves the settings folder alone while the installer starts the app for its own events', async () => {
    fake.started = true;
    await start();

    expect(fake.formerUserData).toBeUndefined();
  });

  it('tells the log when Mangabound’s settings folder could not be moved', async () => {
    fake.context['formerMove'] = {
      kind: 'failed',
      problem: 'Could not move /home/appData/Mangabound: busy',
    };
    const ready = await start();

    await ready();

    expect(console.error).toHaveBeenCalledWith('Could not move /home/appData/Mangabound: busy');
  });

  it('with Mangabound still open, says so in the system’s language and leaves before the lock', async () => {
    fake.context['formerMove'] = { kind: 'former-open' };
    const ready = await start();

    expect(fake.errorBoxes).toEqual([dialogMessages['pt-BR'].formerAppOpen]);
    expect(fake.calls).toContain('exit:0');
    expect(fake.locked).toBe(false);
    await ready();
    expect(console.error).not.toHaveBeenCalled();
  });

  it('opens without a word when Mangabound’s folder has moved or was never there', async () => {
    await start();

    expect(fake.errorBoxes).toEqual([]);
    expect(fake.calls).not.toContain('exit:0');
    expect(fake.locked).toBe(true);
  });

  it('moves Mangabound’s pending books before what the installer’s folder kept', async () => {
    fake.context['former'] = { from: '/former', to: '/new' };
    fake.context['legacy'] = { from: '/old', to: '/new' };
    const ready = await start();

    await ready();

    expect(fake.moves.map((move) => move['from'])).toEqual(['/former', '/old']);
    expect(fake.calls.lastIndexOf('legacy-move')).toBeLessThan(
      fake.calls.indexOf('cover-store:/covers'),
    );
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
    [
      'the list of earlier folders',
      { settleFails: true },
      'Could not tell which earlier folders still hold books.',
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

  it('makes the window in the colors of the theme that was chosen, also when it is made again from the dock', async () => {
    fake.context['theme'] = 'dark';
    const ready = await start();
    await ready();
    expect(fake.context['windowTheme']).toBe('dark');

    fake.context['windowTheme'] = undefined;
    fake.context['theme'] = 'light';
    dispatch('activate');

    expect(fake.context['windowTheme']).toBe('light');
  });

  it.each([
    [true, 'dark'],
    [false, 'light'],
  ])(
    'makes the window in the theme the system is set to, for a person who follows it: dark %s is %s',
    async (systemIsDark, theme) => {
      fake.context['theme'] = 'system';
      fake.nativeTheme.shouldUseDarkColors = systemIsDark;
      const ready = await start();
      await ready();
      expect(fake.context['windowTheme']).toBe(theme);

      // And again from the dock, when the system has changed since.
      fake.nativeTheme.shouldUseDarkColors = !systemIsDark;
      dispatch('activate');

      expect(fake.context['windowTheme']).toBe(systemIsDark ? 'light' : 'dark');
    },
  );

  it('gives every window that is open, and the system, what a theme preference that is kept comes to', async () => {
    const ready = await start();
    await ready();
    const first = { id: 1 };
    const second = { id: 2 };
    fake.windows = [first, second] as never;
    fake.context['themedWindows'] = [];

    (fake.context['themed'] as (preference: string) => void)('system');

    expect(fake.context['themedWindows']).toEqual([
      { system: fake.nativeTheme, windows: [first, second], preference: 'system' },
    ]);
  });

  it('serves the page in the theme that is chosen when it is asked for, and gives the system its preference from the start', async () => {
    fake.context['theme'] = 'light';
    const ready = await start();
    await ready();

    expect(fake.context['themedApp']).toEqual([{ system: fake.nativeTheme, preference: 'light' }]);
    const served = fake.context['servedTheme'] as () => string;
    expect(served()).toBe('light');
    fake.context['theme'] = 'dark';
    expect(served()).toBe('dark');
  });

  it('serves the page in the theme the system is set to, now, for a person who follows it', async () => {
    fake.context['theme'] = 'system';
    const ready = await start();
    await ready();
    const served = fake.context['servedTheme'] as () => string;

    fake.nativeTheme.shouldUseDarkColors = true;
    expect(served()).toBe('dark');
    fake.nativeTheme.shouldUseDarkColors = false;
    expect(served()).toBe('light');
    expect(fake.context['themedApp']).toEqual([{ system: fake.nativeTheme, preference: 'system' }]);
  });

  it('follows the system while the preference says so, asking the preference and the windows each time', async () => {
    fake.context['theme'] = 'system';
    const ready = await start();
    await ready();
    const followed = fake.context['followed'] as {
      system: unknown;
      preference: () => string;
      windows: () => unknown;
    };
    const window = { id: 1 };
    fake.windows = [window] as never;

    expect(followed.system).toBe(fake.nativeTheme);
    expect(followed.preference()).toBe('system');
    fake.context['theme'] = 'dark';
    expect(followed.preference()).toBe('dark');
    expect(followed.windows()).toEqual([window]);
  });

  it('gives the window the one keeper of its size and place, also when it is made again from the dock', async () => {
    const ready = await start();
    await ready();
    const keeper = fake.context['keeper'];
    expect(fake.context['windowKeeper']).toBe(keeper);

    fake.context['windowKeeper'] = undefined;
    dispatch('activate');

    expect(fake.context['windowKeeper']).toBe(keeper);
  });

  it('tells the keeper the parts of the displays a window may use, the main display first, and whether a place can be kept', async () => {
    onPlatform('linux');
    const ready = await start();
    await ready();
    const keeper = fake.context['keeper'] as {
      areas: () => unknown;
      positionsKnown: boolean;
      report: (message: string, cause: unknown) => void;
    };

    expect(keeper.areas()).toEqual([
      { x: 0, y: 0, width: 1920, height: 1040 },
      { x: -1280, y: 0, width: 1280, height: 984 },
    ]);
    expect(keeper.positionsKnown).toBe(true);
    expect(fake.context['positionsAsked']).toEqual({ platform: 'linux', env: process.env });
    keeper.report('It could not be kept.', new Error('disk'));
    expect(console.error).toHaveBeenCalledWith('It could not be kept.', expect.any(Error));
  });

  it('does not keep a place when the system does not let a program place its window', async () => {
    fake.context['positionsKnown'] = false;
    const ready = await start();
    await ready();

    expect((fake.context['keeper'] as { positionsKnown: boolean }).positionsKnown).toBe(false);
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

describe('leaving while a conversion runs', () => {
  it('gives the window the guard, each time a window is made', async () => {
    const ready = await start();
    await ready();
    const first = fake.context['windowLeaving'];
    fake.calls.length = 0;

    dispatch('activate');

    expect(first).toBe(fake.context['leavingGuard']);
    expect(fake.context['windowLeaving']).toBe(first);
    expect(fake.calls).toEqual(['window']);
  });

  it('counts a conversion that is running, and nothing else, as something to lose', async () => {
    await start();
    const guard = fake.context['leavingGuard'] as { converting: () => boolean };
    // A search or a validation is in `activeJobs` too: it is over in a moment, and loses nothing.
    (fake.context['activeJobs'] as Map<string, unknown>).set('search', {});
    expect(guard.converting()).toBe(false);

    (fake.context['conversions'] as Set<string>).add('job');

    expect(guard.converting()).toBe(true);
  });

  it('gives the queue handlers the queues, the choices as they are now and the words of the window', async () => {
    const ready = await start();

    await ready();

    const { handlers, system } = fake.context['queueHandlers'] as {
      handlers: {
        queueRuns: unknown;
        choices: () => unknown;
        words: () => { done: { title: string } };
      };
      system: unknown;
    };
    expect(handlers.queueRuns).toBe(fake.context['queueRuns']);
    expect(handlers.choices()).toEqual({ keepAwake: false, notifyWhenDone: true });
    // The window was read in Portuguese, so that is what a notification says.
    expect(handlers.words().done.title).toBe('Seus livros estão prontos');
    expect(system).toBe('the system of the app');
  });

  it('counts a queue that is running as something to lose, before and between its conversions', async () => {
    await start();
    const guard = fake.context['leavingGuard'] as { converting: () => boolean };
    expect(guard.converting()).toBe(false);

    (fake.context['queueRuns'] as { running: boolean }).running = true;

    expect(guard.converting()).toBe(true);
  });

  it('asks in the words of the window, over the window that is open', async () => {
    fake.windows = [{ isMinimized: () => false, restore: vi.fn(), focus: vi.fn() }];
    await start();
    const guard = fake.context['leavingGuard'] as { ask: () => Promise<boolean> };

    expect(await guard.ask()).toBe(true);

    const asked = fake.context['asked'] as { words: { message: string }; window: unknown };
    expect(asked.words.message).toBe('A conversion is still running.');
    expect(asked.window).toBe(fake.windows[0]);
  });

  it('keeps the app open, and does not clean up, while the person is being asked', async () => {
    await start();
    fake.context['leavingAllowed'] = false;
    const quitting = { preventDefault: vi.fn() };

    dispatch('before-quit', quitting);

    expect(quitting.preventDefault).toHaveBeenCalledOnce();
    expect(fake.calls).not.toContain('clean-up');
  });

  it('quits again, for the person who agreed, to go on with the quit that was held back', async () => {
    await start();
    fake.context['leavingAllowed'] = false;
    dispatch('before-quit', { preventDefault: vi.fn() });
    fake.calls.length = 0;

    (fake.context['leaveWith'] as () => void)();

    expect(fake.calls).toEqual(['quit']);
  });

  it('cleans up once leaving is allowed, as it did before there was a question', async () => {
    await start();
    fake.context['leavingAllowed'] = true;

    dispatch('before-quit', { preventDefault: vi.fn() });

    expect(fake.calls).toContain('clean-up');
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
    expect(steps['settleAppSettings']).toBeUndefined();
    expect(steps['pruneCompleted']).toBeUndefined();
    expect(steps['settleWindowState']).toBeUndefined();
    expect(steps['settleLog']).toBeUndefined();
  });

  it('lets go of the queues that are running, whenever the app quits', async () => {
    await start();

    dispatch('before-quit', { preventDefault: vi.fn() });
    (cleanUp().steps['releaseQueues'] as () => void)();

    expect(
      (fake.context['queueRuns'] as { releaseAll: () => void }).releaseAll,
    ).toHaveBeenCalledOnce();
  });

  it('keeps the window as it is now when the keeper exists, since the quit may be ahead of its last move', async () => {
    const ready = await start();
    await ready();

    dispatch('before-quit', { preventDefault: vi.fn() });

    expect((cleanUp().steps['settleWindowState'] as () => unknown)()).toBe('window state kept');
  });

  it('releases the books, stops the share and writes the last change when they exist', async () => {
    const workflow = { releaseAll: vi.fn(() => 'released') };
    const sharing = { stop: vi.fn(() => 'stopped') };
    const preferences = { settled: vi.fn(() => 'settled') };
    const appSettings = { settled: vi.fn(() => 'app settled') };
    const pendingRuns = { pruneCompleted: vi.fn(() => 'pruned') };
    const log = { settled: vi.fn(() => 'log settled') };
    Object.assign(fake.context, {
      workflow,
      activeSharing: sharing,
      preferences,
      appSettings,
      pendingRuns,
      log,
    });
    await start();

    dispatch('before-quit', { preventDefault: vi.fn() });

    const { steps, quit, report } = cleanUp();
    expect((steps['releaseAll'] as () => unknown)()).toBe('released');
    expect((steps['stopSharing'] as () => unknown)()).toBe('stopped');
    expect((steps['settlePreferences'] as () => unknown)()).toBe('settled');
    expect((steps['settleAppSettings'] as () => unknown)()).toBe('app settled');
    expect((steps['pruneCompleted'] as () => unknown)()).toBe('pruned');
    expect((steps['settleLog'] as () => unknown)()).toBe('log settled');
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
