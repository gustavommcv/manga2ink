import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { $, $$, browser } from '@wdio/globals';

import { resetQueue, saveAllBooks, setFormat, setSteps } from './support';

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
});
