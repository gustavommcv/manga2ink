import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MangaboundBridge } from '@/shared/runtime-info';
import type { ConversionProgressPayload } from '@/shared/workflow-contract';

const electron = vi.hoisted(() => ({
  exposed: new Map<string, unknown>(),
  invoke: vi.fn<(channel: string, payload?: unknown) => Promise<unknown>>(),
  on: vi.fn<(channel: string, listener: (...args: never[]) => void) => void>(),
  removeListener: vi.fn<(channel: string, listener: (...args: never[]) => void) => void>(),
  pathOfFile: vi.fn<(file: unknown) => string>(),
}));
vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: (name: string, api: unknown) => {
      electron.exposed.set(name, api);
    },
  },
  ipcRenderer: {
    invoke: electron.invoke,
    on: electron.on,
    removeListener: electron.removeListener,
  },
  webUtils: { getPathForFile: electron.pathOfFile },
}));

/** Runs the preload again, as the window does once, and gives what it handed the page. */
async function loadBridge(): Promise<MangaboundBridge> {
  vi.resetModules();
  electron.exposed.clear();
  await import('@/preload/index');
  return electron.exposed.get('mangabound') as MangaboundBridge;
}

const originalArguments = [...process.argv];
const electronVersion = Object.getOwnPropertyDescriptor(process.versions, 'electron');

beforeEach(() => {
  electron.invoke.mockResolvedValue({ ok: true, value: 'main said so' });
  electron.pathOfFile.mockImplementation((file) => `/disk/${(file as { name: string }).name}`);
});
afterEach(() => {
  process.argv = [...originalArguments];
  if (electronVersion === undefined) Reflect.deleteProperty(process.versions, 'electron');
  else Object.defineProperty(process.versions, 'electron', electronVersion);
  electron.invoke.mockReset();
  electron.on.mockReset();
  electron.removeListener.mockReset();
  electron.pathOfFile.mockReset();
});

const aFile = (name: string): File => ({ name }) as unknown as File;

/** What each method of the bridge sends, and where: the whole of what the page can ask of main. */
const forwarded: readonly (readonly [
  keyof MangaboundBridge,
  readonly unknown[],
  string,
  unknown,
])[] = [
  ['chooseInputs', ['folders'], 'workflow:choose-inputs', 'folders'],
  ['inspectInput', ['selection-1'], 'workflow:inspect-input', 'selection-1'],
  ['releaseInput', ['session-1'], 'workflow:release-input', 'session-1'],
  ['chooseLibrary', [], 'workflow:choose-library', undefined],
  ['getDeviceProfiles', [], 'workflow:get-device-profiles', undefined],
  ['convert', [{ jobId: 'job' }], 'workflow:convert', { jobId: 'job' }],
  ['planConversion', [{ jobId: 'job' }], 'workflow:plan', { jobId: 'job' }],
  ['createPendingRun', [], 'pending:create', undefined],
  ['listPendingRuns', [], 'pending:list', undefined],
  ['discardPendingRun', ['library-1'], 'pending:discard', 'library-1'],
  ['saveArtifactAs', ['artifact-1'], 'pending:save-as', 'artifact-1'],
  ['saveAllArtifacts', [['a', 'b']], 'pending:save-all', ['a', 'b']],
  ['cancelConversion', ['job-1'], 'workflow:cancel', 'job-1'],
  [
    'planLibrary',
    ['job-1', 'session-1'],
    'workflow:plan-library',
    { jobId: 'job-1', sessionId: 'session-1' },
  ],
  [
    'writeTitleMapping',
    ['session-1', 'Title', { volumes: [] }],
    'workflow:write-title-mapping',
    { sessionId: 'session-1', title: 'Title', mapping: { volumes: [] } },
  ],
  ['saveBookDetails', [{ title: 'T' }], 'workflow:save-book-details', { title: 'T' }],
  ['listCovers', [{ kind: 'folder' }], 'covers:list', { kind: 'folder' }],
  ['chooseCover', [{ book: 1 }], 'covers:choose', { book: 1 }],
  ['chooseCoversFolder', [{ book: 1 }], 'covers:choose-folder', { book: 1 }],
  ['removeCover', [{ book: 1 }], 'covers:remove', { book: 1 }],
  ['convertLibrary', [{ libraryId: 'l' }], 'workflow:convert-library', { libraryId: 'l' }],
  ['listMetadataProviders', [], 'workflow:list-metadata-providers', undefined],
  [
    'searchMetadata',
    ['job-1', 'provider', 'Title'],
    'workflow:search-metadata',
    { jobId: 'job-1', providerId: 'provider', title: 'Title' },
  ],
  [
    'suggestVolumes',
    ['job-1', 'provider', 'work-1', 'pt'],
    'workflow:suggest-volumes',
    { jobId: 'job-1', providerId: 'provider', workId: 'work-1', language: 'pt' },
  ],
  [
    'openProviderHomepage',
    ['provider'],
    'workflow:open-provider-homepage',
    { providerId: 'provider' },
  ],
  ['openArtifact', ['artifact-1'], 'artifact:open', 'artifact-1'],
  ['showArtifactInFolder', ['artifact-1'], 'artifact:show-in-folder', 'artifact-1'],
  ['listNetworkInterfaces', [], 'opds:list-network-interfaces', undefined],
  [
    'startSharing',
    ['library-1', '192.168.0.2', { enabled: false }],
    'opds:start-sharing',
    { libraryId: 'library-1', interfaceAddress: '192.168.0.2', auth: { enabled: false } },
  ],
  ['stopSharing', [], 'opds:stop-sharing', undefined],
  ['getSharingStatus', [], 'opds:get-status', undefined],
  ['loadSettings', [], 'settings:load', undefined],
  ['saveSettings', [{ saved: true }], 'settings:save', { saved: true }],
];

describe('what the page is handed', () => {
  it('is one frozen object under one name, with exactly the methods the app means to give', async () => {
    const bridge = await loadBridge();

    expect([...electron.exposed.keys()]).toEqual(['mangabound']);
    expect(Object.isFrozen(bridge)).toBe(true);
    expect(Object.isFrozen(bridge.runtime)).toBe(true);
    // A new method is a new door into the main process: it has to be written down here, on purpose.
    expect(Object.keys(bridge).sort()).toEqual(
      [
        'runtime',
        'getToolchainStatus',
        'registerDroppedFiles',
        'dropCovers',
        'onConversionProgress',
        ...forwarded.map(([name]) => name),
      ].sort(),
    );
  });

  it('gives the page no way to the IPC layer itself', async () => {
    const bridge = await loadBridge();
    const everything = JSON.stringify(Object.keys(bridge));

    for (const leaked of ['ipcRenderer', 'invoke', 'send', 'removeListener', 'webUtils']) {
      expect(bridge).not.toHaveProperty(leaked);
      expect(everything).not.toContain(`"${leaked}"`);
    }
  });
});

describe('what each method sends', () => {
  it.each(forwarded)(
    '%s is one invoke on its own channel with only what it was given',
    async (name, args, channel, payload) => {
      const bridge = await loadBridge();

      const answer = await (bridge[name] as (...given: unknown[]) => Promise<unknown>)(...args);

      expect(electron.invoke).toHaveBeenCalledExactlyOnceWith(channel, payload);
      // What main answers is handed back as it is, success or failure.
      expect(answer).toEqual({ ok: true, value: 'main said so' });
    },
  );

  it('asks for the toolchain status with no payload and gives back what main says', async () => {
    electron.invoke.mockResolvedValue({ state: 'ready' });
    const bridge = await loadBridge();

    expect(await bridge.getToolchainStatus()).toEqual({ state: 'ready' });
    expect(electron.invoke).toHaveBeenCalledExactlyOnceWith('toolchain:get-status');
  });

  it('gives back a refusal from main as it came', async () => {
    const refusal = { ok: false, error: { code: 'untrusted_sender', message: 'No.' } };
    electron.invoke.mockResolvedValue(refusal);
    const bridge = await loadBridge();

    expect(await bridge.chooseLibrary()).toBe(refusal);
  });

  it('leaves the language out of a volume suggestion that has none, rather than sending undefined', async () => {
    const bridge = await loadBridge();

    await bridge.suggestVolumes('job-1', 'provider', 'work-1');
    await bridge.suggestVolumes('job-1', 'provider', 'work-1', 'pt');

    const [withoutLanguage, withLanguage] = electron.invoke.mock.calls.map(
      ([, payload]) => payload as Record<string, unknown>,
    );
    expect(Object.keys(withoutLanguage ?? {}).sort()).toEqual(['jobId', 'providerId', 'workId']);
    expect(withLanguage).toEqual({
      jobId: 'job-1',
      providerId: 'provider',
      workId: 'work-1',
      language: 'pt',
    });
    expect(electron.invoke.mock.calls.map(([channel]) => channel)).toEqual([
      'workflow:suggest-volumes',
      'workflow:suggest-volumes',
    ]);
  });
});

describe('files dropped on the window', () => {
  it('are sent as the paths the preload read from them, in the order they were dropped', async () => {
    const bridge = await loadBridge();

    await bridge.registerDroppedFiles([aFile('a.cbz'), aFile('b.cbz')]);

    expect(electron.invoke).toHaveBeenCalledExactlyOnceWith('workflow:register-inputs', {
      paths: ['/disk/a.cbz', '/disk/b.cbz'],
    });
  });

  it('become an empty path when the file has no place on disk, or cannot be read at all', async () => {
    electron.pathOfFile.mockImplementation((file) => {
      const { name } = file as { name: string };
      if (name === 'from-a-web-page') return '';
      if (name === 'not-a-file') throw new TypeError('Not a File');
      return `/disk/${name}`;
    });
    const bridge = await loadBridge();

    await bridge.registerDroppedFiles([
      aFile('a.cbz'),
      aFile('from-a-web-page'),
      aFile('not-a-file'),
    ]);

    expect(electron.invoke).toHaveBeenCalledExactlyOnceWith('workflow:register-inputs', {
      paths: ['/disk/a.cbz', '', ''],
    });
  });

  it('are what a covers drop sends beside the book it is for, and the page cannot supply the paths', async () => {
    const bridge = await loadBridge();
    const command = { bookId: 'book-1', paths: ['/the/page/chose/this'] } as never;

    await bridge.dropCovers(command, [aFile('cover.png')]);

    expect(electron.invoke).toHaveBeenCalledExactlyOnceWith('covers:drop', {
      bookId: 'book-1',
      paths: ['/disk/cover.png'],
    });
  });
});

describe('progress of a conversion', () => {
  const progress = { jobId: 'job-1', stage: 'converting' } as unknown as ConversionProgressPayload;

  it('reaches the listener as the payload alone, never with the event that carried it', async () => {
    const bridge = await loadBridge();
    const listener = vi.fn();

    bridge.onConversionProgress(listener);
    const [channel, handler] = electron.on.mock.calls[0] ?? [];
    (handler as (event: unknown, payload: unknown) => void)({ sender: 'ipc' }, progress);

    expect(channel).toBe('workflow:progress');
    expect(listener).toHaveBeenCalledExactlyOnceWith(progress);
  });

  it('stops listening with the same handler it started with, and leaves other listeners alone', async () => {
    const bridge = await loadBridge();

    const stopFirst = bridge.onConversionProgress(vi.fn());
    bridge.onConversionProgress(vi.fn());
    const handlers = electron.on.mock.calls.map(([, handler]) => handler);
    expect(handlers).toHaveLength(2);
    expect(handlers[0]).not.toBe(handlers[1]);

    stopFirst();

    expect(electron.removeListener).toHaveBeenCalledExactlyOnceWith(
      'workflow:progress',
      handlers[0],
    );
  });
});

describe('what the page can read of the runtime', () => {
  it('is the version main handed the window, the platform, and the Electron version', async () => {
    process.argv = [...originalArguments, '--app-version=0.1.0-alpha.13'];
    Object.defineProperty(process.versions, 'electron', { configurable: true, value: '99.1.0' });

    const { runtime } = await loadBridge();

    expect(runtime).toEqual({
      electron: '99.1.0',
      platform: process.platform,
      version: '0.1.0-alpha.13',
    });
  });

  it('says 0.0.0 when the window was not given a version', async () => {
    process.argv = originalArguments.filter((argument) => !argument.startsWith('--app-version='));

    const { runtime } = await loadBridge();

    expect(runtime.version).toBe('0.0.0');
  });
});

describe('the channels the page can reach', () => {
  const mainSources = (directory: string): string[] =>
    readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return mainSources(entryPath);
      return entry.name.endsWith('.ts') ? [readFileSync(entryPath, 'utf8')] : [];
    });
  const channelsOfMain = new Set(
    mainSources(path.join(import.meta.dirname, '..', '..', 'src', 'main'))
      .flatMap((source) => [...source.matchAll(/'([a-z]+:[a-z-]+)'/gu)].map((match) => match[1]))
      .filter((name): name is string => name !== undefined && !name.startsWith('node:')),
  );

  it('are every one main answers, so a name typed wrong in the preload fails here and not in a window', async () => {
    const bridge = await loadBridge();
    const listener = vi.fn();
    bridge.onConversionProgress(listener);
    await bridge.getToolchainStatus();
    await bridge.registerDroppedFiles([]);
    await bridge.dropCovers({} as never, []);
    for (const [name, args] of forwarded) {
      await (bridge[name] as (...given: unknown[]) => Promise<unknown>)(...args);
    }

    const used = new Set([
      ...electron.invoke.mock.calls.map(([channel]) => channel),
      ...electron.on.mock.calls.map(([channel]) => channel),
    ]);
    expect([...used].filter((channel) => !channelsOfMain.has(channel))).toEqual([]);
    // And the other way: a handler no method of the bridge reaches is a door nobody can open.
    expect([...channelsOfMain].filter((channel) => !used.has(channel))).toEqual([]);
  });
});
