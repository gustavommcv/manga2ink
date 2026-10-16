import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  FsAppSettingsStore,
  type FsAppSettingsStoreDeps,
} from '@/adapters/settings/fs-app-settings-store';
import { appSettingsFileVersion } from '@/adapters/settings/stored-app-settings';
import { SettingsSaveError } from '@/application/ports/settings-store';
import { defaultAppSettings } from '@/domain/app-settings';

const settingsFile = path.join('data', 'app-settings.json');

function errno(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(code), { code });
}

/** Files that are in memory, so what was written and when can be looked at. */
function memoryDeps(initial?: string): {
  readonly deps: Partial<FsAppSettingsStoreDeps>;
  readonly files: Map<string, string>;
  readonly calls: string[];
} {
  const files = new Map<string, string>();
  if (initial !== undefined) files.set(settingsFile, initial);
  const calls: string[] = [];
  let suffix = 0;
  return {
    files,
    calls,
    deps: {
      createTempSuffix: () => `t${String(++suffix)}`,
      mkdir: (directory: string) => {
        calls.push(`mkdir ${directory}`);
        return Promise.resolve(undefined);
      },
      readFile: (file: string) => {
        const text = files.get(file);
        return text === undefined ? Promise.reject(errno('ENOENT')) : Promise.resolve(text);
      },
      writeFile: (file: string, text: string) => {
        calls.push(`write ${file}`);
        files.set(file, text);
        return Promise.resolve();
      },
      rename: (from: string, to: string) => {
        calls.push(`rename ${from} ${to}`);
        files.set(to, files.get(from) ?? '');
        files.delete(from);
        return Promise.resolve();
      },
      rm: (file: string) => {
        calls.push(`rm ${file}`);
        files.delete(file);
        return Promise.resolve();
      },
    },
  };
}

describe('loading the file of the app settings', () => {
  it('follows the system, and complains of nothing, when there is no file yet', async () => {
    const { deps } = memoryDeps();

    expect(await new FsAppSettingsStore(settingsFile, deps).load()).toEqual({
      settings: defaultAppSettings,
      unreadable: false,
    });
  });

  it('gives what the file holds', async () => {
    const { deps } = memoryDeps(
      JSON.stringify({ version: appSettingsFileVersion, language: 'pt-BR' }),
    );

    expect(await new FsAppSettingsStore(settingsFile, deps).load()).toEqual({
      settings: { language: 'pt-BR' },
      unreadable: false,
    });
  });

  it.each([
    ['is not JSON', 'not json'],
    ['is from a version this build does not know', JSON.stringify({ version: 99 })],
  ])('gives the defaults, and says so, when the file %s', async (_name, text) => {
    const { deps } = memoryDeps(text);

    expect(await new FsAppSettingsStore(settingsFile, deps).load()).toEqual({
      settings: defaultAppSettings,
      unreadable: true,
    });
  });

  it('gives the defaults, and says so, when the file is there but cannot be read', async () => {
    const store = new FsAppSettingsStore(settingsFile, {
      readFile: () => Promise.reject(errno('EACCES')),
    });

    expect(await store.load()).toEqual({ settings: defaultAppSettings, unreadable: true });
  });
});

describe('saving the file of the app settings', () => {
  it('writes beside the file and renames over it, so it is never half written', async () => {
    const { deps, files, calls } = memoryDeps();

    await new FsAppSettingsStore(settingsFile, deps).save({ language: 'pt-BR' });

    expect(calls).toEqual([
      `mkdir ${path.dirname(settingsFile)}`,
      `write ${settingsFile}.t1.tmp`,
      `rename ${settingsFile}.t1.tmp ${settingsFile}`,
    ]);
    expect(files.has(`${settingsFile}.t1.tmp`)).toBe(false);
    expect(await new FsAppSettingsStore(settingsFile, deps).load()).toEqual({
      settings: { language: 'pt-BR' },
      unreadable: false,
    });
  });

  it('writes one save after another, so the last one asked for is the one kept', async () => {
    const { deps, files } = memoryDeps();
    const store = new FsAppSettingsStore(settingsFile, deps);

    void store.save({ language: 'en' });
    void store.save({ language: 'pt-BR' });
    await store.settled();

    expect(JSON.parse(files.get(settingsFile) ?? '{}')).toEqual({
      version: appSettingsFileVersion,
      language: 'pt-BR',
    });
  });

  it('says it could not save, and leaves what was saved before, when the write fails', async () => {
    const { deps, files } = memoryDeps(
      JSON.stringify({ version: appSettingsFileVersion, language: 'en' }),
    );
    const store = new FsAppSettingsStore(settingsFile, {
      ...deps,
      writeFile: () => Promise.reject(errno('ENOSPC')),
    });

    await expect(store.save({ language: 'pt-BR' })).rejects.toBeInstanceOf(SettingsSaveError);
    expect(JSON.parse(files.get(settingsFile) ?? '{}')).toMatchObject({ language: 'en' });
  });

  it('goes on with the next save after one that failed, and settles either way', async () => {
    const { deps, files } = memoryDeps();
    let failing = true;
    const store = new FsAppSettingsStore(settingsFile, {
      ...deps,
      mkdir: (directory, options) => {
        if (failing) return Promise.reject(errno('EACCES'));
        return deps.mkdir?.(directory, options) ?? Promise.resolve(undefined);
      },
    });

    const failed = store.save({ language: 'en' });
    await expect(failed).rejects.toBeInstanceOf(SettingsSaveError);
    failing = false;
    await store.save({ language: 'pt-BR' });
    await store.settled();

    expect(JSON.parse(files.get(settingsFile) ?? '{}')).toMatchObject({ language: 'pt-BR' });
  });
});

describe('the file of the app settings on a real disk', () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'mangabound-app-settings-'));
  });
  afterEach(() => rm(directory, { recursive: true, force: true }));

  it('is made, with its folder, by the first save and read back by the next launch', async () => {
    const file = path.join(directory, 'not-yet', 'app-settings.json');

    await new FsAppSettingsStore(file).save({ language: 'pt-BR' });

    expect(JSON.parse(await readFile(file, 'utf8'))).toEqual({
      version: appSettingsFileVersion,
      language: 'pt-BR',
    });
    expect(await readdir(path.dirname(file))).toEqual(['app-settings.json']);
    expect(await new FsAppSettingsStore(file).load()).toEqual({
      settings: { language: 'pt-BR' },
      unreadable: false,
    });
  });
});
