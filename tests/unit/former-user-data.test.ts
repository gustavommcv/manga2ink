import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { moveFormerUserData } from '@/main/former-user-data';

const made: string[] = [];

afterEach(async () => {
  await Promise.all(made.splice(0).map((folder) => rm(folder, { recursive: true, force: true })));
});

async function appData(): Promise<string> {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'manga2ink-former-test-'));
  made.push(folder);
  return folder;
}

describe('moveFormerUserData', () => {
  it('moves Mangabound’s settings folder whole to Manga2Ink’s, the first time', async () => {
    const root = await appData();
    await mkdir(path.join(root, 'Mangabound', 'logs'), { recursive: true });
    await writeFile(path.join(root, 'Mangabound', 'settings.json'), '{"kept":true}');

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'))).toBeUndefined();

    expect(await readdir(root)).toEqual(['Manga2Ink']);
    expect((await readdir(path.join(root, 'Manga2Ink'))).sort()).toEqual(['logs', 'settings.json']);
    expect(await readFile(path.join(root, 'Manga2Ink', 'settings.json'), 'utf8')).toBe(
      '{"kept":true}',
    );
  });

  it('leaves both alone when Manga2Ink’s folder is there already', async () => {
    const root = await appData();
    await mkdir(path.join(root, 'Mangabound'));
    await mkdir(path.join(root, 'Manga2Ink'));

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'))).toBeUndefined();

    expect((await readdir(root)).sort()).toEqual(['Manga2Ink', 'Mangabound']);
  });

  it('does nothing when there is no former folder', async () => {
    const root = await appData();

    expect(moveFormerUserData(root, path.join(root, 'Manga2Ink'))).toBeUndefined();

    expect(await readdir(root)).toEqual([]);
  });

  it('never fills a settings folder chosen elsewhere, a test’s for one, with a person’s', async () => {
    const root = await appData();
    await mkdir(path.join(root, 'Mangabound'));
    const chosen = path.join(root, 'elsewhere', 'profile');

    expect(moveFormerUserData(root, chosen)).toBeUndefined();

    expect(await readdir(root)).toEqual(['Mangabound']);
  });

  it('says what went wrong, and lets the app start, when the folder cannot be moved', () => {
    const root = path.resolve('app-data');
    const problem = moveFormerUserData(root, path.join(root, 'Manga2Ink'), {
      exists: (target) => target === path.join(root, 'Mangabound'),
      rename: () => {
        throw new Error('in use');
      },
    });

    expect(problem).toBe(
      `Could not move ${path.join(root, 'Mangabound')} to ${path.join(root, 'Manga2Ink')}: in use`,
    );
  });
});
