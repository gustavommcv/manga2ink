import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { $, $$, browser } from '@wdio/globals';

import {
  listZipEntryNames,
  readZipEntry,
  resetQueue,
  saveAllBooks,
  saveBookAs,
  setFormat,
} from './support';

const temporaryDirectories: string[] = [];

after(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('packaged folder whose names carry the volumes', () => {
  it('arrives already grouped, converts without touching the source folder, and searches nowhere unless asked', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'manga2ink-named-volumes-e2e-'));
    temporaryDirectories.push(testRoot);
    const inputPath = path.join(testRoot, 'Named Volumes');
    const libraryPath = path.join(testRoot, 'library');
    await cp(
      path.resolve('tests', 'fixtures', 'e2e', 'manga-named-volumes', 'Named Volumes'),
      inputPath,
      { recursive: true },
    );
    await mkdir(libraryPath);

    const openDialog = await browser.electron.mock('dialog', 'showOpenDialog');
    await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [inputPath] });
    await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [libraryPath] });

    await resetQueue();
    await setFormat('EPUB');
    await $('button=Folder').click();

    // mangabind already grouped it: the row says so, and nothing has to be assigned by hand.
    await $('span=2 volumes').waitForDisplayed({ timeout: 30_000 });
    assert.match(await $('main').getText(), /grouped from names/u);

    await $('button[aria-label="Edit volumes for Named Volumes"]').click();
    await $('h1=Organize Named Volumes into volumes').waitForDisplayed({ timeout: 30_000 });
    assert.match(await $('main').getText(), /Proposed chapter mapping/u);
    assert.match(await $('main').getText(), /2 volumes · 3 of 3 chapters assigned/u);
    await $('button=Edit chapter mapping').click();
    const scroll = JSON.parse(
      await browser.execute(() => {
        const chapters = document.querySelector('section[aria-labelledby="chapters-title"]');
        const list = chapters?.children[1];
        const bar = document.querySelector('header.window-titlebar');
        const page = bar?.nextElementSibling;
        if (!(list instanceof HTMLElement) || !(page instanceof HTMLElement)) {
          return JSON.stringify({ found: false });
        }
        const filler = document.createElement('div');
        filler.style.height = '1200px';
        list.appendChild(filler);
        const result = {
          found: true,
          listRange: list.scrollHeight - list.clientHeight,
          pageRange: page.scrollHeight - page.clientHeight,
          documentRange: document.documentElement.scrollHeight - window.innerHeight,
        };
        filler.remove();
        return JSON.stringify(result);
      }),
    ) as { found: boolean; listRange: number; pageRange: number; documentRange: number };
    assert.equal(scroll.found, true);
    assert.equal(scroll.listRange, 0, 'the chapter list must not have its own scrollbar');
    assert.ok(scroll.pageRange > 0, 'the app content remains scrollable');
    assert.ok(scroll.documentRange <= 1, 'the document itself must not gain a scrollbar');
    const editor = await $('main').getText();
    assert.match(editor, /Grouped by mangabind/u);
    assert.doesNotMatch(editor, /Unassigned/u);
    assert.match(editor, /2 volumes were read from the names of 3 chapters/u);
    assert.equal(await $$('[role="alert"]').length, 0);

    // The names are where the grouping comes from unless someone chooses otherwise, and no online
    // source is chosen until they do: MangaDex is in the list, and nothing has been sent to it.
    await $('[role="tab"]*=Online source').click();
    const source = $('[role="combobox"]');
    assert.equal((await source.getText()).trim(), 'Select a source');
    await source.click();
    assert.match(await $('[role="listbox"]').getText(), /MangaDex\s+mangadex\.org/u);
    await $('[role="option"]*=MangaDex').click();
    // The folder names declare English, and the lookup would be made in it.
    await $('p*=Volumes are looked up in en').waitForDisplayed({ timeout: 10_000 });

    // The credit opens MangaDex's own site through the system, never an address the page names.
    const openExternal = await browser.electron.mock('shell', 'openExternal');
    await openExternal.mockResolvedValue(undefined);
    await $('button[aria-label="Open MangaDex in your browser"]').click();
    await browser.waitUntil(() => openExternal.mock.calls.length === 1, {
      timeout: 10_000,
      timeoutMsg: 'The credit did not open MangaDex.',
    });
    assert.deepEqual(openExternal.mock.calls[0], ['https://mangadex.org/']);
    // Searching is a separate, explicit step: choosing the source sent nothing.
    assert.equal(await $('button=Search').isExisting(), true);

    await $('button=Confirm mapping').click();
    await $('h1=Queue').waitForDisplayed();
    await $('button=Process 1 item').click();
    await $('h1=2 books ready').waitForDisplayed({ timeout: 120_000 });
    assert.deepEqual(
      await $$('ul[aria-label="Ready books"] li p:first-child').map((book) => book.getText()),
      ['Named Volumes - Vol.01.epub', 'Named Volumes - Vol.02.epub'],
      'the books must be shown in volume order even if conversion finishes out of order',
    );
    await saveAllBooks();

    assert.deepEqual((await readdir(libraryPath)).sort(), [
      '.mangabound',
      'Named Volumes - Vol.01.epub',
      'Named Volumes - Vol.02.epub',
    ]);
    for (const name of ['Named Volumes - Vol.01.epub', 'Named Volumes - Vol.02.epub']) {
      const bytes = await readFile(path.join(libraryPath, name));
      assert.ok(bytes.length > 1_024);
      assert.equal(bytes.subarray(0, 2).toString('ascii'), 'PK');
    }
    // The names already said everything, so no mangabind.json was written into the source.
    await assert.rejects(readFile(path.join(inputPath, 'mangabind.json'), 'utf8'));
  });

  /**
   * Makes the two volumes of the fixture one book in a format and saves it: the plan says it is one
   * book, one book is ready and one file of the format is where it was saved. Returns that file.
   */
  async function bindTwoVolumesAs(format: 'CBZ' | 'EPUB' | 'PDF'): Promise<string> {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'manga2ink-combined-e2e-'));
    temporaryDirectories.push(testRoot);
    const inputPath = path.join(testRoot, 'Named Volumes');
    const libraryPath = path.join(testRoot, 'library');
    await cp(
      path.resolve('tests', 'fixtures', 'e2e', 'manga-named-volumes', 'Named Volumes'),
      inputPath,
      { recursive: true },
    );
    await mkdir(libraryPath);

    const openDialog = await browser.electron.mock('dialog', 'showOpenDialog');
    await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [inputPath] });

    await resetQueue();
    await setFormat(format);
    await $('button=Folder').click();
    await $('span=2 volumes').waitForDisplayed({ timeout: 30_000 });
    // The mode is kept for the rest of the session, so it is made sure to be on, not toggled.
    const wholeSeries = $('button=Whole series');
    if ((await wholeSeries.getAttribute('aria-checked')) !== 'true') await wholeSeries.click();
    // The mode leaves the format as it was chosen.
    assert.equal(
      await $(
        '[role="radiogroup"][aria-label="Format"] [role="radio"][aria-checked="true"]',
      ).getText(),
      format,
    );
    await $('button=Validate plan').click();
    await $('h2=Plan validated').waitForDisplayed({ timeout: 30_000 });
    assert.match(await $('main').getText(), /One book for Named Volumes/u);
    assert.doesNotMatch(await $('[aria-labelledby="plans-title"]').getText(), /Vol\.01\.cbz/u);
    await $('button=Process 1 item').click();
    await $('h1=1 book ready').waitForDisplayed({ timeout: 120_000 });

    const singleBookButton = $('ul[aria-label="Ready books"] button[aria-label^="Save "]');
    const singleBookName = (await singleBookButton.getAttribute('aria-label'))?.replace(
      /^Save | as$/gu,
      '',
    );
    if (singleBookName === undefined) throw new Error('The single book has no save action.');
    await saveBookAs(singleBookName, path.join(libraryPath, singleBookName));

    const extension = `.${format.toLowerCase()}`;
    const books = (await readdir(libraryPath)).filter((name) => name.endsWith(extension));
    assert.equal(books.length, 1, `two input volumes should produce exactly one ${format}`);
    return path.join(libraryPath, books[0]!);
  }

  it('binds two volumes into one EPUB with chapters nested under each volume', async () => {
    const bookPath = await bindTwoVolumesAs('EPUB');
    assert.equal((await readFile(bookPath)).subarray(0, 2).toString('ascii'), 'PK');

    // Inspect the real EPUB XML. A flat list containing every label would not prove that a
    // reader can expand each volume to find its chapters.
    const ncx = await readZipEntry(bookPath, (name) => name.endsWith('toc.ncx'));
    const nav = await readZipEntry(bookPath, (name) => name.endsWith('nav.xhtml'));
    const toc = await browser.execute(
      (ncxXml, navXml) => {
        const parser = new DOMParser();
        const ncxDoc = parser.parseFromString(ncxXml, 'application/xml');
        const navDoc = parser.parseFromString(navXml, 'application/xml');
        if (
          ncxDoc.getElementsByTagName('parsererror').length > 0 ||
          navDoc.getElementsByTagName('parsererror').length > 0
        ) {
          throw new Error('The EPUB table of contents contains invalid XML.');
        }
        const childrenNamed = (element: Element, localName: string): Element[] =>
          Array.from(element.children).filter((child) => child.localName === localName);
        const navMap = ncxDoc.getElementsByTagName('navMap')[0];
        const navRoot = navDoc.getElementsByTagName('nav')[0];
        if (navMap === undefined || navRoot === undefined) {
          throw new Error('The EPUB is missing a table of contents.');
        }
        const volumes = childrenNamed(navMap, 'navPoint');
        const navList = childrenNamed(navRoot, 'ol')[0];
        return {
          ncx: volumes.map((volume) => ({
            label: volume.getElementsByTagName('text')[0]?.textContent ?? '',
            chapters: childrenNamed(volume, 'navPoint').map(
              (chapter) => chapter.getElementsByTagName('text')[0]?.textContent ?? '',
            ),
          })),
          navChapterCounts:
            navList === undefined
              ? []
              : childrenNamed(navList, 'li').map((volume) => {
                  const chapterList = childrenNamed(volume, 'ol')[0];
                  return chapterList === undefined ? 0 : childrenNamed(chapterList, 'li').length;
                }),
        };
      },
      ncx,
      nav,
    );

    assert.equal(toc.ncx.length, 2);
    assert.match(toc.ncx[0]!.label, /Vol\.01/u);
    assert.match(toc.ncx[1]!.label, /Vol\.02/u);
    assert.equal(toc.ncx[0]!.chapters.length, 2);
    assert.equal(toc.ncx[1]!.chapters.length, 1);
    assert.deepEqual(toc.navChapterCounts, [2, 1]);
  });

  it('binds two volumes into one CBZ whose folders keep the volumes in the order a reader sorts them', async () => {
    const bookPath = await bindTwoVolumesAs('CBZ');
    assert.equal((await readFile(bookPath)).subarray(0, 2).toString('ascii'), 'PK');

    // A reader that orders the pages by their names, as KOReader's does, must find the first
    // volume before the second: so a chapter is in the folder of its volume, and the names that
    // sort are the names in the order the pages were written.
    const names = (await listZipEntryNames(bookPath)).filter((name) => /\.(jpg|png)$/u.test(name));
    assert.ok(names.length > 0, 'the CBZ has pages');
    assert.deepEqual(
      [...names].sort(),
      names,
      `the names are not in the order they were written: ${names.join(', ')}`,
    );
    assert.match(names[0]!, /^v001 - Vol\.01\/c\d+/u);
    assert.match(names.at(-1)!, /^v002 - Vol\.02\/c\d+/u);
  });

  it('binds two volumes into one PDF with the volumes and their chapters as bookmarks', async () => {
    const bookPath = await bindTwoVolumesAs('PDF');
    const bytes = await readFile(bookPath);
    assert.equal(bytes.subarray(0, 5).toString('ascii'), '%PDF-');
    assert.ok(bytes.length > 1_024);

    // The outline is written as plain objects, so it can be read from the bytes: a bookmark for
    // each of the two volumes and the three chapters, and the document's own title makes six
    // titles. A volume starts closed, with a negative count of the chapters under it: two in the
    // first volume, one in the second.
    const text = bytes.toString('latin1');
    assert.match(text, /\/Outlines/u);
    assert.equal(text.match(/\/Title/gu)?.length, 6);
    assert.match(text, /\/Count -2\b/u);
    assert.match(text, /\/Count -1\b/u);
  });
});
