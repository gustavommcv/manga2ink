import type { IpcMainInvokeEvent } from 'electron';
import { mkdir, mkdtemp, rm, utimes, writeFile, type stat as nodeStat } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { removeStaleScratch } from '@/adapters/fs/stale-scratch';
import { classifyInputPaths, maxInputsPerAdd } from '@/adapters/input/classify-input-paths';
import { moveLegacyStorage, type LegacyStorageFileSystem } from '@/adapters/library/legacy-storage';
import { buildMangabindArguments } from '@/adapters/mangabind/arguments';
import { MangapressEventDecoder, parseMangapressEventLine } from '@/adapters/mangapress/protocol';
import { isLibraryRelativePath } from '@/library/manifest';
import { fromTheMainFrame } from '@/main/ipc/handle';
import { isOwnHost } from '@/opds/host';

type StatFunction = typeof nodeStat;
// The handler module takes `ipcMain` from Electron; this test only reads a function of it, and must
// not need the Electron binary to be there (a runner without it fails on the import alone).
vi.mock('electron', () => ({ ipcMain: { handle: vi.fn() } }));

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});

describe('the path a catalog entry names', () => {
  it.each([
    'a.epub',
    'Shelf/a.epub',
    'a b/c.cbz',
    'ünï/ç.epub',
    '..a/b.epub',
    'a../b.epub',
    // A colon is a legal part of a name on the systems that are not Windows, and titles have them.
    'Shelf/Re:Zero.epub',
    'Fate: Zero - Vol.01.epub',
  ])('is one the app could have written: %s', (value) => {
    expect(isLibraryRelativePath(value)).toBe(true);
  });

  it.each([
    '',
    'a\\b.epub',
    'a\0b.epub',
    '/etc/passwd',
    'C:/Users/a.epub',
    'c:relative.epub',
    'a//b.epub',
    './a.epub',
    'a/./b.epub',
    '../a.epub',
    'a/../b.epub',
    'a/',
  ])('is not one it could have written: %j', (value) => {
    expect(isLibraryRelativePath(value)).toBe(false);
  });
});

describe('the name a request says it was sent to', () => {
  const own = ['this-computer', 'this-computer.local'];

  it.each([
    ['127.0.0.1:48123', true],
    ['[::1]:48123', true],
    ['[::1]', true],
    ['[fe80::1]:80', true],
    ['localhost', true],
    ['LOCALHOST:80', true],
    ['localhost.', true],
    ['This-Computer:48123', true],
    ['this-computer.local.', true],
    ['  localhost  ', true],
  ])('is this computer when it is %j', (header, expected) => {
    expect(isOwnHost(header, own)).toBe(expected);
  });

  it.each([
    '',
    '.',
    ':80',
    '[::1',
    '[::1]x',
    '[::1]:abc',
    'localhost:abc',
    'evil.example',
    'evil.example:80',
    'localhost.evil.example',
    'this-computer.evil.example',
  ])('is not this computer when it is %j', (header) => {
    expect(isOwnHost(header, own)).toBe(false);
  });

  it('is a request that names no host at all, which a browser never sends', () => {
    expect(isOwnHost(undefined, own)).toBe(true);
  });
});

describe('where a request comes from', () => {
  const eventOf = (senderFrame: unknown, mainFrame: unknown): IpcMainInvokeEvent =>
    ({ senderFrame, sender: { mainFrame } }) as unknown as IpcMainInvokeEvent;

  it('is the page when it is the main frame of the window, and nothing else is', () => {
    const main = { id: 1 };
    expect(fromTheMainFrame(eventOf(main, main))).toBe(true);
    expect(fromTheMainFrame(eventOf({ id: 2 }, main))).toBe(false);
  });

  it('is nobody when the frame was closed on the way, even if the window has lost its frame too', () => {
    expect(fromTheMainFrame(eventOf(null, { id: 1 }))).toBe(false);
    expect(fromTheMainFrame(eventOf(null, null))).toBe(false);
  });
});

describe('moving what an earlier version kept in another folder', () => {
  const fileSystem = () => {
    const exists = vi.fn<(target: string) => Promise<boolean>>().mockResolvedValue(true);
    const steps = {
      exists,
      makeDirectory: vi.fn<(target: string) => Promise<void>>().mockResolvedValue(undefined),
      listNames: vi.fn<(directory: string) => Promise<readonly string[]>>().mockResolvedValue([]),
      rename: vi.fn<(from: string, to: string) => Promise<void>>().mockResolvedValue(undefined),
      removeIfEmpty: vi.fn<(directory: string) => Promise<void>>().mockResolvedValue(undefined),
    } satisfies LegacyStorageFileSystem;
    return steps;
  };

  it('touches nothing when the old and the new place are the same folder written in another case', async () => {
    const files = fileSystem();

    await moveLegacyStorage({
      from: path.resolve('/Data/Mangabound'),
      to: path.resolve('/data/MANGABOUND'),
      folders: ['pending'],
      fileSystem: files,
      onProblem: vi.fn(),
    });

    for (const step of Object.values(files)) expect(step).not.toHaveBeenCalled();
  });

  it('moves a folder that is there when the places are different', async () => {
    const files = fileSystem();
    files.exists.mockImplementation((target: string) =>
      Promise.resolve(target.includes(`${path.sep}old${path.sep}`)),
    );

    await moveLegacyStorage({
      from: path.resolve('/old'),
      to: path.resolve('/new'),
      folders: ['pending'],
      fileSystem: files,
      onProblem: vi.fn(),
    });

    expect(files.rename).toHaveBeenCalledExactlyOnceWith(
      path.join(path.resolve('/old'), 'pending'),
      path.join(path.resolve('/new'), 'pending'),
    );
  });
});

describe('the arguments mangabind is started with', () => {
  const base = { inputPath: '/in', outputPath: '/out', dryRun: false } as const;

  it('asks for progress on its side channel only when it is meant to be listened to', () => {
    expect(buildMangabindArguments({ ...base, progressJson: true })).toContain('--progress-json');
    expect(buildMangabindArguments({ ...base, progressJson: false })).not.toContain(
      '--progress-json',
    );
    expect(buildMangabindArguments(base)).not.toContain('--progress-json');
  });

  it('always asks for the report as JSON, last of the flags, with progress after it', () => {
    const arguments_ = buildMangabindArguments({ ...base, progressJson: true });

    expect(arguments_.slice(-2)).toEqual(['--json', '--progress-json']);
  });
});

describe('the events of mangapress as they arrive', () => {
  const line = (sequence: number): string =>
    JSON.stringify({
      protocol_version: 1,
      tool: 'mangapress',
      tool_version: '0.5.0',
      sequence,
      type: 'future',
    });

  it('are read from lines that end the way Windows ends them, one carriage return and no more', () => {
    const decoder = new MangapressEventDecoder();

    const events = decoder.push(`${line(1)}\r\n${line(2)}\r\n`);

    expect(events.map((event) => event.sequence)).toEqual([1, 2]);
  });

  it('are read from a last line that has no end of line, carriage return or not', () => {
    const decoder = new MangapressEventDecoder();
    decoder.push(`${line(1)}\r\n${line(2)}\r`);

    expect(decoder.finish().map((event) => event.sequence)).toEqual([2]);
  });

  it('are refused as empty, and not as malformed, when a line holds only white space', () => {
    for (const blank of ['', '   ', '\t']) {
      expect(() => parseMangapressEventLine(blank)).toThrowError(
        expect.objectContaining({ code: 'invalid_payload' }),
      );
    }
  });
});

describe('how many things are taken in at once', () => {
  it('is exactly as many as the limit, and says nothing of any more', async () => {
    const paths = Array.from({ length: maxInputsPerAdd }, (_, index) => `/m/${String(index)}`);
    const stat = vi.fn().mockResolvedValue({
      isDirectory: () => true,
      isFile: () => false,
    }) as unknown as StatFunction;

    const result = await classifyInputPaths(paths, { stat });

    expect(result.accepted).toHaveLength(maxInputsPerAdd);
    expect(result.rejected).toEqual([]);
  });

  it('is one more than the limit with the one left out said, never silently', async () => {
    const paths = Array.from({ length: maxInputsPerAdd + 1 }, (_, index) => `/m/${String(index)}`);
    const stat = vi.fn().mockResolvedValue({
      isDirectory: () => true,
      isFile: () => false,
    }) as unknown as StatFunction;

    const result = await classifyInputPaths(paths, { stat });

    expect(result.accepted).toHaveLength(maxInputsPerAdd);
    expect(result.rejected).toEqual([
      {
        name: '1 more',
        reason: `Only the first ${String(maxInputsPerAdd)} items are added at once.`,
      },
    ]);
  });
});

describe('what the temporary folder is cleaned of', () => {
  it('is a workspace named as the app names them, and no folder that only contains such a name', async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), 'mangabound-stale-names-'));
    directories.push(root);
    const old = new Date(Date.UTC(2026, 0, 1));
    const names = [
      'mangabound-abc123', // is one
      'mangabound-abc1234', // one letter too long
      'mangabound-abc12', // one too short
      'xmangabound-abc123', // starts with another name
      'mangabound-abc123x', // ends with another character
      'mangabound-abc-12', // not a letter or digit
    ];
    for (const name of names) {
      const folder = path.join(root, name);
      await mkdir(folder);
      await writeFile(path.join(folder, 'v.cbz'), 'x');
      await utimes(path.join(folder, 'v.cbz'), old, old);
      await utimes(folder, old, old);
    }

    const removed = await removeStaleScratch(root, 1000, Date.UTC(2026, 9, 1));

    expect(removed).toEqual(['mangabound-abc123']);
  });
});
