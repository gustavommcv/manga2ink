import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { $, browser } from '@wdio/globals';

import { resetQueue } from './support';

const temporaryDirectories: string[] = [];

after(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const runFolders = async (root: string): Promise<string[]> =>
  (await readdir(root)).filter((name) => /^[0-9a-f-]{36}$/iu.test(name));

describe('packaged processing folder', () => {
  it('builds volumes and keeps the books in the folder that is chosen, and leaves earlier books where they are', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'mangabound-processing-e2e-'));
    temporaryDirectories.push(testRoot);
    const work = path.join(testRoot, 'work');
    await mkdir(work);
    const input = path.join(testRoot, 'Named Volumes');
    await cp(
      path.resolve('tests', 'fixtures', 'e2e', 'manga-named-volumes', 'Named Volumes'),
      input,
      {
        recursive: true,
      },
    );
    const ownPending = process.env.MANGABOUND_PENDING_ROOT;
    if (ownPending === undefined) throw new Error('The suite did not say where pending books go.');
    const userData = await browser.electron.execute((electron) => electron.app.getPath('userData'));
    const settingsFile = path.join(userData, 'app-settings.json');
    const openDialog = await browser.electron.mock('dialog', 'showOpenDialog');

    const convertNamedVolumes = async (): Promise<void> => {
      await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [input] });
      await resetQueue();
      await $('button=Folder').click();
      await $('span=2 volumes').waitForDisplayed({ timeout: 30_000 });
    };
    const openProcessingTab = async () => {
      await $('button[aria-label="App settings"]').click();
      await $('[role="dialog"]').waitForDisplayed({ timeout: 30_000 });
      await $('[role="tab"]=Processing').click();
      const panel = $('[role="tabpanel"]');
      await panel.$('button=Choose a folder…').waitForDisplayed({ timeout: 30_000 });
      return panel;
    };

    // With no folder chosen, a book waits where the app has always kept them.
    await convertNamedVolumes();
    await $('button=Process 1 item').click();
    await $('h1=2 books ready').waitForDisplayed({ timeout: 120_000 });
    assert.equal((await runFolders(ownPending)).length, 1);

    // Choosing a folder: the app makes Pending and Scratch in it, and says so.
    let panel = await openProcessingTab();
    assert.match(await panel.getText(), /Chosen by Mangabound/u);
    assert.equal(await panel.$('button=Use the default folder').isEnabled(), false);
    await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [work] });
    await panel.$('button=Choose a folder…').click();
    await browser.waitUntil(
      async () => (await panel.getText()).includes(path.join(work, 'Pending')),
      {
        timeout: 30_000,
        timeoutMsg: 'The tab did not say the folder in use.',
      },
    );
    const chosenText = await panel.getText();
    assert.ok(chosenText.includes(path.join(work, 'Scratch')));
    // The book made before is still waiting where it was, and the tab says how many.
    assert.ok(chosenText.includes(ownPending), 'the earlier folder should be listed');
    assert.match(chosenText, /2 books/u);
    assert.deepEqual((await readdir(work)).sort(), ['Pending', 'Scratch']);
    assert.deepEqual(JSON.parse(await readFile(settingsFile, 'utf8')), {
      version: 1,
      language: 'system',
      processingFolder: work,
      earlierProcessingFolders: [],
    });
    await browser.keys('Escape');

    // The next conversion builds its volumes in the folder, and its book waits in it.
    await convertNamedVolumes();
    assert.equal(
      (await readdir(path.join(work, 'Scratch'))).filter((name) => name.startsWith('mangabound-'))
        .length,
      1,
      'the volumes should be built in the chosen folder',
    );
    await $('button=Process 1 item').click();
    await $('h1=2 books ready').waitForDisplayed({ timeout: 120_000 });
    assert.equal((await runFolders(path.join(work, 'Pending'))).length, 1);
    assert.equal((await runFolders(ownPending)).length, 1, 'the earlier book was not moved');

    // Back to the app's own places: the books in the folder stay, and are listed there.
    panel = await openProcessingTab();
    await panel.$('button=Use the default folder').click();
    await browser.waitUntil(async () => (await panel.getText()).includes('Chosen by Mangabound'), {
      timeout: 30_000,
      timeoutMsg: 'The tab did not go back to the app’s own places.',
    });
    const backText = await panel.getText();
    assert.ok(
      backText.includes(path.join(work, 'Pending')),
      'the folder should be listed as earlier',
    );
    assert.deepEqual(JSON.parse(await readFile(settingsFile, 'utf8')), {
      version: 1,
      language: 'system',
      processingFolder: null,
      earlierProcessingFolders: [work],
    });
    await browser.keys('Escape');
  });
});
