import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FsWindowStateStore,
  type FsWindowStateStoreDeps,
} from '@/adapters/settings/fs-window-state-store';

const state = { width: 900, height: 600, x: 20, y: 30, maximized: false };
const file = path.join(path.sep, 'data', 'window-state.json');

const enoent = Object.assign(new Error('no such file'), { code: 'ENOENT' });

describe('reading the file of the window', () => {
  it('gives what the file holds', async () => {
    const readFile = vi.fn(() =>
      Promise.resolve(JSON.stringify({ version: 1, width: 900, height: 600, maximized: true })),
    );

    const loaded = await new FsWindowStateStore(file, { readFile }).load();

    expect(loaded).toEqual({ width: 900, height: 600, maximized: true });
    expect(readFile).toHaveBeenCalledExactlyOnceWith(file, 'utf8');
  });

  it.each([
    ['there is no file', enoent],
    ['the file cannot be read', Object.assign(new Error('denied'), { code: 'EACCES' })],
  ])('gives nothing, and no error, when %s', async (_what, failure) => {
    const store = new FsWindowStateStore(file, { readFile: () => Promise.reject(failure) });

    expect(await store.load()).toBeUndefined();
  });

  it('gives nothing when what is in the file cannot be used', async () => {
    const store = new FsWindowStateStore(file, { readFile: () => Promise.resolve('{ broken') });

    expect(await store.load()).toBeUndefined();
  });
});

describe('writing the file of the window', () => {
  const deps = (): FsWindowStateStoreDeps & { written: string[]; steps: string[] } => {
    const written: string[] = [];
    const steps: string[] = [];
    return {
      written,
      steps,
      readFile: () => Promise.reject(enoent),
      mkdir: (folder) => {
        steps.push(`mkdir ${folder}`);
        return Promise.resolve(undefined);
      },
      writeFile: (target, contents) => {
        steps.push(`write ${target}`);
        written.push(contents);
        return Promise.resolve();
      },
      rename: (from, to) => {
        steps.push(`rename ${from} ${to}`);
        return Promise.resolve();
      },
      rm: () => Promise.resolve(),
      createTempSuffix: () => 'x',
    };
  };

  it('makes the folder, writes beside the file, and renames over it', async () => {
    const io = deps();

    await new FsWindowStateStore(file, io).save(state);

    expect(io.steps).toEqual([
      `mkdir ${path.dirname(file)}`,
      `write ${file}.x.tmp`,
      `rename ${file}.x.tmp ${file}`,
    ]);
    expect(JSON.parse(io.written[0] ?? '')).toEqual({ version: 1, ...state });
  });

  it('says it when it cannot write, for whoever asked to keep the window to tell', async () => {
    const io = { ...deps(), mkdir: () => Promise.reject(new Error('read-only')) };

    await expect(new FsWindowStateStore(file, io).save(state)).rejects.toThrow('read-only');
  });
});

describe('on a real disk', () => {
  const folders: string[] = [];
  afterEach(async () => {
    await Promise.all(folders.splice(0).map((folder) => rm(folder, { recursive: true })));
  });

  it('keeps what it is given in a folder that is not there yet, and gives it back, and leaves nothing else', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'manga2ink-window-state-'));
    folders.push(root);
    const where = path.join(root, 'not', 'there', 'window-state.json');
    const store = new FsWindowStateStore(where);

    await store.save(state);

    expect(await store.load()).toEqual(state);
    expect(JSON.parse(await readFile(where, 'utf8'))).toMatchObject({ version: 1, width: 900 });
    expect(await readdir(path.dirname(where))).toEqual(['window-state.json']);
  });
});
