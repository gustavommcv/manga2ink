import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { $, $$, browser } from '@wdio/globals';

import { resetQueue, saveAllBooks, setFormat } from './support';

const temporaryDirectories: string[] = [];

after(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

/**
 * Binds a fixture as it arrives, with nothing assigned by hand, and returns the names of the books
 * that were saved. The row says the volumes mangabind found, and Process goes on from there.
 */
async function bindAsItArrives(fixture: string, series: string): Promise<readonly string[]> {
  const testRoot = await mkdtemp(path.join(os.tmpdir(), 'manga2ink-volume-units-e2e-'));
  temporaryDirectories.push(testRoot);
  const inputPath = path.join(testRoot, series);
  const libraryPath = path.join(testRoot, 'library');
  await cp(path.resolve('tests', 'fixtures', 'e2e', fixture, series), inputPath, {
    recursive: true,
  });
  await mkdir(libraryPath);

  const openDialog = await browser.electron.mock('dialog', 'showOpenDialog');
  await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [inputPath] });
  await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: [libraryPath] });

  await resetQueue();
  await setFormat('EPUB');
  await $('button=Folder').click();
  await $('span=2 volumes').waitForDisplayed({ timeout: 30_000 });
  assert.match(await $('main').getText(), /grouped from names/u);

  // Both volumes start at chapter 1, and that is no reason to stop: each says its own volume.
  await $('button=Process 1 item').click();
  await $('h1=2 books ready').waitForDisplayed({ timeout: 120_000 });
  assert.equal(await $$('[role="alert"]').length, 0);
  await saveAllBooks();

  const saved = (await readdir(libraryPath)).filter((name) => name.endsWith('.epub')).sort();
  for (const name of saved) {
    const bytes = await readFile(path.join(libraryPath, name));
    assert.ok(bytes.length > 1_024);
    assert.equal(bytes.subarray(0, 2).toString('ascii'), 'PK');
  }
  // The folder names said everything, so nothing was written into the source.
  await assert.rejects(readFile(path.join(inputPath, 'mangabind.json'), 'utf8'));
  return saved;
}

describe('packaged series kept with a unit for each volume', () => {
  it('binds a series kept as one folder for each volume, though every volume is chapter 1', async () => {
    assert.deepEqual(await bindAsItArrives('manga-volume-units', 'Volume Units'), [
      'Volume Units - Vol.01.epub',
      'Volume Units - Vol.02.epub',
    ]);
  });

  it('binds a series with a folder of chapters in each volume, numbered again in each', async () => {
    assert.deepEqual(await bindAsItArrives('manga-volume-folders', 'Volume Folders'), [
      'Volume Folders - Vol.01.epub',
      'Volume Folders - Vol.02.epub',
    ]);
  });
});
