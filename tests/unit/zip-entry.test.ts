import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readZipEntry } from '@/adapters/input/zip-entry';

import { type ZipEntrySpec, zipOf, type ZipTampering } from './support/zip';

const page = Buffer.from('first page bytes');
const other = Buffer.from('another page');
const limit = 1024;

let folder: string;
beforeEach(async () => {
  folder = await mkdtemp(path.join(os.tmpdir(), 'manga2ink-zip-'));
});
afterEach(async () => {
  await rm(folder, { force: true, recursive: true });
});

/** Writes the archive and reads one entry of it. */
async function read(
  entries: readonly ZipEntrySpec[],
  name: string,
  tampering?: ZipTampering,
  maxBytes = limit,
): Promise<Buffer | undefined> {
  const archive = path.join(folder, 'chapter.cbz');
  await writeFile(archive, zipOf(entries, tampering));
  return readZipEntry(archive, name, maxBytes);
}

describe('reading one entry of a zip archive', () => {
  it('finds an entry that is stored as it is, and one that is deflated', async () => {
    const entries = [
      { name: 'ComicInfo.xml', data: other },
      { name: '001.png', data: page, method: 0 },
      { name: '002.png', data: other, method: 8 },
    ];

    expect(await read(entries, '001.png')).toEqual(page);
    expect(await read(entries, '002.png')).toEqual(other);
  });

  it('finds a name written in UTF-8, and one written in the older code page', async () => {
    const entries = [
      { name: '第1話/001.png', data: page },
      { name: '', rawName: Buffer.from('é.png', 'latin1'), data: other, flags: 0 },
    ];

    expect(await read(entries, '第1話/001.png')).toEqual(page);
    expect(await read(entries, 'é.png')).toEqual(other);
    // A name that says it is UTF-8 is not read as the older code page.
    expect(
      await read([{ name: '', rawName: Buffer.from('é.png', 'utf8'), data: page }], 'Ã©.png'),
    ).toBeUndefined();
  });

  it('has nothing for an entry the archive does not hold, or a file that is not there', async () => {
    expect(await read([{ name: '001.png', data: page }], '002.png')).toBeUndefined();
    expect(await readZipEntry(path.join(folder, 'missing.cbz'), '001.png', limit)).toBeUndefined();
  });

  it('has nothing for an entry it should not read: encrypted, too big, or of another method', async () => {
    expect(await read([{ name: 'a.png', data: page, flags: 0x801 }], 'a.png')).toBeUndefined();
    expect(await read([{ name: 'a.png', data: page }], 'a.png', undefined, 4)).toBeUndefined();
    expect(await read([{ name: 'a.png', data: page, method: 12 }], 'a.png')).toBeUndefined();
  });

  it('does not take the size an entry says for the size it has', async () => {
    const big = Buffer.alloc(100_000, 'a');
    const entries = [{ name: 'bomb.png', data: big, method: 8, claimedSize: 10 }];

    expect(await read(entries, 'bomb.png', undefined, 1000)).toBeUndefined();
  });

  describe('has nothing for an archive it cannot follow', () => {
    const entries = [{ name: '001.png', data: page }];

    it.each<[string, ZipTampering]>([
      ['one cut short, with no end', { noEnd: true }],
      ['a zip64 one', { zip64: true }],
      ['one with too many entries to be a comic', { extraEntries: 0xffff - 1 }],
      ['one with a directory far bigger than it is', { hugeDirectory: true }],
      ['one whose directory is past its end', { directoryBeyondFile: true }],
      ['one with a damaged directory', { badDirectoryEntry: true }],
      ['one with a damaged local header', { badLocalHeader: true }],
      ['one whose entry is past its end', { entryBeyondFile: true }],
      ['one whose entry is longer than it', { truncatedData: true }],
    ])('%s', async (_case, tampering) => {
      // The entry asked for is after the damaged one, or is the damaged one itself.
      expect(await read(entries, '001.png', tampering)).toBeUndefined();
      expect(await read(entries, 'not-there.png', tampering)).toBeUndefined();
    });

    it('one whose entry is cut short, where the size it says is within what may be read', async () => {
      const entries = [{ name: '001.png', data: page }];

      expect(await read(entries, '001.png', { truncatedData: true }, 10_000_000)).toBeUndefined();
    });

    it('one that says it has more entries than its directory holds, once it runs out of them', async () => {
      const entries = [{ name: '001.png', data: page }];

      expect(await read(entries, 'not-there.png', { extraEntries: 3 })).toBeUndefined();
      // What is before the damage is still found.
      expect(await read(entries, '001.png', { extraEntries: 3 })).toEqual(page);
    });

    it('a file that is not a zip at all, or whose end is cut inside the end record', async () => {
      const archive = path.join(folder, 'text.cbz');
      await writeFile(archive, 'this is not a zip archive');
      expect(await readZipEntry(archive, 'a.png', limit)).toBeUndefined();

      await writeFile(
        archive,
        Buffer.concat([Buffer.alloc(8), Buffer.from([0x50, 0x4b, 5, 6, 0])]),
      );
      expect(await readZipEntry(archive, 'a.png', limit)).toBeUndefined();
    });
  });
});
