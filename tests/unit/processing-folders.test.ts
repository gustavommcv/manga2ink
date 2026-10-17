import { mkdtemp, mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type DiskCalls,
  diskIoOver,
  pendingFolderName,
  ProcessingFolderError,
  ProcessingFolders,
  type ProcessingFoldersIo,
  scratchFolderName,
} from '@/adapters/library/processing-folders';
import { defaultProcessingChoice, type ProcessingChoice } from '@/domain/app-settings';

const defaults = {
  pending: path.resolve('data', 'pending'),
  scratch: path.resolve('system', 'tmp'),
};
const at = (...parts: string[]): string => path.resolve(...parts);

function foldersFor(
  choice: ProcessingChoice,
  io?: Partial<ProcessingFoldersIo>,
): { folders: ProcessingFolders; made: string[] } {
  const made: string[] = [];
  const fake: ProcessingFoldersIo = {
    isDirectory: () => Promise.resolve(true),
    makeDirectory: (folder) => {
      made.push(folder);
      return Promise.resolve();
    },
    probeWrite: () => Promise.resolve(),
    freeBytes: () => Promise.resolve(1000),
    drive: () => Promise.resolve(1),
    ...io,
  };
  return { folders: new ProcessingFolders(defaults, () => choice, fake), made };
}

describe('where the app works when no folder is chosen', () => {
  const { folders } = foldersFor(defaultProcessingChoice);

  it('is its own data folder for finished books and the system temporary folder for volumes', () => {
    expect(folders.chosen()).toBeNull();
    expect(folders.pendingRoot()).toBe(defaults.pending);
    expect(folders.scratchRoot()).toBe(defaults.scratch);
  });

  it('looks for books and for left-over volumes only there', () => {
    expect(folders.pendingRoots()).toEqual([defaults.pending]);
    expect(folders.scratchRoots()).toEqual([defaults.scratch]);
  });
});

describe('where the app works in a folder that was chosen', () => {
  const choice: ProcessingChoice = {
    folder: at('big'),
    earlier: [at('old', 'one'), at('old', 'two')],
  };
  const { folders } = foldersFor(choice);

  it('is Pending and Scratch inside it', () => {
    expect(folders.chosen()).toBe(at('big'));
    expect(folders.pendingRoot()).toBe(path.join(at('big'), pendingFolderName));
    expect(folders.scratchRoot()).toBe(path.join(at('big'), scratchFolderName));
  });

  it('looks for books in it first, then where the app kept them, then in the folders chosen before', () => {
    expect(folders.pendingRoots()).toEqual([
      path.join(at('big'), 'Pending'),
      defaults.pending,
      path.join(at('old', 'one'), 'Pending'),
      path.join(at('old', 'two'), 'Pending'),
    ]);
  });

  it('looks for left-over volumes in the same places', () => {
    expect(folders.scratchRoots()).toEqual([
      path.join(at('big'), 'Scratch'),
      defaults.scratch,
      path.join(at('old', 'one'), 'Scratch'),
      path.join(at('old', 'two'), 'Scratch'),
    ]);
  });

  it('lists a place once, though it is the choice and an earlier one at the same time', () => {
    const twice = foldersFor({ folder: null, earlier: [] }).folders;
    expect(new Set(twice.pendingRoots()).size).toBe(twice.pendingRoots().length);
  });

  it('is read each time, so a change is the next thing the app does', () => {
    let current: ProcessingChoice = defaultProcessingChoice;
    const live = new ProcessingFolders(
      defaults,
      () => current,
      foldersFor(current).folders['io' as never],
    );
    expect(live.pendingRoot()).toBe(defaults.pending);

    current = { folder: at('big'), earlier: [] };

    expect(live.pendingRoot()).toBe(path.join(at('big'), 'Pending'));
  });
});

describe('getting the places ready', () => {
  it('makes the app’s own folder for books, and says where they are, when no folder is chosen', async () => {
    const { folders, made } = foldersFor(defaultProcessingChoice);

    expect(await folders.prepare()).toEqual(defaults);
    expect(made).toEqual([defaults.pending, defaults.scratch]);
  });

  it('makes Pending and Scratch in a folder that was chosen', async () => {
    const { folders, made } = foldersFor({ folder: at('big'), earlier: [] });

    expect(await folders.prepare()).toEqual({
      pending: path.join(at('big'), 'Pending'),
      scratch: path.join(at('big'), 'Scratch'),
    });
    expect(made).toEqual([path.join(at('big'), 'Pending'), path.join(at('big'), 'Scratch')]);
  });

  it('refuses to make anything when the folder that was chosen is not there, and says which', async () => {
    const { folders, made } = foldersFor(
      { folder: at('gone'), earlier: [] },
      { isDirectory: () => Promise.resolve(false) },
    );

    const failure = await folders.prepare().catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ProcessingFolderError);
    expect(failure).toMatchObject({ reason: 'unavailable' });
    expect((failure as Error).message).toContain(at('gone'));
    expect(made).toEqual([]);
  });

  it('hands the pending folders to the runs as they are now', async () => {
    let current: ProcessingChoice = defaultProcessingChoice;
    const made: string[] = [];
    const folders = new ProcessingFolders(defaults, () => current, {
      isDirectory: () => Promise.resolve(true),
      makeDirectory: (folder) => {
        made.push(folder);
        return Promise.resolve();
      },
      probeWrite: () => Promise.resolve(),
      freeBytes: () => Promise.resolve(null),
      drive: () => Promise.resolve(null),
    });
    const roots = folders.asPendingRoots();

    expect(roots.current()).toBe(defaults.pending);
    current = { folder: at('big'), earlier: [] };
    expect(roots.current()).toBe(path.join(at('big'), 'Pending'));
    expect(roots.all()).toEqual([path.join(at('big'), 'Pending'), defaults.pending]);
    await roots.prepare();
    expect(made).toEqual([path.join(at('big'), 'Pending'), path.join(at('big'), 'Scratch')]);
  });
});

describe('checking a folder before it is chosen', () => {
  it('makes Pending and Scratch in it, and writes in the first to see that it can', async () => {
    const probeWrite = vi.fn<ProcessingFoldersIo['probeWrite']>(() => Promise.resolve());
    const { folders, made } = foldersFor(defaultProcessingChoice, { probeWrite });

    await folders.check(at('big'));

    expect(made).toEqual([path.join(at('big'), 'Pending'), path.join(at('big'), 'Scratch')]);
    expect(probeWrite).toHaveBeenCalledExactlyOnceWith(path.join(at('big'), 'Pending'));
  });

  it.each([
    ['a path that is not absolute', 'relative/folder'],
    ['a folder that is not there', at('missing')],
  ])('refuses %s', async (_name, folder) => {
    const { folders, made } = foldersFor(defaultProcessingChoice, {
      isDirectory: (candidate) => Promise.resolve(candidate !== at('missing')),
    });

    await expect(folders.check(folder)).rejects.toMatchObject({ reason: 'unusable' });
    expect(made).toEqual([]);
  });

  it.each([
    ['cannot make its folders', { makeDirectory: () => Promise.reject(new Error('EACCES')) }],
    ['cannot be written in', { probeWrite: () => Promise.reject(new Error('EROFS')) }],
  ])('refuses a folder the app %s, and keeps the cause', async (_name, io) => {
    const { folders } = foldersFor(defaultProcessingChoice, io);

    const failure = await folders.check(at('big')).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(ProcessingFolderError);
    expect(failure).toMatchObject({ reason: 'unusable' });
    expect((failure as Error).cause).toBeInstanceOf(Error);
  });
});

describe('whether the places are there', () => {
  it('has the app’s own places always, without asking the disk', async () => {
    const isDirectory = vi.fn<ProcessingFoldersIo['isDirectory']>(() => Promise.resolve(false));
    const { folders } = foldersFor(defaultProcessingChoice, { isDirectory });

    expect(await folders.available()).toBe(true);
    expect(isDirectory).not.toHaveBeenCalled();
  });

  it.each([[true], [false]])(
    'has a folder that was chosen only when it is there (%s)',
    async (there) => {
      const isDirectory = vi.fn<ProcessingFoldersIo['isDirectory']>(() => Promise.resolve(there));
      const { folders } = foldersFor({ folder: at('big'), earlier: [] }, { isDirectory });

      expect(await folders.available()).toBe(there);
      expect(isDirectory).toHaveBeenCalledExactlyOnceWith(at('big'));
    },
  );

  it('says whether another folder is there, such as one that was chosen before', async () => {
    const { folders } = foldersFor(defaultProcessingChoice, {
      isDirectory: (folder) => Promise.resolve(folder === at('old')),
    });

    expect(await folders.exists(at('old'))).toBe(true);
    expect(await folders.exists(at('unplugged'))).toBe(false);
  });
});

describe('what is left on the drive', () => {
  it('is what the drive of the books has', async () => {
    const freeBytes = vi.fn<ProcessingFoldersIo['freeBytes']>(() => Promise.resolve(1234));
    const { folders } = foldersFor({ folder: at('big'), earlier: [] }, { freeBytes });

    expect(await folders.freeBytes()).toBe(1234);
    expect(freeBytes).toHaveBeenCalledExactlyOnceWith(path.join(at('big'), 'Pending'));
  });
});

describe('on a real disk', () => {
  let directory: string;
  beforeEach(async () => {
    directory = await mkdtemp(path.join(os.tmpdir(), 'mangabound-processing-'));
  });
  afterEach(() => rm(directory, { recursive: true, force: true }));

  const real = (choice: ProcessingChoice): ProcessingFolders =>
    new ProcessingFolders(
      { pending: path.join(directory, 'default-pending'), scratch: path.join(directory, 'tmp') },
      () => choice,
    );

  it('checks a folder, makes its two folders and leaves nothing of the test write', async () => {
    const chosen = path.join(directory, 'chosen');
    await mkdir(chosen);

    await real(defaultProcessingChoice).check(chosen);

    expect((await readdir(chosen)).sort()).toEqual(['Pending', 'Scratch']);
    expect(await readdir(path.join(chosen, 'Pending'))).toEqual([]);
  });

  it('refuses a file, and a folder that is not there', async () => {
    const file = path.join(directory, 'a-file');
    await writeFile(file, 'x');

    await expect(real(defaultProcessingChoice).check(file)).rejects.toMatchObject({
      reason: 'unusable',
    });
    await expect(
      real(defaultProcessingChoice).check(path.join(directory, 'nowhere')),
    ).rejects.toMatchObject({ reason: 'unusable' });
  });

  it('prepares the places it works in, and refuses a chosen folder that has gone', async () => {
    const chosen = path.join(directory, 'drive');
    await mkdir(chosen);
    const folders = real({ folder: chosen, earlier: [] });

    await folders.prepare();
    expect((await stat(path.join(chosen, 'Scratch'))).isDirectory()).toBe(true);
    await rm(chosen, { recursive: true });

    await expect(folders.prepare()).rejects.toMatchObject({ reason: 'unavailable' });
    await expect(stat(chosen)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('says what is free on the drive, even when its folder is not made yet', async () => {
    const free = await real(defaultProcessingChoice).freeBytes();

    expect(free).toBeGreaterThan(0);
  });

  it('asks the nearest folder that is there, so a drive is known before its folder is made', async () => {
    const deep = new ProcessingFolders(
      { pending: path.join(directory, 'not', 'made', 'yet'), scratch: directory },
      () => defaultProcessingChoice,
    );

    expect(await deep.freeBytes()).toBeGreaterThan(0);
  });

  it('knows on a real disk that two folders of one folder are on one drive, though neither is made', async () => {
    const together = new ProcessingFolders(
      { pending: path.join(directory, 'p', 'x'), scratch: path.join(directory, 's', 'y') },
      () => defaultProcessingChoice,
    );

    const space = await together.workingSpace();

    expect(space.sameDrive).toBe(true);
    expect(space.pendingFreeBytes).toBeGreaterThan(0);
    expect(space.scratchFreeBytes).toBeGreaterThan(0);
  });

  it('says nothing when the drive does not answer, and not an error', async () => {
    // A file is not a folder: asking the space under it fails with ENOTDIR, then the folder above answers.
    const file = path.join(directory, 'a-file');
    await writeFile(file, 'x');
    const under = new ProcessingFolders(
      { pending: path.join(file, 'inside'), scratch: directory },
      () => defaultProcessingChoice,
    );

    expect(await under.freeBytes()).toBeGreaterThan(0);
  });
});

describe('what is left on the drives the app works on', () => {
  const choice: ProcessingChoice = { folder: at('big'), earlier: [] };

  it('is the room of each place, and that they are one drive when the drive of both is the same', async () => {
    const { folders } = foldersFor(choice, {
      freeBytes: (folder) => Promise.resolve(folder.endsWith('Pending') ? 700 : 900),
      drive: () => Promise.resolve(4),
    });

    expect(await folders.workingSpace()).toEqual({
      scratchFreeBytes: 900,
      pendingFreeBytes: 700,
      sameDrive: true,
    });
  });

  it('is two drives when the places are on different ones', async () => {
    const { folders } = foldersFor(defaultProcessingChoice, {
      drive: (folder) => Promise.resolve(folder === defaults.pending ? 1 : 2),
    });

    expect(await folders.workingSpace()).toMatchObject({ sameDrive: false });
  });

  it('does not say two drives are one when it cannot say which they are', async () => {
    const { folders } = foldersFor(choice, {
      freeBytes: () => Promise.resolve(null),
      drive: () => Promise.resolve(null),
    });

    expect(await folders.workingSpace()).toEqual({
      scratchFreeBytes: null,
      pendingFreeBytes: null,
      sameDrive: false,
    });
  });
});

describe('asking the disk', () => {
  const error = (code: string): NodeJS.ErrnoException => Object.assign(new Error(code), { code });
  const disk = (calls: Partial<DiskCalls>): ProcessingFoldersIo =>
    diskIoOver({
      stat: () => Promise.resolve({ isDirectory: () => true, dev: 7 }),
      statfs: () => Promise.resolve({ bavail: 10, bsize: 4096 }),
      mkdir: () => Promise.resolve(undefined),
      writeFile: () => Promise.resolve(),
      rm: () => Promise.resolve(),
      createId: () => 'id',
      ...calls,
    });

  it.each([['ENOENT'], ['ENOTDIR']])('takes %s for a folder that is not there', async (code) => {
    const io = disk({ stat: () => Promise.reject(error(code)) });

    expect(await io.isDirectory(at('gone'))).toBe(false);
  });

  it('does not take a file for a folder', async () => {
    const io = disk({ stat: () => Promise.resolve({ isDirectory: () => false, dev: 7 }) });

    expect(await io.isDirectory(at('file'))).toBe(false);
  });

  it('does not take a folder it cannot look at for one that is not there', async () => {
    const io = disk({ stat: () => Promise.reject(error('EACCES')) });

    await expect(io.isDirectory(at('guarded'))).rejects.toMatchObject({ code: 'EACCES' });
  });

  it('writes a file of its own name in the folder to see that it can, and takes it away', async () => {
    const calls: string[] = [];
    const io = disk({
      writeFile: (file) => {
        calls.push(`write ${file}`);
        return Promise.resolve();
      },
      rm: (file) => {
        calls.push(`rm ${file}`);
        return Promise.resolve();
      },
    });

    await io.probeWrite(at('big'));

    const probe = path.join(at('big'), '.mangabound-write-test-id');
    expect(calls).toEqual([`write ${probe}`, `rm ${probe}`]);
  });

  it('gives the bytes a person can write: the blocks that are free to them, times their size', async () => {
    const io = disk({ statfs: () => Promise.resolve({ bavail: 25, bsize: 4096 }) });

    expect(await io.freeBytes(at('big'))).toBe(25 * 4096);
  });

  it('asks the folder above when one is not there, up to one that is', async () => {
    const asked: string[] = [];
    const io = disk({
      statfs: (folder) => {
        asked.push(folder);
        return asked.length < 3
          ? Promise.reject(error('ENOENT'))
          : Promise.resolve({ bavail: 1, bsize: 100 });
      },
    });

    expect(await io.freeBytes(at('a', 'b', 'c'))).toBe(100);
    expect(asked).toEqual([at('a', 'b', 'c'), at('a', 'b'), at('a')]);
  });

  it('says nothing is known when no folder up to the root answers', async () => {
    const io = disk({ statfs: () => Promise.reject(error('ENOENT')) });

    expect(await io.freeBytes(at('a', 'b'))).toBeNull();
  });

  it('says nothing is known, and does not climb, when the disk fails in another way', async () => {
    const statfs = vi.fn<DiskCalls['statfs']>(() => Promise.reject(error('EIO')));
    const io = disk({ statfs });

    expect(await io.freeBytes(at('a', 'b'))).toBeNull();
    expect(statfs).toHaveBeenCalledTimes(1);
  });

  it('says which drive a folder is on by the nearest folder that is there', async () => {
    const stat = vi.fn<DiskCalls['stat']>((folder) =>
      folder === at('a')
        ? Promise.resolve({ isDirectory: () => true, dev: 42 })
        : Promise.reject(error('ENOENT')),
    );

    expect(await disk({ stat }).drive(at('a', 'b', 'c'))).toBe(42);
    expect(stat.mock.calls.map(([folder]) => folder)).toEqual([
      at('a', 'b', 'c'),
      at('a', 'b'),
      at('a'),
    ]);
  });

  it('says nothing is known of the drive when no folder up to the root is there, or the disk fails otherwise', async () => {
    expect(
      await disk({ stat: () => Promise.reject(error('ENOENT')) }).drive(at('a', 'b')),
    ).toBeNull();
    expect(
      await disk({ stat: () => Promise.reject(error('EACCES')) }).drive(at('a', 'b')),
    ).toBeNull();
  });

  it('makes a folder with those above it', async () => {
    const mkdir = vi.fn<DiskCalls['mkdir']>(() => Promise.resolve(undefined));

    await disk({ mkdir }).makeDirectory(at('a', 'b'));

    expect(mkdir).toHaveBeenCalledExactlyOnceWith(at('a', 'b'), { recursive: true });
  });
});
