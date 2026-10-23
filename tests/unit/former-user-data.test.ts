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

/** An app-data folder with Mangabound's settings in it. */
async function withFormer(): Promise<string> {
  const root = await appData();
  await mkdir(path.join(root, 'Mangabound', 'logs'), { recursive: true });
  await writeFile(path.join(root, 'Mangabound', 'settings.json'), '{"kept":true}');
  return root;
}

async function expectMoved(root: string): Promise<void> {
  expect(await readdir(root)).toEqual(['Manga2Ink']);
  expect((await readdir(path.join(root, 'Manga2Ink'))).sort()).toEqual(['logs', 'settings.json']);
  expect(await readFile(path.join(root, 'Manga2Ink', 'settings.json'), 'utf8')).toBe(
    '{"kept":true}',
  );
}

const settled = { kind: 'settled' };

describe('moveFormerUserData', () => {
  it('moves Mangabound’s settings folder whole to Manga2Ink’s, the first time', async () => {
    const root = await withFormer();

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'), 'linux')).toEqual(settled);

    await expectMoved(root);
  });

  it('moves it into the empty folder Electron makes when the app first asks for its path', async () => {
    const root = await withFormer();
    await mkdir(path.join(root, 'Manga2Ink'));

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'), 'win32')).toEqual(settled);

    await expectMoved(root);
  });

  it('leaves both alone when Manga2Ink’s folder has anything of its own in it', async () => {
    const root = await withFormer();
    await mkdir(path.join(root, 'Manga2Ink'));
    await writeFile(path.join(root, 'Manga2Ink', 'settings.json'), '{"own":true}');

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'), 'linux')).toEqual(settled);

    expect((await readdir(root)).sort()).toEqual(['Manga2Ink', 'Mangabound']);
    expect(await readFile(path.join(root, 'Manga2Ink', 'settings.json'), 'utf8')).toBe(
      '{"own":true}',
    );
  });

  it('leaves both alone when Manga2Ink’s settings place is not a folder it can read', async () => {
    const root = await withFormer();
    await writeFile(path.join(root, 'Manga2Ink'), 'not a folder');

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'), 'linux')).toEqual(settled);

    expect((await readdir(root)).sort()).toEqual(['Manga2Ink', 'Mangabound']);
  });

  it('does nothing when there is no former folder', async () => {
    const root = await appData();

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'), 'linux')).toEqual(settled);

    expect(await readdir(root)).toEqual([]);
  });

  it('never fills a settings folder chosen elsewhere, a test’s for one, with a person’s', async () => {
    const root = await withFormer();
    const chosen = path.join(root, 'elsewhere', 'profile');

    expect(moveFormerUserData(root, chosen, 'linux')).toEqual(settled);

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
      expect(moveFormerUserData(root, path.join(root, name), 'win32', fileSystem)).toEqual(settled);
    }
    expect(renames).toEqual([]);
  });

  describe('with Mangabound still open', () => {
    const open = (root: string, touched: string[]): FormerUserDataFileSystem => ({
      ...diskFileSystem,
      held: (file) => file === path.join(root, 'Mangabound', 'lockfile'),
      removeEmptyFolder: (folder) => {
        touched.push(`remove ${folder}`);
      },
      rename: (from) => {
        touched.push(`rename ${from}`);
      },
    });

    it('on Windows, where it holds its folder, waits and leaves the empty new folder empty', async () => {
      const root = await withFormer();
      await mkdir(path.join(root, 'Manga2Ink'));
      const touched: string[] = [];

      expect(
        moveFormerUserData(root, path.join(root, 'Manga2Ink'), 'win32', open(root, touched)),
      ).toEqual({ kind: 'former-open' });

      expect(touched).toEqual([]);
      expect(await readdir(path.join(root, 'Manga2Ink'))).toEqual([]);
    });

    it('elsewhere, where a folder in use can still be renamed, moves it', async () => {
      const root = await withFormer();
      await mkdir(path.join(root, 'Manga2Ink'));
      const touched: string[] = [];

      expect(
        moveFormerUserData(root, path.join(root, 'Manga2Ink'), 'darwin', open(root, touched)),
      ).toEqual(settled);

      expect(touched).toEqual([
        `remove ${path.join(root, 'Manga2Ink')}`,
        `rename ${path.join(root, 'Mangabound')}`,
      ]);
    });
  });

  describe('when the folder cannot be moved', () => {
    const failing = (thrown: unknown): FormerUserDataFileSystem => ({
      ...diskFileSystem,
      rename: () => {
        throw thrown;
      },
    });

    it('says what went wrong for the log, and puts back the empty folder Electron made', async () => {
      const root = await withFormer();
      await mkdir(path.join(root, 'Manga2Ink'));

      expect(
        moveFormerUserData(
          root,
          path.join(root, 'Manga2Ink'),
          'win32',
          failing(new Error('denied')),
        ),
      ).toEqual({
        kind: 'failed',
        problem: `Could not move ${path.join(root, 'Mangabound')} to ${path.join(root, 'Manga2Ink')}: denied`,
      });

      expect((await readdir(root)).sort()).toEqual(['Manga2Ink', 'Mangabound']);
      expect(await readdir(path.join(root, 'Manga2Ink'))).toEqual([]);
    });

    it('says what went wrong when the failure is not an error', async () => {
      const root = await withFormer();

      expect(
        moveFormerUserData(root, path.join(root, 'Manga2Ink'), 'linux', failing('busy')),
      ).toEqual({
        kind: 'failed',
        problem: `Could not move ${path.join(root, 'Mangabound')} to ${path.join(root, 'Manga2Ink')}: busy`,
      });
    });

    it('tells the move’s failure even when the empty folder cannot be put back', async () => {
      const root = await withFormer();

      const move = moveFormerUserData(root, path.join(root, 'Manga2Ink'), 'linux', {
        ...failing(new Error('denied')),
        makeFolder: () => {
          throw new Error('no room');
        },
      });

      expect(move).toEqual({
        kind: 'failed',
        problem: `Could not move ${path.join(root, 'Mangabound')} to ${path.join(root, 'Manga2Ink')}: denied`,
      });
    });
  });

  describe('on disk', () => {
    it('sees a file nobody holds, and one that is not there, as free', async () => {
      const root = await appData();
      await writeFile(path.join(root, 'lockfile'), '');

      expect(diskFileSystem.held(path.join(root, 'lockfile'))).toBe(false);
      expect(diskFileSystem.held(path.join(root, 'absent'))).toBe(false);
    });
  });
});
