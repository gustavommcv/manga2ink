import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { $, $$, browser } from '@wdio/globals';

import { resetQueue, saveAllBooks, saveBookAs, setFormat, setSteps } from './support';

const temporaryDirectories: string[] = [];

after(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

/** Chooses the format on the open options page of one item, and waits until it shows. */
async function chooseItemFormat(value: 'cbz' | 'epub' | 'pdf'): Promise<void> {
  const select = $('#output-format');
  await select.waitForDisplayed({ timeout: 10_000 });
  await select.selectByAttribute('value', value);
  await browser.waitUntil(async () => (await select.getValue()) === value, {
    timeout: 10_000,
    timeoutMsg: `The item's format did not become ${value}.`,
  });
}

describe('packaged conversion options of one item', () => {
  it('make each item with its own format, in one run, without touching the queue’s options', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'mangabound-item-options-e2e-'));
    temporaryDirectories.push(testRoot);
    const named = path.resolve('tests', 'fixtures', 'e2e', 'manga-named-volumes', 'Named Volumes');
    const alpha = path.join(testRoot, 'Alpha Series');
    const gamma = path.join(testRoot, 'Gamma Series');
    const library = path.join(testRoot, 'Library');
    const libraryPath = path.join(testRoot, 'output');
    await cp(named, alpha, { recursive: true });
    await cp(named, gamma, { recursive: true });
    await cp(path.resolve('tests', 'fixtures', 'e2e', 'manga-batch', 'Library'), library, {
      recursive: true,
    });
    await mkdir(libraryPath);

    const openDialog = await browser.electron.mock('dialog', 'showOpenDialog');
    await openDialog.mockResolvedValueOnce({
      canceled: false,
      filePaths: [alpha, library, gamma],
    });
    await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [libraryPath] });

    await resetQueue();
    await setSteps({ group: true, convert: true });
    // The queue's own format is CBZ: what an item does not set is made as a CBZ.
    await setFormat('CBZ');
    await $('button=Folder').click();
    await browser.waitUntil(async () => (await $$('span=2 volumes').length) === 2, {
      timeout: 60_000,
      timeoutMsg: 'Both folders should have been read.',
    });
    await $('span=1 title').waitForDisplayed({ timeout: 60_000 });
    const queueDevice = await $('#queue-device').getValue();

    // The first folder is made as a PDF, whatever the queue is set to.
    await $('button[aria-label="Edit conversion options of Alpha Series"]').click();
    await $('h1=Options for Alpha Series').waitForDisplayed({ timeout: 10_000 });
    await chooseItemFormat('pdf');
    await $('button=Queue').click();
    await $('h1=Queue').waitForDisplayed();
    assert.equal(
      await $('button[aria-label="Edit conversion options of Alpha Series"]').getAttribute('title'),
      'Edit conversion options for this item (set)',
    );
    assert.equal(
      await $('button[aria-label="Edit conversion options of Gamma Series"]').getAttribute('title'),
      'Edit conversion options for this item',
    );

    // One title of the library is made as an EPUB; the library itself has no options of its own.
    await $('button[aria-label="Edit titles of Library"]').click();
    await $('h1=Library').waitForDisplayed({ timeout: 30_000 });
    await $('button[aria-label="Edit conversion options of Auto-Resolved Manga"]').click();
    await $('h1=Options for Auto-Resolved Manga').waitForDisplayed({ timeout: 10_000 });
    await chooseItemFormat('epub');
    await $('button=Library').click();
    await $('h1=Library').waitForDisplayed({ timeout: 10_000 });
    await $('button=Queue').click();
    await $('h1=Queue').waitForDisplayed();

    // What was chosen for items has not changed what the queue is set to.
    assert.equal(await $('[role="radio"]=CBZ').getAttribute('aria-checked'), 'true');
    assert.equal(await $('#queue-device').getValue(), queueDevice);

    await $('button=Process 3 items').click();
    await $('h1=5 books ready').waitForDisplayed({ timeout: 180_000 });
    assert.match(await $('main').getText(), /2 with options of their own/u);
    await saveAllBooks();

    assert.deepEqual((await readdir(libraryPath)).sort(), [
      '.mangabound',
      'Alpha Series - Vol.01.pdf',
      'Alpha Series - Vol.02.pdf',
      'Auto-Resolved Manga - Vol.01.epub',
      'Gamma Series - Vol.01.cbz',
      'Gamma Series - Vol.02.cbz',
    ]);

    // Making them did not change the queue's options either.
    await $('button=Convert more').click();
    await $('h1=Queue').waitForDisplayed();
    assert.equal(await $('[role="radio"]=CBZ').getAttribute('aria-checked'), 'true');
    assert.equal(await $('#queue-device').getValue(), queueDevice);
    await resetQueue();
  });
  it('keep every item to its own options in a large queue and a large library, with the real tools', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'mangabound-item-options-many-e2e-'));
    temporaryDirectories.push(testRoot);
    const named = path.resolve('tests', 'fixtures', 'e2e', 'manga-named-volumes', 'Named Volumes');
    const resolved = path.resolve(
      'tests',
      'fixtures',
      'e2e',
      'manga-batch',
      'Library',
      'Auto-Resolved Manga',
    );
    const libraryPath = path.join(testRoot, 'output');
    await mkdir(libraryPath);
    const pad = (index: number): string => String(index + 1).padStart(2, '0');

    // Twelve folders of two volumes each, and a library of ten titles of one volume each.
    const folders = Array.from({ length: 12 }, (_, index) =>
      path.join(testRoot, `Folder ${pad(index)}`),
    );
    for (const folder of folders) await cp(named, folder, { recursive: true });
    const library = path.join(testRoot, 'Big Library');
    for (let index = 0; index < 10; index += 1) {
      await cp(resolved, path.join(library, `Title ${pad(index)}`), { recursive: true });
    }

    const openDialog = await browser.electron.mock('dialog', 'showOpenDialog');
    await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [...folders, library] });
    await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [libraryPath] });

    await resetQueue();
    await setSteps({ group: true, convert: true });
    await setFormat('CBZ');
    await $('button=Folder').click();
    await browser.waitUntil(async () => (await $$('span=2 volumes').length) === 12, {
      timeout: 120_000,
      timeoutMsg: 'The twelve folders should have been read.',
    });
    await $('span=10 titles').waitForDisplayed({ timeout: 120_000 });

    // Folders 03 and 11 are made as EPUBs and folder 07 as a PDF.
    for (const [name, value] of [
      ['Folder 03', 'epub'],
      ['Folder 07', 'pdf'],
      ['Folder 11', 'epub'],
    ] as const) {
      await $(`button[aria-label="Edit conversion options of ${name}"]`).click();
      await $(`h1=Options for ${name}`).waitForDisplayed({ timeout: 10_000 });
      await chooseItemFormat(value);
      await $('button=Queue').click();
      await $('h1=Queue').waitForDisplayed();
    }
    // Titles 02 and 09 of the library are made as a PDF and an EPUB.
    await $('button[aria-label="Edit titles of Big Library"]').click();
    await $('h1=Big Library').waitForDisplayed({ timeout: 30_000 });
    for (const [name, value] of [
      ['Title 02', 'pdf'],
      ['Title 09', 'epub'],
    ] as const) {
      await $(`button[aria-label="Edit conversion options of ${name}"]`).click();
      await $(`h1=Options for ${name}`).waitForDisplayed({ timeout: 10_000 });
      await chooseItemFormat(value);
      await $('button=Big Library').click();
      await $('h1=Big Library').waitForDisplayed({ timeout: 10_000 });
    }
    await $('button=Queue').click();
    await $('h1=Queue').waitForDisplayed();

    await $('button=Process 13 items').click();
    await $('h1=34 books ready').waitForDisplayed({ timeout: 300_000 });
    await saveAllBooks();

    const names = (await readdir(libraryPath)).filter((name) => name !== '.mangabound').sort();
    const expected = [
      ...folders.flatMap((_, index) => {
        const extension = index === 2 || index === 10 ? 'epub' : index === 6 ? 'pdf' : 'cbz';
        return [1, 2].map((volume) => `Folder ${pad(index)} - Vol.0${String(volume)}.${extension}`);
      }),
      ...Array.from({ length: 10 }, (_, index) => {
        const extension = index === 1 ? 'pdf' : index === 8 ? 'epub' : 'cbz';
        return `Title ${pad(index)} - Vol.01.${extension}`;
      }),
    ].sort();
    assert.deepEqual(names, expected);
    await resetQueue();
  });
  it('keep the options of an item that failed, and make it with them when it is run again', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'mangabound-item-options-fail-e2e-'));
    temporaryDirectories.push(testRoot);
    const named = path.resolve('tests', 'fixtures', 'e2e', 'manga-named-volumes', 'Named Volumes');
    const alpha = path.join(testRoot, 'Alpha Series');
    const broken = path.join(testRoot, 'Broken Series');
    const gamma = path.join(testRoot, 'Gamma Series');
    const libraryPath = path.join(testRoot, 'output');
    await cp(named, alpha, { recursive: true });
    await cp(named, gamma, { recursive: true });
    await mkdir(libraryPath);
    // Chapters whose pages are not images: mangabind binds them and mangapress cannot convert them.
    const chapters = [
      'Vol.01 Ch.0001 - First (en) [Group]',
      'Vol.01 Ch.0002 - Second (en) [Group]',
    ];
    for (const chapter of chapters) {
      await mkdir(path.join(broken, chapter), { recursive: true });
      for (const page of ['001.png', '002.png']) {
        await writeFile(path.join(broken, chapter, page), 'this is not an image');
      }
    }

    const openDialog = await browser.electron.mock('dialog', 'showOpenDialog');
    await openDialog.mockResolvedValueOnce({
      canceled: false,
      filePaths: [alpha, broken, gamma],
    });
    await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [libraryPath] });

    await resetQueue();
    await setSteps({ group: true, convert: true });
    await setFormat('CBZ');
    await $('button=Folder').click();
    await $('p=Gamma Series').waitForDisplayed({ timeout: 60_000 });
    await browser.waitUntil(
      async () => (await $('main').getText()).includes('Checking') === false,
      { timeout: 60_000, timeoutMsg: 'The folders should have been read.' },
    );
    for (const [name, value] of [
      ['Alpha Series', 'pdf'],
      ['Broken Series', 'epub'],
      ['Gamma Series', 'epub'],
    ] as const) {
      await $(`button[aria-label="Edit conversion options of ${name}"]`).click();
      await $(`h1=Options for ${name}`).waitForDisplayed({ timeout: 10_000 });
      await chooseItemFormat(value);
      await $('button=Queue').click();
      await $('h1=Queue').waitForDisplayed();
    }
    await $('button=Process 3 items').click();
    await $('h1=4 books ready').waitForDisplayed({ timeout: 180_000 });
    const results = await $('main').getText();
    assert.match(results, /Broken Series could not be converted/u);
    // Only the items that made books count as made with options of their own.
    assert.match(results, /2 with options of their own/u);
    await saveAllBooks();
    assert.deepEqual((await readdir(libraryPath)).sort(), [
      '.mangabound',
      'Alpha Series - Vol.01.pdf',
      'Alpha Series - Vol.02.pdf',
      'Gamma Series - Vol.01.epub',
      'Gamma Series - Vol.02.epub',
    ]);

    // The item that failed is still in the queue, with the format it was set to.
    await $('button=Convert more').click();
    await $('h1=Queue').waitForDisplayed();
    await $('p=Broken Series').waitForDisplayed({ timeout: 10_000 });
    assert.equal(await $('p=Alpha Series').isExisting(), false);
    assert.equal(await $('p=Gamma Series').isExisting(), false);
    const brokenButton = $('button[aria-label="Edit conversion options of Broken Series"]');
    assert.equal(
      await brokenButton.getAttribute('title'),
      'Edit conversion options for this item (set)',
    );
    await brokenButton.click();
    await $('h1=Options for Broken Series').waitForDisplayed({ timeout: 10_000 });
    assert.equal(await $('#output-format').getValue(), 'epub');
    await $('button=Queue').click();
    await $('h1=Queue').waitForDisplayed();

    // Once its pages are readable, it is made as the EPUB it was set to, not as the queue's CBZ.
    const good = path.join(named, 'Vol.01 Ch.0001 - First (en) [Group]', '001.png');
    for (const chapter of chapters) {
      for (const page of ['001.png', '002.png']) {
        await cp(good, path.join(broken, chapter, page));
      }
    }
    await $('button=Process 1 item').click();
    await $('h1=1 book ready').waitForDisplayed({ timeout: 180_000 });
    const retried = 'Broken Series - Vol.01.epub';
    await saveBookAs(retried, path.join(libraryPath, retried));
    const names = await readdir(libraryPath);
    assert.ok(names.includes(retried));
    assert.ok(!names.some((name) => name.startsWith('Broken Series') && name.endsWith('.cbz')));
    await resetQueue();
  });
});
