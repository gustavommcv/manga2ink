import type { IpcMainInvokeEvent } from 'electron';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { registerCoverHandlers } from '@/main/ipc/covers';
import { registerInputHandlers } from '@/main/ipc/inputs';
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

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  electron.listeners.clear();
  electron.showOpenDialog.mockReset();
  vi.restoreAllMocks();
});

describe('the covers a person attaches', () => {
  const covers = () => ({
    list: vi.fn().mockResolvedValue([{ slot: 1, name: '01.jpg', source: 'chosen' }]),
    choose: vi.fn().mockResolvedValue({ covers: [{ slot: 1 }] }),
    takeInOrder: vi.fn().mockResolvedValue({ covers: [{ slot: 1 }, { slot: 2 }] }),
    drop: vi.fn().mockResolvedValue({ covers: [{ slot: 2 }] }),
    remove: vi.fn().mockResolvedValue({ covers: [] }),
  });
  const register = (lastPickerFolder?: string) => {
    const store = covers();
    const context = { workflow: { covers: store }, lastPickerFolder };
    registerCoverHandlers(context as never);
    return store;
  };

  it('lists the covers of an item, or of one title of a library', async () => {
    const store = register();

    expect(await call('covers:list', { sessionId: 'session', title: 'Good' })).toEqual({
      ok: true,
      value: [{ slot: 1, name: '01.jpg', source: 'chosen' }],
    });
    expect(store.list).toHaveBeenCalledExactlyOnceWith('session', 'Good');
  });

  it('asks for one image, opening where the last dialog did, and attaches the one chosen', async () => {
    const store = register('/pictures');
    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/pictures/01.jpg'] });

    const result = await call('covers:choose', { sessionId: 'session', slot: 1 });

    expect(result).toEqual({ ok: true, value: { covers: [{ slot: 1 }] } });
    expect(electron.showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: ['openFile'],
        defaultPath: '/pictures',
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'] }],
      }),
    );
    // A title is part of what is sent only when there is one.
    expect(store.choose).toHaveBeenCalledExactlyOnceWith(
      { sessionId: 'session' },
      1,
      '/pictures/01.jpg',
    );
    await call('covers:choose', { sessionId: 'session', title: 'Good', slot: 'book' });
    expect(store.choose).toHaveBeenLastCalledWith(
      { sessionId: 'session', title: 'Good' },
      'book',
      '/pictures/01.jpg',
    );
  });

  it('attaches nothing when the dialog was closed, or gave nothing', async () => {
    const store = register();

    electron.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    expect(await call('covers:choose', { sessionId: 'session', slot: 1 })).toEqual({
      ok: true,
      value: null,
    });
    electron.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [] });
    expect(await call('covers:choose-folder', { sessionId: 'session', slots: [1] })).toEqual({
      ok: true,
      value: null,
    });
    expect(store.choose).not.toHaveBeenCalled();
    expect(store.takeInOrder).not.toHaveBeenCalled();
    // No folder was remembered, so the dialog opened where the system chose.
    expect(electron.showOpenDialog.mock.calls[0]?.[0]).not.toHaveProperty('defaultPath');
  });

  it('hands out a folder of images to the books in order', async () => {
    const store = register('/pictures');
    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/pictures/Covers'] });

    const result = await call('covers:choose-folder', {
      sessionId: 'session',
      title: 'Good',
      slots: [1, 2],
    });

    expect(result).toMatchObject({ ok: true });
    expect(electron.showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({ properties: ['openDirectory'], defaultPath: '/pictures' }),
    );
    expect(store.takeInOrder).toHaveBeenCalledExactlyOnceWith(
      { sessionId: 'session', title: 'Good' },
      [1, 2],
      ['/pictures/Covers'],
    );
  });

  it('takes dropped files by their path on disk only, and drops the ones with none', async () => {
    const store = register();
    const absolute = path.resolve('covers', '01.jpg');

    await call('covers:drop', {
      sessionId: 'session',
      slots: [1, 2],
      slot: 2,
      paths: [absolute, '', 'relative/02.jpg'],
    });

    expect(store.drop).toHaveBeenCalledExactlyOnceWith({ sessionId: 'session' }, [1, 2], 2, [
      absolute,
    ]);
  });

  it('removes the cover of one book', async () => {
    const store = register();

    expect(await call('covers:remove', { sessionId: 'session', slot: 'book' })).toEqual({
      ok: true,
      value: { covers: [] },
    });
    expect(store.remove).toHaveBeenCalledExactlyOnceWith({ sessionId: 'session' }, 'book');
  });

  it('is a failure the screen can say when the tools are not ready', async () => {
    registerCoverHandlers({ workflow: undefined, lastPickerFolder: undefined });

    expect((await call('covers:list', { sessionId: 'session' })).ok).toBe(false);
  });
});

describe('what a person chooses to convert', () => {
  let directory: string;
  let folder: string;
  let archive: string;
  let notes: string;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'mangabound-input-handlers-'));
    folder = path.join(directory, 'Manga');
    archive = path.join(directory, 'Vagabond.cbz');
    notes = path.join(directory, 'notes.txt');
    await mkdir(folder);
    await writeFile(archive, 'zip');
    await writeFile(notes, 'text');
  });
  afterEach(() => rm(directory, { recursive: true, force: true }));

  const register = (overrides: Record<string, unknown> = {}) => {
    const context = {
      selectedInputs: new Map(),
      selectedLibraries: new Map(),
      lastPickerFolder: undefined as string | undefined,
      preferences: undefined,
      currentPreferences: {},
      lastSaveFolder: undefined,
      preferredNetworkInterface: undefined,
      workflow: undefined as unknown,
      ...overrides,
    };
    registerInputHandlers(context as never);
    return context;
  };

  it('registers folders and archives as ids the page holds, and says why the rest was left', async () => {
    const context = register();

    const result = (await call('workflow:register-inputs', {
      paths: [folder, archive, notes, path.join(directory, 'gone')],
    })) as {
      ok: true;
      value: {
        inputs: { selectionId: string; kind: string; displayName: string; displayPath: string }[];
        rejected: { name: string; reason: string }[];
      };
    };

    expect(result.value.inputs.map((input) => [input.kind, input.displayName])).toEqual([
      ['folder', 'Manga'],
      ['cbz', 'Vagabond.cbz'],
    ]);
    expect(result.value.rejected.map((item) => item.name)).toEqual(['notes.txt', 'gone']);
    // The page is given an id and a display path; what the id stands for stays in the main process.
    for (const input of result.value.inputs) {
      expect(context.selectedInputs.get(input.selectionId)).toMatchObject({
        inputPath: input.displayPath,
        kind: input.kind,
      });
    }
  });

  it('opens the dialog for folders or files, where it was last, and remembers where it went', async () => {
    const context = register({ lastPickerFolder: '/earlier' });
    electron.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [folder] });

    const folders = (await call('workflow:choose-inputs', 'folders')) as {
      value: { inputs: unknown[] };
    };

    expect(folders.value.inputs).toHaveLength(1);
    expect(electron.showOpenDialog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        properties: ['openDirectory', 'multiSelections'],
        defaultPath: '/earlier',
      }),
    );
    expect(electron.showOpenDialog.mock.calls[0]?.[0]).not.toHaveProperty('filters');
    expect(context.lastPickerFolder).toBe(folder);

    electron.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [archive] });
    await call('workflow:choose-inputs', 'files');
    expect(electron.showOpenDialog).toHaveBeenLastCalledWith(
      expect.objectContaining({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Comic book archive', extensions: ['cbz'] }],
      }),
    );
    // A file is remembered by the folder it is in.
    expect(context.lastPickerFolder).toBe(directory);
  });

  it('registers nothing when the dialog was closed, and does not forget the folder', async () => {
    const context = register({ lastPickerFolder: '/earlier' });
    electron.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [folder] });

    const result = await call('workflow:choose-inputs', 'folders');

    expect(result).toEqual({ ok: true, value: { inputs: [], rejected: [] } });
    expect(context.lastPickerFolder).toBe('/earlier');
    expect(context.selectedInputs.size).toBe(0);
  });

  it('opens where the system chooses when no folder was kept', async () => {
    register();
    electron.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    await call('workflow:choose-inputs', 'files');
    await call('workflow:choose-library');

    for (const [options] of electron.showOpenDialog.mock.calls) {
      expect(options).not.toHaveProperty('defaultPath');
    }
  });

  it('reads an input once, whatever the page does with the id, and lets a session go', async () => {
    const inspect = vi.fn().mockResolvedValue({ sessionId: 'session', kind: 'folder' });
    const release = vi.fn().mockResolvedValue(undefined);
    const context = register({ workflow: { inspect, release } });
    context.selectedInputs.set('one', { inputPath: folder, displayName: 'Manga', kind: 'folder' });

    expect(await call('workflow:inspect-input', 'one')).toEqual({
      ok: true,
      value: { sessionId: 'session', kind: 'folder' },
    });
    expect(await call('workflow:inspect-input', 'one')).toMatchObject({
      ok: false,
      error: { code: 'selection_not_found' },
    });
    expect(inspect).toHaveBeenCalledTimes(1);

    expect(await call('workflow:release-input', 'session')).toEqual({ ok: true, value: undefined });
    expect(release).toHaveBeenCalledExactlyOnceWith('session');
  });

  it('chooses a library to share, and keeps it by an id', async () => {
    const context = register({ lastPickerFolder: '/earlier' });
    electron.showOpenDialog.mockResolvedValueOnce({ canceled: false, filePaths: [folder] });

    const chosen = (await call('workflow:choose-library')) as {
      value: { libraryId: string; displayPath: string };
    };

    expect(chosen.value.displayPath).toBe(folder);
    expect(context.selectedLibraries.get(chosen.value.libraryId)).toBe(folder);
    expect(electron.showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        buttonLabel: 'Use this folder',
        properties: ['openDirectory', 'createDirectory'],
        defaultPath: '/earlier',
      }),
    );

    electron.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    expect(await call('workflow:choose-library')).toEqual({ ok: true, value: null });
    expect(context.selectedLibraries.size).toBe(1);
  });
});
