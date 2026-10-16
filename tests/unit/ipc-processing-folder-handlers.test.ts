import path from 'node:path';

import type { IpcMainInvokeEvent } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ProcessingFolderError } from '@/adapters/library/processing-folders';
import { registerProcessingFolderHandlers } from '@/main/ipc/processing-folder';
import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const electron = vi.hoisted(() => ({
  listeners: new Map<string, Listener>(),
  showOpenDialog: vi.fn(),
  status: vi.fn(),
}));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      electron.listeners.set(channel, listener);
    },
  },
  dialog: { showOpenDialog: electron.showOpenDialog },
}));
vi.mock('@/main/processing-status', () => ({ processingStatus: electron.status }));

const mainFrame = {};
const event = { sender: { mainFrame }, senderFrame: mainFrame } as unknown as IpcMainInvokeEvent;
const call = (channel: string): Promise<WorkflowResult<unknown>> =>
  electron.listeners.get(channel)!(event, undefined);

const status: ProcessingFolderStatus = {
  chosen: path.resolve('big'),
  scratch: path.resolve('big', 'Scratch'),
  pending: path.resolve('big', 'Pending'),
  available: true,
  freeBytes: 1000,
  earlier: [],
};

function contextFor(overrides: Record<string, unknown> = {}): {
  context: Parameters<typeof registerProcessingFolderHandlers>[0];
  choose: ReturnType<typeof vi.fn>;
  check: ReturnType<typeof vi.fn>;
} {
  const choose = vi.fn(() => Promise.resolve());
  const check = vi.fn(() => Promise.resolve());
  const context = {
    activeJobs: new Map(),
    activeSharing: undefined,
    activeSharingTarget: undefined,
    appSettings: { chooseProcessingFolder: choose },
    pendingRuns: {},
    processing: { chosen: () => null, check },
    ...overrides,
  } as unknown as Parameters<typeof registerProcessingFolderHandlers>[0];
  registerProcessingFolderHandlers(context);
  return { context, choose, check };
}

beforeEach(() => {
  electron.status.mockResolvedValue(status);
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  electron.listeners.clear();
  electron.showOpenDialog.mockReset();
  electron.status.mockReset();
  vi.restoreAllMocks();
});

describe('asking where the app works', () => {
  it('tells what the main process knows of it', async () => {
    contextFor();

    expect(await call('app:get-processing-folder')).toEqual({ ok: true, value: status });
  });
});

describe('choosing the folder the app works in', () => {
  it('opens a dialog for a folder, and starts it where the folder in use is', async () => {
    const { check, choose } = contextFor({
      processing: { chosen: () => path.resolve('now'), check: vi.fn() },
    });
    electron.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    await call('app:choose-processing-folder');

    expect(electron.showOpenDialog).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: path.resolve('now'),
      }),
    );
    expect(check).not.toHaveBeenCalled();
    expect(choose).not.toHaveBeenCalled();
  });

  it('starts the dialog anywhere when no folder is chosen', async () => {
    contextFor();
    electron.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    await call('app:choose-processing-folder');

    expect(electron.showOpenDialog.mock.calls[0]?.[0]).not.toHaveProperty('defaultPath');
  });

  it.each([
    ['is cancelled', { canceled: true, filePaths: [] }],
    ['gives no folder', { canceled: false, filePaths: [] }],
  ])('changes nothing when the dialog %s', async (_name, answer) => {
    const { check, choose } = contextFor();
    electron.showOpenDialog.mockResolvedValue(answer);

    expect(await call('app:choose-processing-folder')).toEqual({ ok: true, value: null });
    expect(check).not.toHaveBeenCalled();
    expect(choose).not.toHaveBeenCalled();
  });

  it('checks the folder, keeps it, and tells what the app does now', async () => {
    const { check, choose } = contextFor();
    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['big/../big'] });

    expect(await call('app:choose-processing-folder')).toEqual({ ok: true, value: status });

    expect(check).toHaveBeenCalledExactlyOnceWith(path.resolve('big'));
    expect(choose).toHaveBeenCalledExactlyOnceWith(path.resolve('big'));
  });

  it('keeps nothing, and says so, when the app cannot work in the folder', async () => {
    const { choose } = contextFor({
      processing: {
        chosen: () => null,
        check: () =>
          Promise.reject(new ProcessingFolderError('unusable', 'The app cannot write in it.')),
      },
    });
    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/read-only'] });

    expect(await call('app:choose-processing-folder')).toEqual({
      ok: false,
      error: { code: 'processing_folder_unusable', message: 'The app cannot write in it.' },
    });
    expect(choose).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });

  it('does not take another failure of the check for a folder it cannot use', async () => {
    contextFor({
      processing: { chosen: () => null, check: () => Promise.reject(new Error('disk is on fire')) },
    });
    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/somewhere'] });

    const answer = await call('app:choose-processing-folder');

    expect(answer.ok).toBe(false);
    expect(answer).not.toMatchObject({ error: { code: 'processing_folder_unusable' } });
  });

  it.each([
    ['a conversion is running', { activeJobs: new Map([['job', new AbortController()]]) }],
    ['sharing is running', { activeSharing: {} }],
    ['sharing is starting', { activeSharingTarget: {} }],
  ])('does not even open the dialog while %s', async (_name, busy) => {
    const { choose } = contextFor(busy);

    const answer = await call('app:choose-processing-folder');

    expect(answer).toMatchObject({ ok: false, error: { code: 'processing_busy' } });
    expect(electron.showOpenDialog).not.toHaveBeenCalled();
    expect(choose).not.toHaveBeenCalled();
  });

  it('refuses a folder when something was started while the dialog was open', async () => {
    const activeJobs = new Map<string, AbortController>();
    const { check, choose } = contextFor({ activeJobs });
    electron.showOpenDialog.mockImplementation(() => {
      activeJobs.set('job', new AbortController());
      return Promise.resolve({ canceled: false, filePaths: ['/somewhere'] });
    });

    const answer = await call('app:choose-processing-folder');

    expect(answer).toMatchObject({ ok: false, error: { code: 'processing_busy' } });
    expect(check).not.toHaveBeenCalled();
    expect(choose).not.toHaveBeenCalled();
  });

  it('is an error, and not a guess, before the app knows where it works', async () => {
    contextFor({ appSettings: undefined });
    expect((await call('app:choose-processing-folder')).ok).toBe(false);
    electron.listeners.clear();
    contextFor({ processing: undefined });
    expect((await call('app:choose-processing-folder')).ok).toBe(false);
    expect(electron.showOpenDialog).not.toHaveBeenCalled();
  });
});

describe('putting the app back in its own places', () => {
  it('keeps no folder, and tells what the app does now', async () => {
    const { choose } = contextFor();

    expect(await call('app:use-default-processing-folder')).toEqual({ ok: true, value: status });

    expect(choose).toHaveBeenCalledExactlyOnceWith(null);
  });

  it('waits while something is being made or shared', async () => {
    const { choose } = contextFor({ activeSharing: {} });

    expect(await call('app:use-default-processing-folder')).toMatchObject({
      ok: false,
      error: { code: 'processing_busy' },
    });
    expect(choose).not.toHaveBeenCalled();
  });

  it('is an error before the app knows where it works', async () => {
    contextFor({ appSettings: undefined });

    expect((await call('app:use-default-processing-folder')).ok).toBe(false);
  });
});
