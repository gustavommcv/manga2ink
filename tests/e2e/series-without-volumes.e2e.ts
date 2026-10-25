import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { $, browser } from '@wdio/globals';

import { readZipEntry, resetQueue, saveBookAs, setFormat } from './support';

const temporaryDirectories: string[] = [];

after(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('packaged series that has no volumes, made one book', () => {
  it('is bound by the tool with no volumes, so the table of contents is the chapters alone', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'manga2ink-no-volumes-e2e-'));
    temporaryDirectories.push(testRoot);
    const inputPath = path.join(testRoot, 'Manga2Ink E2E');
    const libraryPath = path.join(testRoot, 'library');
    await cp(path.resolve('tests', 'fixtures', 'e2e', 'manga-folder', 'Manga2Ink E2E'), inputPath, {
      recursive: true,
    });
    await mkdir(libraryPath);

    const openDialog = await browser.electron.mock('dialog', 'showOpenDialog');
    await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [inputPath] });

    await resetQueue();
    await setFormat('EPUB');
    await $('button=Folder').click();

    // The folder has chapters and no volumes: the books are chosen where its chapters are grouped.
    await $('button[aria-label="Edit books and volumes for Manga2Ink E2E"]').click();
    await $('input#books-series').click();
    await $('button=Queue').click();
    await $('span=Whole series').waitForDisplayed({ timeout: 30_000 });
    await $('button=Validate plan').click();
    await $('h2=Plan validated').waitForDisplayed({ timeout: 30_000 });
    assert.match(await $('main').getText(), /One book for Manga2Ink E2E/u);
    await $('button=Process 1 item').click();
    await $('h1=1 book ready').waitForDisplayed({ timeout: 120_000 });

    const saveButton = $('ul[aria-label="Ready books"] button[aria-label^="Save "]');
    const bookName = (await saveButton.getAttribute('aria-label'))?.replace(/^Save | as$/gu, '');
    if (bookName === undefined) throw new Error('The single book has no save action.');
    await saveBookAs(bookName, path.join(libraryPath, bookName));

    const books = (await readdir(libraryPath)).filter((name) => name.endsWith('.epub'));
    assert.equal(books.length, 1, 'one book, not one for each chapter');
    const ncx = await readZipEntry(path.join(libraryPath, books[0]!), (name) =>
      name.endsWith('toc.ncx'),
    );

    // The chapters, and no level above them: a volume that nobody made is not in the contents.
    let depth = 0;
    let deepest = 0;
    for (const tag of ncx.match(/<\/?navPoint\b/gu) ?? []) {
      depth += tag.startsWith('</') ? -1 : 1;
      deepest = Math.max(deepest, depth);
    }
    assert.equal(deepest, 1, 'the contents have a single level');
    const labels = [...ncx.matchAll(/<navLabel>\s*<text>([^<]*)<\/text>/gu)].map(
      (match) => match[1]!,
    );
    assert.deepEqual(labels, ['Ch.1', 'Ch.2']);
  });
});
