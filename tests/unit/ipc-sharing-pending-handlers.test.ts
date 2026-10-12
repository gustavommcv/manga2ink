import type { IpcMainInvokeEvent } from 'electron';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LibraryIndexError } from '@/library/manifest';
import { opdsPort } from '@/main/constants';
import { registerOpdsHandlers } from '@/main/ipc/opds';
import { registerPendingHandlers } from '@/main/ipc/pending';
import { PendingRunActivity } from '@/main/pending-run-activity';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const electron = vi.hoisted(() => ({
  listeners: new Map<string, Listener>(),
  showSaveDialog: vi.fn(),
  showOpenDialog: vi.fn(),
  getPath: vi.fn(() => '/documents'),
}));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      electron.listeners.set(channel, listener);
    },
  },
  dialog: { showSaveDialog: electron.showSaveDialog, showOpenDialog: electron.showOpenDialog },
  app: { getPath: electron.getPath },
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
  electron.showSaveDialog.mockReset();
  electron.showOpenDialog.mockReset();
  vi.restoreAllMocks();
});

describe('sharing the books on the network', () => {
  const start = {
    libraryId: 'lib',
    interfaceAddress: '192.168.1.10',
    auth: { username: '', password: '' },
  };
  const handle = (stop = vi.fn().mockResolvedValue(undefined)) => ({
    url: 'http://192.168.1.10:48123/',
    interfaceAddress: '192.168.1.10',
    port: opdsPort,
    stop,
  });

  function register(overrides: Record<string, unknown> = {}) {
    const context = {
      selectedLibraries: new Map([['lib', '/books/Shelf']]),
      activeSharing: undefined as ReturnType<typeof handle> | undefined,
      activeSharingTarget: undefined as unknown,
      pendingRunActivity: new PendingRunActivity(),
      pendingCatalog: { read: vi.fn().mockResolvedValue({ books: [] }) },
      opdsServer: { start: vi.fn().mockResolvedValue(handle()) },
      networkInterfaces: {
        list: vi.fn().mockReturnValue([{ name: 'Ethernet', address: '192.168.1.10' }]),
        canShareOn: vi.fn().mockReturnValue(true),
      },
      pendingRuns: { root: '/pending' },
      ...overrides,
    };
    registerOpdsHandlers(context as never);
    return context;
  }

  it('lists the addresses it can be shared on', async () => {
    register();

    expect(await call('opds:list-network-interfaces')).toEqual({
      ok: true,
      value: [{ name: 'Ethernet', address: '192.168.1.10' }],
    });
  });

  it('starts on the address asked for and says where, with the folder it serves named after it', async () => {
    const context = register();

    const result = await call('opds:start-sharing', start);

    expect(result).toEqual({
      ok: true,
      value: {
        active: true,
        url: 'http://192.168.1.10:48123/',
        interfaceAddress: '192.168.1.10',
        port: opdsPort,
      },
    });
    expect(context.opdsServer.start).toHaveBeenCalledExactlyOnceWith({
      libraryPath: '/books/Shelf',
      libraryTitle: 'Shelf',
      interfaceAddress: '192.168.1.10',
      port: opdsPort,
      auth: { username: '', password: '' },
    });
    expect(context.activeSharingTarget).toMatchObject({ path: '/books/Shelf', readyBooks: false });
    expect(await call('opds:get-status')).toMatchObject({ ok: true, value: { active: true } });
  });

  it('shares every ready book when asked for a pending conversion', async () => {
    const context = register({
      selectedLibraries: new Map([['lib', path.join('/pending', 'run-1')]]),
    });

    await call('opds:start-sharing', start);

    expect(context.opdsServer.start).toHaveBeenCalledWith(
      expect.objectContaining({ libraryPath: '/pending', libraryTitle: 'Mangabound ready books' }),
    );
    expect(context.activeSharingTarget).toMatchObject({ readyBooks: true });
  });

  it('refuses an address that is not on the device, and a library that is not known', async () => {
    const context = register();
    context.networkInterfaces.canShareOn.mockReturnValue(false);

    expect(await call('opds:start-sharing', start)).toMatchObject({
      ok: false,
      error: { code: 'sharing_address_unavailable' },
    });
    expect(await call('opds:start-sharing', { ...start, libraryId: 'nobody' })).toMatchObject({
      ok: false,
      error: { code: 'library_not_found' },
    });
    expect(context.opdsServer.start).not.toHaveBeenCalled();
    expect(context.activeSharingTarget).toBeUndefined();
  });

  it('waits for a deletion that is in the way, of the library or, for ready books, of any', async () => {
    const own = register();
    own.pendingRunActivity.beginDelete('lib');
    expect(await call('opds:start-sharing', start)).toMatchObject({
      ok: false,
      error: { code: 'pending_in_use' },
    });

    electron.listeners.clear();
    const ready = register({
      selectedLibraries: new Map([['lib', path.join('/pending', 'run-1')]]),
    });
    ready.pendingRunActivity.beginDelete('another-run');
    expect(await call('opds:start-sharing', start)).toMatchObject({
      ok: false,
      error: { code: 'pending_in_use' },
    });
    // A deletion of another folder is not in the way of a share of this one.
    electron.listeners.clear();
    const other = register();
    other.pendingRunActivity.beginDelete('another-run');
    expect(await call('opds:start-sharing', start)).toMatchObject({ ok: true });
  });

  it('shares one thing at a time', async () => {
    const context = register();
    await call('opds:start-sharing', start);

    expect(await call('opds:start-sharing', start)).toMatchObject({
      ok: false,
      error: { code: 'sharing_already_active' },
    });
    expect(context.opdsServer.start).toHaveBeenCalledTimes(1);
  });

  it('does not start on a catalog that cannot be read, and frees the target', async () => {
    const context = register();
    context.pendingCatalog.read.mockRejectedValueOnce(
      new LibraryIndexError('malformed_json', 'bad json'),
    );

    expect(await call('opds:start-sharing', start)).toMatchObject({
      ok: false,
      error: {
        code: 'malformed_json',
        message: 'The output library catalog could not be read.',
      },
    });
    expect(context.activeSharingTarget).toBeUndefined();

    context.pendingCatalog.read.mockRejectedValueOnce(new Error('EIO'));
    expect(await call('opds:start-sharing', start)).toMatchObject({
      ok: false,
      error: { code: 'library_unreadable' },
    });
    expect(context.activeSharingTarget).toBeUndefined();
  });

  it('tells a port that is taken or an address that is gone, and frees the target', async () => {
    const context = register();
    context.opdsServer.start.mockRejectedValueOnce(
      Object.assign(new Error('listen'), { code: 'EADDRINUSE' }),
    );

    const taken = await call('opds:start-sharing', start);

    expect(taken).toMatchObject({ ok: false, error: { code: 'sharing_failed' } });
    expect((taken as { error: { message: string } }).error.message).toContain(String(opdsPort));
    expect(context.activeSharingTarget).toBeUndefined();

    context.opdsServer.start.mockRejectedValueOnce(
      Object.assign(new Error('listen'), { code: 'EADDRNOTAVAIL' }),
    );
    expect(await call('opds:start-sharing', start)).toMatchObject({
      ok: false,
      error: { code: 'sharing_failed' },
    });
  });

  it('frees the target for any other failure too, and reports it as a failure', async () => {
    const context = register();
    context.opdsServer.start.mockRejectedValueOnce(new Error('something else'));

    const result = await call('opds:start-sharing', start);

    expect(result.ok).toBe(false);
    expect(context.activeSharingTarget).toBeUndefined();
    expect(context.activeSharing).toBeUndefined();
  });

  it('stops what is shared, and says so when nothing is', async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    const context = register({ opdsServer: { start: vi.fn().mockResolvedValue(handle(stop)) } });

    expect(await call('opds:stop-sharing')).toMatchObject({
      ok: false,
      error: { code: 'sharing_not_active' },
    });
    await call('opds:start-sharing', start);
    expect(await call('opds:stop-sharing')).toEqual({ ok: true, value: undefined });
    expect(stop).toHaveBeenCalledTimes(1);
    expect(context.activeSharing).toBeUndefined();
    expect(context.activeSharingTarget).toBeUndefined();
    expect(await call('opds:get-status')).toEqual({ ok: true, value: { active: false } });
  });
});

describe('the books that are ready and not saved yet', () => {
  const book = (name: string, format = 'epub', savedPath?: string) => ({
    entry: { relativePath: name, format, bytes: 1000 },
    path: path.join('/pending', 'run-1', name),
    ...(savedPath === undefined ? {} : { savedPath }),
  });
  const run = (books = [book('One.epub'), book('Two.epub', 'epub', '/saved/Two.epub')]) => ({
    id: 'run-1',
    path: path.join('/pending', 'run-1'),
    createdAt: 1_700_000_000_000,
    books,
  });

  function register(overrides: Record<string, unknown> = {}) {
    const pendingRuns = {
      create: vi.fn().mockResolvedValue({ id: 'run-new', path: '/pending/run-new' }),
      list: vi.fn().mockResolvedValue([run()]),
      discard: vi.fn().mockResolvedValue(true),
      exportAndRecord: vi.fn().mockResolvedValue({ status: 'saved' }),
    };
    const context = {
      pendingRuns,
      selectedLibraries: new Map<string, string>(),
      pendingArtifacts: new Map<string, { runId: string; relativePath: string }>(),
      artifactPaths: new Map<string, string>(),
      lastPickerFolder: undefined,
      lastSaveFolder: '/books',
      preferences: undefined,
      currentPreferences: {},
      preferredNetworkInterface: undefined,
      activeSharingTarget: undefined as { readyBooks: boolean } | undefined,
      activeJobs: new Map<string, AbortController>(),
      pendingRunActivity: new PendingRunActivity(),
      ...overrides,
    };
    registerPendingHandlers(context as never);
    return context;
  }
  const idOf = (context: ReturnType<typeof register>, name: string): string =>
    [...context.pendingArtifacts].find(([, ref]) => ref.relativePath === name)![0];

  it('makes a place for a run, and says what is left of the earlier ones without their paths', async () => {
    const context = register();

    expect(await call('pending:create')).toEqual({ ok: true, value: 'run-new' });
    expect(context.selectedLibraries.get('run-new')).toBe('/pending/run-new');

    const listed = (await call('pending:list')) as {
      value: { libraryId: string; artifacts: { id: string; name: string; saved: boolean }[] }[];
    };
    expect(listed.value[0]?.libraryId).toBe('run-1');
    expect(listed.value[0]?.artifacts.map((artifact) => [artifact.name, artifact.saved])).toEqual([
      ['One.epub', false],
      ['Two.epub', true],
    ]);
    expect(JSON.stringify(listed)).not.toContain('/pending');
    // A book keeps the id it was given, and what it stands for is where it can be opened from.
    const again = (await call('pending:list')) as typeof listed;
    expect(again.value[0]?.artifacts.map((artifact) => artifact.id)).toEqual(
      listed.value[0]?.artifacts.map((artifact) => artifact.id),
    );
    expect(context.artifactPaths.get(idOf(context, 'Two.epub'))).toBe('/saved/Two.epub');
    expect(context.artifactPaths.get(idOf(context, 'One.epub'))).toBe(
      path.join('/pending', 'run-1', 'One.epub'),
    );
  });

  it('says plainly when the pending books cannot be read, and that nothing was deleted', async () => {
    const context = register();
    context.pendingRuns.list.mockRejectedValue(new Error('EACCES'));

    const result = await call('pending:list');

    expect(result).toMatchObject({ ok: false, error: { code: 'pending_unreadable' } });
    expect((result as { error: { message: string } }).error.message).toContain('were not deleted');
  });

  it('deletes a run and forgets its books, unless sharing or a conversion is in the way', async () => {
    const context = register();
    await call('pending:list');
    expect(context.pendingArtifacts.size).toBe(2);

    context.activeSharingTarget = { readyBooks: true };
    expect(await call('pending:discard', 'run-1')).toMatchObject({
      ok: false,
      error: { code: 'pending_in_use' },
    });
    context.activeSharingTarget = undefined;
    context.activeJobs.set('job', new AbortController());
    expect(await call('pending:discard', 'run-1')).toMatchObject({
      ok: false,
      error: { code: 'pending_in_use' },
    });
    context.activeJobs.clear();
    const release = context.pendingRunActivity.beginExport('run-1');
    expect(await call('pending:discard', 'run-1')).toMatchObject({
      ok: false,
      error: { code: 'pending_in_use' },
    });
    release?.();

    expect(await call('pending:discard', 'run-1')).toEqual({ ok: true, value: undefined });
    expect(context.pendingArtifacts.size).toBe(0);
    expect(context.artifactPaths.size).toBe(0);
    expect(context.selectedLibraries.has('run-1')).toBe(false);
    // And it can be deleted again: the activity was released.
    context.pendingRuns.discard.mockResolvedValue(false);
    expect(await call('pending:discard', 'run-1')).toMatchObject({
      ok: false,
      error: { code: 'pending_not_found' },
    });
    context.pendingRuns.discard.mockRejectedValue(new Error('EBUSY'));
    expect(await call('pending:discard', 'run-1')).toMatchObject({
      ok: false,
      error: { code: 'pending_delete_failed' },
    });
  });

  it('saves a book where it is told, only with the extension of its own format', async () => {
    const context = register();
    await call('pending:list');
    const id = idOf(context, 'One.epub');
    electron.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: '/books/One.epub' });

    expect(await call('pending:save-as', id)).toEqual({ ok: true, value: { saved: true } });

    expect(context.pendingRuns.exportAndRecord).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'run-1' }),
      expect.objectContaining({ path: path.join('/pending', 'run-1', 'One.epub') }),
      '/books/One.epub',
      true,
    );
    expect(context.artifactPaths.get(id)).toBe('/books/One.epub');
    expect(electron.showSaveDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: path.join('/books', 'One.epub'),
        filters: [{ name: 'EPUB', extensions: ['epub'] }],
      }),
    );

    electron.showSaveDialog.mockResolvedValueOnce({ canceled: false, filePath: '/books/One.pdf' });
    expect(await call('pending:save-as', id)).toMatchObject({
      ok: false,
      error: { code: 'save_failed', message: 'Choose a .epub file for this book.' },
    });
    electron.showSaveDialog.mockResolvedValueOnce({ canceled: true, filePath: '' });
    expect(await call('pending:save-as', id)).toEqual({ ok: true, value: { saved: false } });
  });

  it('says what could not be finished after the copy, and that the pending book is safe', async () => {
    const context = register();
    await call('pending:list');
    const id = idOf(context, 'One.epub');
    electron.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/books/One.epub' });

    context.pendingRuns.exportAndRecord.mockResolvedValueOnce({
      status: 'catalog_failed',
      cause: new Error('catalog'),
    });
    const catalog = (await call('pending:save-as', id)) as { value: { warning: string } };
    expect(catalog.value.warning).toContain('destination catalog could not be updated');

    context.pendingRuns.exportAndRecord.mockResolvedValueOnce({
      status: 'record_failed',
      cause: new Error('record'),
    });
    const record = (await call('pending:save-as', id)) as { value: { warning: string } };
    expect(record.value.warning).toContain('could not remember that it was saved');
  });

  it('keeps the books of other runs when one is deleted, and opens the dialog in Documents with no folder kept', async () => {
    const context = register({ lastSaveFolder: undefined });
    await call('pending:list');
    context.pendingArtifacts.set('other-book', { runId: 'run-2', relativePath: 'Other.epub' });
    context.artifactPaths.set('other-book', '/pending/run-2/Other.epub');

    await call('pending:discard', 'run-1');

    expect([...context.pendingArtifacts.keys()]).toEqual(['other-book']);
    expect([...context.artifactPaths.keys()]).toEqual(['other-book']);

    await call('pending:list');
    const id = idOf(context, 'One.epub');
    electron.showSaveDialog.mockResolvedValueOnce({ canceled: true, filePath: '' });
    await call('pending:save-as', id);
    expect(electron.showSaveDialog).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: path.join('/documents', 'One.epub') }),
    );
    electron.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });
    await call('pending:save-all', [id]);
    expect(electron.showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: '/documents' }),
    );
  });

  it('cannot save a book once the place the pending books are kept is gone', async () => {
    const context = register();
    await call('pending:list');
    const id = idOf(context, 'One.epub');
    context.pendingRuns = undefined as never;

    expect(await call('pending:save-as', id)).toMatchObject({
      ok: false,
      error: { code: 'save_failed', message: 'This pending book is no longer available.' },
    });
  });

  it('refuses a book it never gave an id for, and one of a run that is being deleted', async () => {
    const context = register();
    await call('pending:list');

    expect(await call('pending:save-as', 'unknown')).toMatchObject({
      ok: false,
      error: { code: 'save_failed' },
    });
    const release = context.pendingRunActivity.beginDelete('run-1');
    expect(await call('pending:save-as', idOf(context, 'One.epub'))).toMatchObject({
      ok: false,
      error: { code: 'save_failed', message: 'This pending book is being deleted.' },
    });
    release?.();
    // A book whose run is gone from storage is not there to save.
    context.pendingRuns.list.mockResolvedValue([]);
    expect(await call('pending:save-as', idOf(context, 'One.epub'))).toMatchObject({
      ok: false,
      error: { message: 'This pending book is no longer available.' },
    });
  });

  it('saves every book to a folder, a copy of a name that is taken, and says which did not', async () => {
    const context = register({
      pendingRuns: undefined,
    });
    context.pendingRuns = {
      create: vi.fn(),
      list: vi
        .fn()
        .mockResolvedValue([run([book('One.epub'), book('Two.epub'), book('Three.epub')])]),
      discard: vi.fn(),
      exportAndRecord: vi
        .fn()
        .mockRejectedValueOnce(Object.assign(new Error('exists'), { code: 'EEXIST' }))
        .mockResolvedValueOnce({ status: 'saved' })
        .mockRejectedValueOnce(Object.assign(new Error('full'), { code: 'ENOSPC' }))
        .mockResolvedValueOnce({ status: 'catalog_failed', cause: new Error('catalog') }),
    };
    await call('pending:list');
    const ids = ['One.epub', 'Two.epub', 'Three.epub'].map((name) => idOf(context, name));
    electron.showOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/books/Shelf'] });

    const result = (await call('pending:save-all', ids)) as {
      value: { savedIds: string[]; failures: { id: string; message: string }[] };
    };

    // One.epub found its name taken and went on to "(2)"; Two.epub's disk was full; Three's copy
    // was made and its catalog was not, which is said and does not undo the save.
    expect(result.value.savedIds).toEqual([ids[0], ids[2]]);
    expect(result.value.failures.map((failure) => failure.id)).toEqual([ids[1], ids[2]]);
    expect(result.value.failures[0]?.message).toContain('destination is full');
    expect(context.lastSaveFolder).toBe(path.dirname(path.join('/books/Shelf', 'One.epub')));
    const destinations = (
      context.pendingRuns as unknown as {
        exportAndRecord: { mock: { calls: unknown[][] } };
      }
    ).exportAndRecord.mock.calls.map((callArguments) => callArguments[2]);
    expect(destinations[0]).toBe(path.join('/books/Shelf', 'One.epub'));
    expect(destinations[1]).toBe(path.join('/books/Shelf', 'One (2).epub'));
  });

  it('saves nothing when the folder was not chosen, and refuses a selection of two runs', async () => {
    const context = register();
    await call('pending:list');
    const ids = [idOf(context, 'One.epub')];
    electron.showOpenDialog.mockResolvedValueOnce({ canceled: true, filePaths: [] });

    expect(await call('pending:save-all', ids)).toEqual({ ok: true, value: null });
    expect(context.pendingRuns.exportAndRecord).not.toHaveBeenCalled();

    context.pendingArtifacts.set('elsewhere', { runId: 'run-2', relativePath: 'X.epub' });
    expect((await call('pending:save-all', [ids[0], 'elsewhere'])).ok).toBe(false);
    expect((await call('pending:save-all', [ids[0], ids[0]])).ok).toBe(false);
    const release = context.pendingRunActivity.beginDelete('run-1');
    expect(await call('pending:save-all', ids)).toMatchObject({
      ok: false,
      error: { message: 'This pending book is being deleted.' },
    });
    release?.();
  });

  it('cannot create, list or discard without a place to keep them', async () => {
    register({ pendingRuns: undefined });

    expect((await call('pending:create')).ok).toBe(false);
    expect((await call('pending:list')).ok).toBe(false);
    expect((await call('pending:discard', 'run-1')).ok).toBe(false);
  });
});
