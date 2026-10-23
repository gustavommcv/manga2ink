import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  diskFileSystem,
  type FormerUserDataFileSystem,
  moveFormerUserData,
} from '@/main/former-user-data';

const made: string[] = [];

afterEach(async () => {
  await Promise.all(made.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function appData(): Promise<string> {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'manga2ink-former-test-'));
  made.push(folder);
  return folder;
}

/** An app-data folder with what Mangabound kept, its settings and logs beside Electron's caches. */
async function withFormer(): Promise<string> {
  const root = await appData();
  const former = path.join(root, 'Mangabound');
  await mkdir(path.join(former, 'logs'), { recursive: true });
  await mkdir(path.join(former, 'GPUCache'));
  await writeFile(path.join(former, 'logs', 'mangabound.log'), 'kept log');
  await writeFile(path.join(former, 'app-settings.json'), '{"theme":"dark"}');
  await writeFile(path.join(former, 'settings.json'), '{"kept":true}');
  await writeFile(path.join(former, 'window-state.json'), '{"width":900}');
  await writeFile(path.join(former, 'Local State'), 'Mangabound’s');
  return root;
}

const read = (root: string, ...names: string[]): Promise<string> =>
  readFile(path.join(root, ...names), 'utf8');
const names = async (folder: string): Promise<string[]> => (await readdir(folder)).sort();

async function expectSettingsMoved(root: string): Promise<void> {
  expect(await read(root, 'Manga2Ink', 'app-settings.json')).toBe('{"theme":"dark"}');
  expect(await read(root, 'Manga2Ink', 'settings.json')).toBe('{"kept":true}');
  expect(await read(root, 'Manga2Ink', 'window-state.json')).toBe('{"width":900}');
}

describe('moveFormerUserData', () => {
  it('moves Mangabound’s settings and logs to Manga2Ink’s folder, and leaves Electron’s things', async () => {
    const root = await withFormer();

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'))).toEqual([]);

    await expectSettingsMoved(root);
    expect(await read(root, 'Manga2Ink', 'logs', 'mangabound.log')).toBe('kept log');
    expect(await names(path.join(root, 'Mangabound'))).toEqual(['GPUCache', 'Local State']);
  });

  it('moves them beside what Electron and the installer’s own runs left in the new folder', async () => {
    const root = await withFormer();
    const fresh = path.join(root, 'Manga2Ink');
    await mkdir(path.join(fresh, 'GPUPersistentCache'), { recursive: true });
    await mkdir(path.join(fresh, 'logs'));
    await writeFile(path.join(fresh, 'Local State'), 'Manga2Ink’s');

    expect(moveFormerUserData(root, fresh)).toEqual([]);

    await expectSettingsMoved(root);
    expect(await read(root, 'Manga2Ink', 'logs', 'mangabound.log')).toBe('kept log');
    expect(await read(root, 'Manga2Ink', 'Local State')).toBe('Manga2Ink’s');
  });

  it('keeps what the new folder already has, unless it is an empty folder', async () => {
    const root = await withFormer();
    const fresh = path.join(root, 'Manga2Ink');
    await mkdir(path.join(fresh, 'logs'), { recursive: true });
    await writeFile(path.join(fresh, 'logs', 'manga2ink.log'), 'new log');

    expect(moveFormerUserData(root, fresh)).toEqual([]);

    await expectSettingsMoved(root);
    expect(await names(path.join(fresh, 'logs'))).toEqual(['manga2ink.log']);
    expect(await read(root, 'Mangabound', 'logs', 'mangabound.log')).toBe('kept log');
  });

  it('moves the pending books and covers kept in the settings folder on macOS', async () => {
    const root = await appData();
    await mkdir(path.join(root, 'Mangabound', 'Pending', 'run-1'), { recursive: true });
    await mkdir(path.join(root, 'Mangabound', 'Covers'));

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'))).toEqual([]);

    expect(await names(path.join(root, 'Manga2Ink'))).toEqual(['Covers', 'Pending']);
    expect(await names(path.join(root, 'Manga2Ink', 'Pending'))).toEqual(['run-1']);
  });

  it('leaves everything once Manga2Ink has settings of its own', async () => {
    const root = await withFormer();
    await mkdir(path.join(root, 'Manga2Ink'));
    await writeFile(path.join(root, 'Manga2Ink', 'window-state.json'), '{"width":1200}');

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'))).toEqual([]);

    expect(await names(path.join(root, 'Manga2Ink'))).toEqual(['window-state.json']);
    expect(await read(root, 'Mangabound', 'settings.json')).toBe('{"kept":true}');
  });

  it('does nothing when there is no former folder', async () => {
    const root = await appData();

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'))).toEqual([]);

    expect(await readdir(root)).toEqual([]);
  });

  it('never fills a settings folder chosen elsewhere, a test’s for one, with a person’s', async () => {
    const root = await withFormer();

    expect(moveFormerUserData(root, path.join(root, 'elsewhere', 'profile'))).toEqual([]);

    expect(await readdir(root)).toEqual(['Mangabound']);
  });

  it('does not move a folder onto itself, whatever the case of its name', () => {
    const root = path.resolve('app-data');
    const renames: string[] = [];
    const fileSystem: FormerUserDataFileSystem = {
      ...diskFileSystem,
      exists: () => true,
      rename: (from) => {
        renames.push(from);
      },
    };

    for (const name of ['Mangabound', 'MANGABOUND']) {
      expect(moveFormerUserData(root, path.join(root, name), fileSystem)).toEqual([]);
    }
    expect(renames).toEqual([]);
  });

  describe('when an entry cannot be moved', () => {
    it('says which, for the log, and still moves the others', async () => {
      const root = await withFormer();
      const fresh = path.join(root, 'Manga2Ink');
      const held = path.join(root, 'Mangabound', 'logs');

      const problems = moveFormerUserData(root, fresh, {
        ...diskFileSystem,
        rename: (from, to) => {
          if (from === held) throw new Error('in use');
          diskFileSystem.rename(from, to);
        },
      });

      expect(problems).toEqual([`Could not move ${held} to ${path.join(fresh, 'logs')}: in use`]);
      await expectSettingsMoved(root);
      expect(await read(root, 'Mangabound', 'logs', 'mangabound.log')).toBe('kept log');
    });

    it('says what went wrong when the failure is not an error', async () => {
      const root = await appData();
      await mkdir(path.join(root, 'Mangabound'));
      await writeFile(path.join(root, 'Mangabound', 'settings.json'), '{}');

      const problems = moveFormerUserData(root, path.join(root, 'Manga2Ink'), {
        ...diskFileSystem,
        rename: () => {
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw 'busy';
        },
      });

      expect(problems).toEqual([
        `Could not move ${path.join(root, 'Mangabound', 'settings.json')} to ${path.join(root, 'Manga2Ink', 'settings.json')}: busy`,
      ]);
    });

    it('leaves a new entry it cannot read as a folder', async () => {
      const root = await withFormer();
      const fresh = path.join(root, 'Manga2Ink');
      await mkdir(fresh);
      await writeFile(path.join(fresh, 'logs'), 'a file where the logs go');

      expect(moveFormerUserData(root, fresh)).toEqual([]);

      expect(await read(root, 'Manga2Ink', 'logs')).toBe('a file where the logs go');
      await expectSettingsMoved(root);
    });
  });
});
