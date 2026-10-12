import type { IpcMainInvokeEvent } from 'electron';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { defaultPreferences } from '@/domain/preferences';
import { registerArtifactHandlers } from '@/main/ipc/artifacts';
import { registerMetadataHandlers } from '@/main/ipc/metadata';
import { registerSettingsHandlers } from '@/main/ipc/settings';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const electron = vi.hoisted(() => ({
  listeners: new Map<string, Listener>(),
  openPath: vi.fn<(target: string) => Promise<string>>(),
  showItemInFolder: vi.fn<(target: string) => void>(),
  openExternal: vi.fn<(target: string) => Promise<void>>(),
}));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      electron.listeners.set(channel, listener);
    },
  },
  shell: {
    openPath: electron.openPath,
    showItemInFolder: electron.showItemInFolder,
    openExternal: electron.openExternal,
  },
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
  electron.openPath.mockReset();
  electron.showItemInFolder.mockReset();
  electron.openExternal.mockReset();
  vi.restoreAllMocks();
});

describe('opening a saved book', () => {
  let directory: string;
  let file: string;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'mangabound-artifact-handlers-'));
    file = path.join(directory, 'Manga - Vol.01.epub');
    await writeFile(file, 'book');
  });
  afterEach(() => rm(directory, { recursive: true, force: true }));

  it('hands the system only a file the app gave an id for', async () => {
    electron.openPath.mockResolvedValue('');
    registerArtifactHandlers({ artifactPaths: new Map([['book', file]]) });

    expect(await call('artifact:open', 'book')).toEqual({ ok: true, value: undefined });
    expect(electron.openPath).toHaveBeenCalledExactlyOnceWith(file);

    // An id the app never gave, a folder and a file that is gone are never handed on.
    registerArtifactHandlers({
      artifactPaths: new Map([
        ['folder', directory],
        ['moved', path.join(directory, 'gone.epub')],
      ]),
    });
    for (const id of ['not-given', 'folder', 'moved']) {
      expect(await call('artifact:open', id)).toMatchObject({
        ok: false,
        error: { code: 'artifact_not_found' },
      });
    }
    expect(electron.openPath).toHaveBeenCalledTimes(1);
  });

  it('says so when the system could not open the book', async () => {
    electron.openPath.mockResolvedValue('No application is associated with it.');
    registerArtifactHandlers({ artifactPaths: new Map([['book', file]]) });

    expect((await call('artifact:open', 'book')).ok).toBe(false);
  });

  it('shows the book in its folder, by the same rule', async () => {
    registerArtifactHandlers({ artifactPaths: new Map([['book', file]]) });

    expect(await call('artifact:show-in-folder', 'book')).toEqual({ ok: true, value: undefined });
    expect(electron.showItemInFolder).toHaveBeenCalledExactlyOnceWith(file);
    expect(await call('artifact:show-in-folder', 'unknown')).toMatchObject({ ok: false });
    expect(electron.showItemInFolder).toHaveBeenCalledTimes(1);
  });
});

describe('the online sources', () => {
  const provider = (homepage: string) => ({
    descriptor: { id: 'source', displayName: 'Source', homepage, description: 'A source' },
    search: vi.fn().mockResolvedValue([{ id: 'work', provider: 'source', title: 'Work' }]),
    suggestVolumes: vi.fn().mockResolvedValue({ volumes: [] }),
  });
  const register = (homepage = 'https://source.example/') => {
    const source = provider(homepage);
    const context = {
      metadataProviders: new Map([['source', source]]),
      activeJobs: new Map<string, AbortController>(),
    };
    registerMetadataHandlers(context);
    return { source, context };
  };

  it('lists what is offered', async () => {
    const { source } = register();

    expect(await call('workflow:list-metadata-providers')).toEqual({
      ok: true,
      value: [source.descriptor],
    });
  });

  it('opens a source’s own address, and only when it is https', async () => {
    register();
    expect(await call('workflow:open-provider-homepage', { providerId: 'source' })).toEqual({
      ok: true,
      value: undefined,
    });
    expect(electron.openExternal).toHaveBeenCalledExactlyOnceWith('https://source.example/');

    electron.listeners.clear();
    electron.openExternal.mockReset();
    register('http://source.example/');
    expect(await call('workflow:open-provider-homepage', { providerId: 'source' })).toMatchObject({
      ok: false,
      error: { code: 'invalid_homepage' },
    });
    expect(await call('workflow:open-provider-homepage', { providerId: 'nobody' })).toMatchObject({
      ok: false,
      error: { code: 'provider_not_found' },
    });
    expect(electron.openExternal).not.toHaveBeenCalled();
  });

  it('searches and suggests volumes once per job, and frees the job whatever came of it', async () => {
    const { source, context } = register();
    context.activeJobs.set('busy', new AbortController());

    expect(
      await call('workflow:search-metadata', {
        jobId: 'new',
        providerId: 'source',
        title: 'Work',
      }),
    ).toMatchObject({ ok: true, value: [{ id: 'work' }] });
    expect(source.search).toHaveBeenCalledExactlyOnceWith('Work', expect.any(AbortSignal));
    expect(
      await call('workflow:search-metadata', { jobId: 'busy', providerId: 'source', title: 'x' }),
    ).toMatchObject({ ok: false, error: { code: 'job_exists' } });
    expect(
      await call('workflow:search-metadata', { jobId: 'a', providerId: 'nobody', title: 'x' }),
    ).toMatchObject({ ok: false, error: { code: 'provider_not_found' } });

    expect(
      await call('workflow:suggest-volumes', {
        jobId: 'volumes',
        providerId: 'source',
        workId: 'work',
        language: 'pt-br',
      }),
    ).toEqual({ ok: true, value: { volumes: [] } });
    const aSignal: unknown = expect.any(AbortSignal);
    expect(source.suggestVolumes).toHaveBeenCalledExactlyOnceWith('work', {
      language: 'pt-br',
      signal: aSignal,
    });
    await call('workflow:suggest-volumes', {
      jobId: 'plain',
      providerId: 'source',
      workId: 'work',
    });
    expect(source.suggestVolumes).toHaveBeenLastCalledWith('work', { signal: aSignal });
    expect(
      await call('workflow:suggest-volumes', { jobId: 'busy', providerId: 'source', workId: 'w' }),
    ).toMatchObject({ ok: false, error: { code: 'job_exists' } });
    expect(
      await call('workflow:suggest-volumes', { jobId: 'b', providerId: 'nobody', workId: 'w' }),
    ).toMatchObject({ ok: false, error: { code: 'provider_not_found' } });
    expect([...context.activeJobs.keys()]).toEqual(['busy']);

    source.search.mockRejectedValueOnce(new Error('network'));
    expect(
      await call('workflow:search-metadata', { jobId: 'fail', providerId: 'source', title: 'x' }),
    ).toMatchObject({ ok: false });
    expect(context.activeJobs.has('fail')).toBe(false);
  });
});

describe('the settings kept between sessions', () => {
  const state = () => ({
    currentPreferences: defaultPreferences,
    lastSaveFolder: undefined as string | undefined,
    lastPickerFolder: undefined as string | undefined,
    preferredNetworkInterface: undefined as
      { readonly name: string; readonly address: string } | undefined,
  });

  it('loads what was kept, and remembers the folders and the network the window never holds', async () => {
    const context = state();
    const network = { name: 'Ethernet', address: '192.168.1.10' };
    const restore = vi.fn().mockResolvedValue({
      preferences: { ...defaultPreferences, format: 'pdf' },
      outputFolder: '/books',
      lastPickerFolder: '/downloads',
      preferredNetworkInterface: network,
      notices: ['One option was reset.'],
    });
    registerSettingsHandlers(context, { restore, save: vi.fn() } as never);

    const result = await call('settings:load');

    expect(result).toEqual({
      ok: true,
      value: {
        preferences: { ...defaultPreferences, format: 'pdf' },
        preferredNetworkInterface: network,
        notices: ['One option was reset.'],
      },
    });
    // The folders stay in the main process: the window is never told them.
    expect(JSON.stringify(result)).not.toContain('/books');
    expect(context.lastSaveFolder).toBe('/books');
    expect(context.lastPickerFolder).toBe('/downloads');
    expect(context.preferredNetworkInterface).toEqual(network);
  });

  it('loads defaults with no network when none was kept', async () => {
    const context = state();
    const restore = vi.fn().mockResolvedValue({
      preferences: defaultPreferences,
      outputFolder: undefined,
      lastPickerFolder: undefined,
      preferredNetworkInterface: undefined,
      notices: [],
    });
    registerSettingsHandlers(context, { restore, save: vi.fn() } as never);

    expect(await call('settings:load')).toEqual({
      ok: true,
      value: { preferences: defaultPreferences, notices: [] },
    });
  });

  it('writes what the window chose together with the folders it never holds', async () => {
    const context = state();
    context.lastSaveFolder = '/books';
    context.lastPickerFolder = '/downloads';
    const save = vi.fn().mockResolvedValue(undefined);
    registerSettingsHandlers(context, { restore: vi.fn(), save } as never);
    const preferences = { ...defaultPreferences, format: 'epub' as const };

    expect(await call('settings:save', { preferences })).toEqual({ ok: true, value: undefined });

    expect(save).toHaveBeenCalledExactlyOnceWith(preferences, '/books', '/downloads', undefined);
    expect(context.currentPreferences).toEqual(preferences);
  });

  it('says when they could not be written', async () => {
    const context = state();
    const save = vi.fn().mockRejectedValue(new Error('disk full'));
    registerSettingsHandlers(context, { restore: vi.fn(), save } as never);

    expect(await call('settings:save', { preferences: defaultPreferences })).toMatchObject({
      ok: false,
    });
  });
});
