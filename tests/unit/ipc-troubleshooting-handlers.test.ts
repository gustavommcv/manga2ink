import type { IpcMainInvokeEvent } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { message } from '@/domain/message';
import { registerTroubleshootingHandlers } from '@/main/ipc/troubleshooting';
import { appFolders, openAppFolderCommandSchema } from '@/shared/app-folders-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const electron = vi.hoisted(() => ({
  listeners: new Map<string, Listener>(),
  writeText: vi.fn<(text: string) => Promise<void> | void>(),
  openPath: vi.fn<(path: string) => Promise<string>>(),
}));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      electron.listeners.set(channel, listener);
    },
  },
  app: {
    getVersion: () => '0.1.0-alpha.15',
    isPackaged: true,
    getPath: (name: string) => `/home/reader/.config/${name}`,
  },
  clipboard: { writeText: electron.writeText },
  shell: { openPath: electron.openPath },
}));

const mainFrame = {};
const event = { sender: { mainFrame }, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;
const call = (channel: string, payload?: unknown): Promise<WorkflowResult<unknown>> =>
  electron.listeners.get(channel)!(event, payload);

function register(overrides: Record<string, unknown> = {}): void {
  registerTroubleshootingHandlers({
    appSettings: { language: () => 'pt-BR' },
    processing: { chosen: () => null },
    toolchainStatus: {
      state: 'ready',
      message: 'Ready.',
      tools: [{ name: 'mangabind', releaseTag: 'v0.7.2', state: 'ready', message: 'Ready.' }],
    },
    ...overrides,
  } as never);
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  electron.openPath.mockResolvedValue('');
});
afterEach(() => {
  electron.listeners.clear();
  electron.writeText.mockReset();
  electron.openPath.mockReset();
  vi.restoreAllMocks();
});

describe('copying the diagnostics', () => {
  it('puts what the app knows about itself on the clipboard', async () => {
    register();

    expect(await call('app:copy-diagnostics')).toEqual({ ok: true, value: undefined });

    const text = electron.writeText.mock.calls[0]?.[0] ?? '';
    expect(text).toContain('Mangabound 0.1.0-alpha.15 (packaged)');
    expect(text).toContain(`System: ${process.platform} ${process.arch}`);
    expect(text).toContain('Language of the window: pt-BR');
    expect(text).toContain('Working folder: the default');
    expect(text).toContain('  mangabind v0.7.2: verified');
  });

  it('says a folder was chosen when one was, and which is not in it', async () => {
    register({ processing: { chosen: () => '/mnt/private-books' } });

    await call('app:copy-diagnostics');

    const text = electron.writeText.mock.calls[0]?.[0] ?? '';
    expect(text).toContain('Working folder: chosen by the person');
    expect(text).not.toContain('private-books');
  });

  it('is in English and says the tools are not reported before they have been checked', async () => {
    register({ appSettings: undefined, processing: undefined, toolchainStatus: undefined });

    await call('app:copy-diagnostics');

    const text = electron.writeText.mock.calls[0]?.[0] ?? '';
    expect(text).toContain('Language of the window: en');
    expect(text).toContain('Working folder: the default');
    expect(text).toContain('Conversion tools: not reported');
  });

  it.each([
    [
      'throws',
      () => {
        throw new Error('no clipboard');
      },
    ],
    ['rejects', () => Promise.reject(new Error('no clipboard'))],
  ])(
    'says it could not when the clipboard %s, and keeps the cause in the log',
    async (_how, refuse) => {
      register();
      electron.writeText.mockImplementation(refuse);

      expect(await call('app:copy-diagnostics')).toEqual({
        ok: false,
        error: {
          code: 'diagnostics_not_copied',
          said: message('failure.diagnosticsNotCopied', {}),
        },
      });
      expect(console.error).toHaveBeenCalled();
    },
  );
});

describe('the folders the window can ask to have opened', () => {
  it('are named, and have no path in the command', () => {
    expect(appFolders).toEqual(['data', 'logs']);
    expect(openAppFolderCommandSchema.parse({ folder: 'data' })).toEqual({ folder: 'data' });
    expect(openAppFolderCommandSchema.parse({ folder: 'data', path: '/etc' })).toEqual({
      folder: 'data',
    });
  });

  it.each([{}, { folder: '/etc' }, { folder: '../data' }, { folder: 'LOGS' }, 'data', null])(
    'refuse %j',
    (command) => {
      expect(openAppFolderCommandSchema.safeParse(command).success).toBe(false);
    },
  );
});

describe('opening the data folder', () => {
  it('opens the folder of the app’s data in the file manager', async () => {
    register();

    expect(await call('app:open-folder', { folder: 'data' })).toEqual({
      ok: true,
      value: undefined,
    });

    expect(electron.openPath).toHaveBeenCalledExactlyOnceWith('/home/reader/.config/userData');
  });

  it('says it could not when the system answers with a reason, and logs the reason', async () => {
    register();
    electron.openPath.mockResolvedValue('Failed to open path');

    expect(await call('app:open-folder', { folder: 'data' })).toEqual({
      ok: false,
      error: { code: 'folder_not_opened', said: message('failure.folderNotOpened', {}) },
    });
    expect(console.error).toHaveBeenCalledWith(
      'The data folder of the app could not be opened.',
      'Failed to open path',
    );
  });

  it('opens the folder of the log, which is made first so that it can be opened before a line is written', async () => {
    const ensureFolder = vi.fn(() => Promise.resolve('/home/reader/.config/userData/logs'));
    register({ log: { ensureFolder } });

    expect(await call('app:open-folder', { folder: 'logs' })).toEqual({
      ok: true,
      value: undefined,
    });

    expect(ensureFolder).toHaveBeenCalledOnce();
    expect(electron.openPath).toHaveBeenCalledExactlyOnceWith('/home/reader/.config/userData/logs');
  });

  it.each([
    ['there is no log yet', undefined],
    [
      'the folder of the log cannot be made',
      { ensureFolder: () => Promise.reject(new Error('read-only')) },
    ],
    [
      'the folder of the log cannot be made and the reason is only a text',
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- what a caller that throws a text does
      { ensureFolder: () => Promise.reject('read-only') },
    ],
  ])('says it could not when %s, and opens nothing', async (_name, log) => {
    register({ log });

    expect(await call('app:open-folder', { folder: 'logs' })).toEqual({
      ok: false,
      error: { code: 'folder_not_opened', said: message('failure.folderNotOpened', {}) },
    });
    expect(electron.openPath).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('opens nothing for a folder that is not on the list', async () => {
    register();

    const answer = await call('app:open-folder', { folder: '/etc' });

    expect(answer.ok).toBe(false);
    expect(electron.openPath).not.toHaveBeenCalled();
  });
});
