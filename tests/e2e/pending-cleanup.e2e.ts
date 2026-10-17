import assert from 'node:assert/strict';
import { cp, mkdtemp, readdir, rm, utimes } from 'node:fs/promises';
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

/** The runs waiting in a folder; the folder is made with the first one, so it may not be there. */
async function runFolders(root: string): Promise<string[]> {
  try {
    return (await readdir(root)).filter((name) => /^[0-9a-f-]{36}$/iu.test(name));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
}

/** Makes everything in a folder as old as it was `days` ago. */
async function ageTree(target: string, days: number): Promise<void> {
  const when = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  for (const entry of await readdir(target, { withFileTypes: true })) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) await ageTree(child, days);
    else await utimes(child, when, when);
  }
  await utimes(target, when, when);
}

describe('packaged clean-up of the books that wait', () => {
  it('deletes a conversion that has waited long, only after it is asked what goes and says yes', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'mangabound-cleanup-e2e-'));
    temporaryDirectories.push(testRoot);
    const input = path.join(testRoot, 'Named Volumes');
    await cp(
      path.resolve('tests', 'fixtures', 'e2e', 'manga-named-volumes', 'Named Volumes'),
      input,
      { recursive: true },
    );
    const ownPending = process.env.MANGABOUND_PENDING_ROOT;
    if (ownPending === undefined) throw new Error('The suite did not say where pending books go.');
    const before = new Set(await runFolders(ownPending));
    const openDialog = await browser.electron.mock('dialog', 'showOpenDialog');
    await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [input] });

    await resetQueue();
    await $('button=Folder').click();
    await $('span=2 volumes').waitForDisplayed({ timeout: 30_000 });
    await $('button=Process 1 item').click();
    await $('h1=2 books ready').waitForDisplayed({ timeout: 120_000 });
    const made = (await runFolders(ownPending)).filter((name) => !before.has(name));
    assert.equal(made.length, 1, 'the conversion should leave one run waiting');
    const run = path.join(ownPending, made[0] ?? '');
    await ageTree(run, 40);

    await $('button[aria-label="App settings"]').click();
    await $('[role="dialog"]').waitForDisplayed({ timeout: 30_000 });
    await $('[role="tab"]=Processing').click();
    const panel = $('[role="tabpanel"]');
    await panel.$('button=Delete…').waitForDisplayed({ timeout: 30_000 });
    assert.match(await panel.getText(), /\d+ books? in \d+ conversions?, /u);

    // Asking what would go deletes nothing.
    await panel.$('button=Delete…').click();
    const question = panel.$('[role="group"]');
    await question.waitForDisplayed({ timeout: 30_000 });
    assert.match(
      await question.getText(),
      /^Delete 1 conversion \(2 books, .+\) that nothing has touched in more than 30 days\?/u,
    );
    assert.ok((await runFolders(ownPending)).includes(path.basename(run)));

    // Only a yes does, and it takes away just that conversion.
    await question.$('button=Delete').click();
    await panel.$('p*=Deleted 1 conversion').waitForDisplayed({ timeout: 30_000 });
    assert.ok(!(await runFolders(ownPending)).includes(path.basename(run)));
    assert.deepEqual(
      new Set(await runFolders(ownPending)),
      before,
      'what waited before this test is still there',
    );

    await browser.keys('Escape');
  });
});
