import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readStoredDetails, withStoredDetails } from '@/adapters/mangabind/stored-details';
import { FsLibraryStore } from '@/adapters/library/fs-library-store';
import { FsPendingRuns } from '@/adapters/library/fs-pending-runs';
import { parseStoredSettings, serializeStoredSettings } from '@/adapters/settings/stored-settings';
import { maxDetailLength } from '@/domain/book-details';
import { defaultPreferences } from '@/domain/preferences';
import type { LibraryBookEntry } from '@/library/manifest';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe('the record of which pending books were saved, when what is on disk is not one', () => {
  async function runWithRecord(record: string | undefined): Promise<FsPendingRuns> {
    const root = await mkdtemp(path.join(os.tmpdir(), 'mangabound-damaged-pending-'));
    roots.push(root);
    const library = new FsLibraryStore();
    const store = new FsPendingRuns(path.join(root, 'pending'), library);
    const run = await store.create();
    const entry: LibraryBookEntry = {
      relativePath: 'Book.epub',
      title: 'Book',
      author: 'Author',
      format: 'epub',
      bytes: 5,
      convertedAt: '2026-09-28T00:00:00.000Z',
    };
    await writeFile(path.join(run.path, entry.relativePath), 'hello');
    await library.publish(run.path, entry);
    if (record !== undefined) {
      await mkdir(path.join(run.path, '.mangabound'), { recursive: true });
      await writeFile(path.join(run.path, '.mangabound', 'pending.json'), record);
    }
    return store;
  }

  it('is taken as nothing saved when there is none, and as what it says when it is a good one', async () => {
    const none = await runWithRecord(undefined);
    expect((await none.list())[0]?.books[0]).not.toHaveProperty('savedPath');

    const good = await runWithRecord(
      JSON.stringify({ version: 1, saved: { 'Book.epub': '/exported/Book.epub' } }),
    );
    expect((await good.list())[0]?.books[0]?.savedPath).toBe('/exported/Book.epub');
  });

  it.each([
    ['null', 'null'],
    ['an array', '[]'],
    ['a string', '"saved"'],
    ['a number', '7'],
    ['a record with another version', JSON.stringify({ version: 2, saved: {} })],
    ['a record with no version', JSON.stringify({ saved: {} })],
    ['a record with no saved list', JSON.stringify({ version: 1 })],
    ['a record whose saved list is null', JSON.stringify({ version: 1, saved: null })],
    ['a record whose saved list is an array', JSON.stringify({ version: 1, saved: [] })],
    ['a record whose saved list is a string', JSON.stringify({ version: 1, saved: 'x' })],
    [
      'a record with a destination that is not text',
      JSON.stringify({ version: 1, saved: { a: 5 } }),
    ],
  ])('is refused, not taken for nothing saved, when it is %s', async (_what, record) => {
    const store = await runWithRecord(record);

    await expect(store.list()).rejects.toThrow('The pending books record is invalid.');
  });

  it('is refused as it is, with the parser’s own complaint, when it is not even JSON', async () => {
    const store = await runWithRecord('{ not json');

    await expect(store.list()).rejects.toBeInstanceOf(SyntaxError);
  });
});

describe('a settings file that is not what a settings file is', () => {
  it.each(['not json at all', 'null', '[]', '"text"', '7', JSON.stringify({ version: 2 }), '{}'])(
    'is nothing to go on: %s',
    (raw) => {
      expect(parseStoredSettings(raw)).toBeUndefined();
    },
  );

  it.each([
    ['null', null],
    ['a list', []],
    ['text', 'x'],
    ['a number', 3],
  ])('is read with every option at its default when its options are %s', (_what, settings) => {
    const parsed = parseStoredSettings(JSON.stringify({ version: 1, settings }));

    expect(parsed?.reset).toEqual([]);
    expect(parsed?.settings.settings).toEqual({
      ...defaultPreferences.settings,
      combineIntoOneVolume: false,
    });
  });

  it('keeps what it holds when it is a good one, and takes back what it was given', () => {
    const written = serializeStoredSettings({ ...defaultPreferences, format: 'pdf' });

    expect(parseStoredSettings(written)?.settings.format).toBe('pdf');
  });
});

describe('the author and language kept in a folder’s mangabind.json', () => {
  it.each([
    ['text that is not JSON', 'not json'],
    ['a list', '[]'],
    ['a document with no manga', '{"volumes":[]}'],
    ['a manga that is a list', '{"manga":[]}'],
    ['a manga that is text', '{"manga":"Work"}'],
    ['a manga that is null', '{"manga":null}'],
  ])('holds nothing when it is %s', (_what, text) => {
    expect(readStoredDetails(text)).toEqual({});
  });

  it('trims what it reads, and takes an author that is exactly as long as one may be', () => {
    const longest = 'a'.repeat(maxDetailLength);
    const text = JSON.stringify({ manga: { author: ` ${longest} `, language: ' pt-BR ' } });

    expect(readStoredDetails(text)).toEqual({ author: longest, language: 'pt-BR' });
  });

  it('refuses an author one character too long, and an empty or untagged language', () => {
    const tooLong = 'a'.repeat(maxDetailLength + 1);

    expect(readStoredDetails(JSON.stringify({ manga: { author: tooLong } }))).toEqual({});
    expect(readStoredDetails(JSON.stringify({ manga: { language: '   ' } }))).toEqual({});
    expect(readStoredDetails(JSON.stringify({ manga: { language: 'not a tag' } }))).toEqual({});
  });

  it('is written with the schema version where the file had it first, and nothing invented', () => {
    const existing = JSON.stringify({
      volumes: [{ number: '1', chapters: ['1'] }],
      schema_version: 1,
    });

    const written = withStoredDetails(existing, { author: 'Someone' }) ?? '';

    expect(Object.keys(JSON.parse(written) as object)).toEqual([
      'schema_version',
      'manga',
      'volumes',
    ]);
    const plain = withStoredDetails(JSON.stringify({ volumes: [{ number: '1' }] }), {
      author: 'Someone',
    });
    expect(plain).not.toContain('schema_version');
  });
});
