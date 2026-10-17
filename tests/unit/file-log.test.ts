import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { type DiskLogCalls, diskLogIoOver, FileLog, type FileLogIo } from '@/adapters/log/file-log';

const when = new Date('2026-10-16T21:04:05.123Z');

/** A disk in memory that says what was done to it, with the sizes of what is in it. */
function memoryDisk(): {
  readonly io: FileLogIo;
  readonly files: Map<string, string>;
  readonly calls: string[];
} {
  const files = new Map<string, string>();
  const calls: string[] = [];
  return {
    files,
    calls,
    io: {
      makeDirectory: (directory) => {
        calls.push(`mkdir ${directory}`);
        return Promise.resolve();
      },
      append: (file, text) => {
        files.set(file, (files.get(file) ?? '') + text);
        return Promise.resolve();
      },
      size: (file) => Promise.resolve(Buffer.byteLength(files.get(file) ?? '', 'utf8')),
      move: (from, to) => {
        calls.push(`move ${path.basename(from)} ${path.basename(to)}`);
        const text = files.get(from);
        if (text !== undefined) {
          files.set(to, text);
          files.delete(from);
        }
        return Promise.resolve();
      },
      remove: (file) => {
        calls.push(`remove ${path.basename(file)}`);
        files.delete(file);
        return Promise.resolve();
      },
    },
  };
}

const directory = path.join('data', 'logs');
const at = (name: string): string => path.join(directory, name);

describe('a line of the log', () => {
  it('is the time, the level in capitals, and the text, on a line of its own', async () => {
    const { io, files } = memoryDisk();
    const log = new FileLog({ directory, io });

    log.write('error', 'Something went wrong.', when);
    log.write('warn', 'Look at this.', when);
    log.write('info', 'Started.', when);
    await log.settled();

    expect(files.get(at('mangabound.log'))).toBe(
      [
        '2026-10-16T21:04:05.123Z ERROR Something went wrong.',
        '2026-10-16T21:04:05.123Z WARN Look at this.',
        '2026-10-16T21:04:05.123Z INFO Started.',
        '',
      ].join('\n'),
    );
  });

  it('takes the time of the call when it is not given one', async () => {
    const { io, files } = memoryDisk();
    const log = new FileLog({ directory, io });

    log.write('info', 'Now.');
    await log.settled();

    expect(files.get(at('mangabound.log'))).toMatch(/^\d{4}-\d\d-\d\dT[\d:.]+Z INFO Now\.\n$/u);
  });

  it('keeps the lines it is given in the order they were asked for', async () => {
    const { io, files } = memoryDisk();
    const log = new FileLog({ directory, io });

    for (const word of ['one', 'two', 'three', 'four']) log.write('info', word, when);
    await log.settled();

    expect(
      (files.get(at('mangabound.log')) ?? '')
        .trim()
        .split('\n')
        .map((line) => line.split(' ').at(-1)),
    ).toEqual(['one', 'two', 'three', 'four']);
  });

  it('makes its folder before it writes, and says which folder it is', async () => {
    const { io, calls } = memoryDisk();
    const log = new FileLog({ directory, io });

    log.write('info', 'First.', when);
    await log.settled();

    expect(calls[0]).toBe(`mkdir ${directory}`);
    expect(log.directory).toBe(directory);
  });

  it('can make its folder on its own, so that it can be opened before anything is written', async () => {
    const { io, calls } = memoryDisk();

    expect(await new FileLog({ directory, io }).ensureFolder()).toBe(directory);

    expect(calls).toEqual([`mkdir ${directory}`]);
  });
});

describe('the files of the log', () => {
  it('start over when a line would take the file past its size, and keep the last ones', async () => {
    const { io, files, calls } = memoryDisk();
    const log = new FileLog({ directory, io, maxBytes: 130, files: 3 });
    const line = (n: number): string => `${String(n)}`.padEnd(30, 'x');

    // A line is 61 bytes with its date and level, so two fit in 130 and the third starts a file over.
    for (let n = 1; n <= 7; n += 1) log.write('info', line(n), when);
    await log.settled();

    expect([...files.keys()].map((file) => path.basename(file)).sort()).toEqual([
      'mangabound.log',
      'mangabound.log.1',
      'mangabound.log.2',
    ]);
    expect(files.get(at('mangabound.log'))).toContain(line(7));
    expect(files.get(at('mangabound.log.1'))).toContain(line(5));
    expect(files.get(at('mangabound.log.2'))).toContain(line(3));
    // The oldest goes before the others take its place, and each moves up one.
    expect(calls.filter((call) => call !== `mkdir ${directory}`).slice(0, 3)).toEqual([
      'remove mangabound.log.2',
      'move mangabound.log.1 mangabound.log.2',
      'move mangabound.log mangabound.log.1',
    ]);
  });

  it('never keep more files than they are told to, even when it is one', async () => {
    const { io, files } = memoryDisk();
    const log = new FileLog({ directory, io, maxBytes: 60, files: 1 });

    for (let n = 1; n <= 4; n += 1) log.write('info', `line ${String(n)} ${'y'.repeat(40)}`, when);
    await log.settled();

    expect([...files.keys()].map((file) => path.basename(file))).toEqual(['mangabound.log']);
    expect(files.get(at('mangabound.log'))).toContain('line 4');
    expect(files.get(at('mangabound.log'))).not.toContain('line 3');
  });

  it('are at least one, whatever it is asked', async () => {
    const { io, files } = memoryDisk();
    const log = new FileLog({ directory, io, maxBytes: 10, files: 0 });

    log.write('info', 'a line that is longer than the size', when);
    log.write('info', 'and another one', when);
    await log.settled();

    expect([...files.keys()]).toHaveLength(1);
    expect(files.get(at('mangabound.log'))).toContain('and another one');
  });

  it('take a line longer than the size into an empty file instead of starting an empty one over', async () => {
    const { io, files, calls } = memoryDisk();
    const log = new FileLog({ directory, io, maxBytes: 20 });

    log.write('info', 'z'.repeat(200), when);
    await log.settled();

    expect(files.get(at('mangabound.log'))).toContain('z'.repeat(200));
    expect(calls.filter((call) => call.startsWith('remove') || call.startsWith('move'))).toEqual(
      [],
    );
  });

  it('measure a line in bytes, not in letters', async () => {
    const { io, files } = memoryDisk();
    const log = new FileLog({ directory, io, maxBytes: 72 });

    log.write('info', 'ação', when);
    log.write('info', 'ação', when);
    await log.settled();

    // A line is 35 letters and 37 bytes: two are 70 letters, which fit in 72, and 74 bytes, which do not.
    expect(files.has(at('mangabound.log.1'))).toBe(true);
  });
});

describe('a log that cannot be written', () => {
  it('says so to whoever is listening, and goes on with the next line', async () => {
    const { io, files } = memoryDisk();
    let failing = true;
    const onFailure = vi.fn();
    const log = new FileLog({
      directory,
      onFailure,
      io: {
        ...io,
        append: (file, text) =>
          failing ? Promise.reject(new Error('disk full')) : io.append(file, text),
      },
    });

    log.write('error', 'lost', when);
    await log.settled();
    failing = false;
    log.write('error', 'kept', when);
    await log.settled();

    expect(onFailure).toHaveBeenCalledExactlyOnceWith(
      'The log could not be written.',
      expect.objectContaining({ message: 'disk full' }),
    );
    expect(files.get(at('mangabound.log'))).toContain('kept');
    expect(files.get(at('mangabound.log'))).not.toContain('lost');
  });

  it('does not stop the app when nobody is listening', async () => {
    const { io } = memoryDisk();
    const log = new FileLog({
      directory,
      io: { ...io, makeDirectory: () => Promise.reject(new Error('read-only')) },
    });

    log.write('error', 'lost', when);

    await expect(log.settled()).resolves.toBeUndefined();
  });
});

describe('the log on a real disk', () => {
  let root: string;
  afterEach(() => rm(root, { recursive: true, force: true }));

  it('is made with its folder, added to, and started over, leaving only the files it keeps', async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'mangabound-log-'));
    const folder = path.join(root, 'not', 'there', 'yet');
    const log = new FileLog({ directory: folder, maxBytes: 200, files: 2 });

    for (let n = 1; n <= 12; n += 1) log.write('warn', `line ${String(n)} ${'w'.repeat(40)}`, when);
    await log.settled();

    expect((await readdir(folder)).sort()).toEqual(['mangabound.log', 'mangabound.log.1']);
    expect(await readFile(path.join(folder, 'mangabound.log'), 'utf8')).toContain('line 12');
    for (const name of ['mangabound.log', 'mangabound.log.1']) {
      expect((await readFile(path.join(folder, name), 'utf8')).length).toBeLessThanOrEqual(200);
    }
  });

  it('starts over when the first file is not there to move, as after someone removed one', async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'mangabound-log-'));
    const log = new FileLog({ directory: root, maxBytes: 80, files: 3 });

    for (let n = 1; n <= 6; n += 1) log.write('info', `line ${String(n)} ${'v'.repeat(30)}`, when);
    await log.settled();
    await rm(path.join(root, 'mangabound.log.1'), { force: true });
    for (let n = 7; n <= 9; n += 1) log.write('info', `line ${String(n)} ${'v'.repeat(30)}`, when);
    await log.settled();

    expect(await readFile(path.join(root, 'mangabound.log'), 'utf8')).toContain('line 9');
  });
});

describe('asking the disk', () => {
  const error = (code: string): NodeJS.ErrnoException => Object.assign(new Error(code), { code });
  const disk = (calls: Partial<DiskLogCalls>): FileLogIo =>
    diskLogIoOver({
      mkdir: () => Promise.resolve(undefined),
      appendFile: () => Promise.resolve(),
      stat: () => Promise.resolve({ size: 7 }),
      rename: () => Promise.resolve(),
      rm: () => Promise.resolve(),
      ...calls,
    });

  it('gives the size of a file, and none for a file that is not there', async () => {
    expect(await disk({}).size('a')).toBe(7);
    expect(await disk({ stat: () => Promise.reject(error('ENOENT')) }).size('a')).toBe(0);
  });

  it('does not take a file it cannot look at for one that is not there', async () => {
    await expect(
      disk({ stat: () => Promise.reject(error('EACCES')) }).size('a'),
    ).rejects.toMatchObject({
      code: 'EACCES',
    });
  });

  it('moves a file, and lets one that is not there be', async () => {
    const rename = vi.fn<DiskLogCalls['rename']>(() => Promise.resolve());
    await disk({ rename }).move('a', 'b');
    expect(rename).toHaveBeenCalledExactlyOnceWith('a', 'b');

    await expect(
      disk({ rename: () => Promise.reject(error('ENOENT')) }).move('a', 'b'),
    ).resolves.toBeUndefined();
    await expect(
      disk({ rename: () => Promise.reject(error('EBUSY')) }).move('a', 'b'),
    ).rejects.toMatchObject({ code: 'EBUSY' });
  });

  it('makes a folder with those above it, adds in UTF-8, and removes without complaint', async () => {
    const mkdir = vi.fn<DiskLogCalls['mkdir']>(() => Promise.resolve(undefined));
    const appendFile = vi.fn<DiskLogCalls['appendFile']>(() => Promise.resolve());
    const rm = vi.fn<DiskLogCalls['rm']>(() => Promise.resolve());
    const io = disk({ mkdir, appendFile, rm });

    await io.makeDirectory('d');
    await io.append('f', 'text');
    await io.remove('f');

    expect(mkdir).toHaveBeenCalledExactlyOnceWith('d', { recursive: true });
    expect(appendFile).toHaveBeenCalledExactlyOnceWith('f', 'text', 'utf8');
    expect(rm).toHaveBeenCalledExactlyOnceWith('f', { force: true });
  });
});
