import { mkdir, mkdtemp, rm, type stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { classifyInputPaths, maxInputsPerAdd } from '@/adapters/input/classify-input-paths';
import { message } from '@/domain/message';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function fakeStats(kind: 'directory' | 'file') {
  return { isDirectory: () => kind === 'directory', isFile: () => kind === 'file' };
}

/** A stand-in for fs.stat that answers with the given result, typed as the real thing. */
const fakeStat = (implementation: (target: string) => Promise<unknown>): { stat: typeof stat } => ({
  stat: implementation as unknown as typeof stat,
});

describe('classifying input paths', () => {
  it('reads the real disk by default: folders and .cbz files are accepted, anything else is not', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'mangabound-classify-'));
    temporaryDirectories.push(root);
    const folder = path.join(root, 'Chainsaw Man');
    const cbz = path.join(root, 'Vagabond.CBZ');
    const notes = path.join(root, 'notes.txt');
    await mkdir(folder);
    await writeFile(cbz, 'x');
    await writeFile(notes, 'x');

    const result = await classifyInputPaths([folder, cbz, notes, path.join(root, 'gone.cbz')]);

    expect(result.accepted).toEqual([
      { path: folder, kind: 'folder' },
      { path: cbz, kind: 'cbz' },
    ]);
    expect(result.rejected).toEqual([
      { name: 'notes.txt', reason: message('input.onlyFoldersAndCbz', {}) },
      { name: 'gone.cbz', reason: message('input.unreadable', {}) },
    ]);
  });

  it('refuses a directory-looking file name that is really a file, and a .cbz that is a folder', async () => {
    const result = await classifyInputPaths(
      ['/a/Series.cbz', '/a/plain'],
      fakeStat((target) =>
        Promise.resolve(fakeStats(target.endsWith('.cbz') ? 'directory' : 'file')),
      ),
    );

    // A folder is a folder whatever it is called; a file without the extension is not a book.
    expect(result.accepted).toEqual([{ path: '/a/Series.cbz', kind: 'folder' }]);
    expect(result.rejected).toEqual([
      { name: 'plain', reason: message('input.onlyFoldersAndCbz', {}) },
    ]);
  });

  it('names an item that has no last step by its path, and one that has no path by nothing', async () => {
    const result = await classifyInputPaths(
      [path.parse(process.cwd()).root, ''],
      fakeStat(() => Promise.reject(new Error('unreadable'))),
    );

    expect(result.rejected).toEqual([
      { name: path.parse(process.cwd()).root, reason: message('input.unreadable', {}) },
      { reason: message('input.unreadable', {}) },
    ]);
  });

  it('adds only the first hundred at once and says how many were left out', async () => {
    const paths = Array.from({ length: maxInputsPerAdd + 3 }, (_, index) => `/m/${String(index)}`);

    const result = await classifyInputPaths(
      paths,
      fakeStat(() => Promise.resolve(fakeStats('directory'))),
    );

    expect(result.accepted).toHaveLength(maxInputsPerAdd);
    // What was past the limit names no item.
    expect(result.rejected).toEqual([
      { reason: message('input.overLimit', { left: 3, limit: maxInputsPerAdd }) },
    ]);
  });
});
