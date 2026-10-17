import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { $, $$, browser } from '@wdio/globals';

import { recordProgress, reportedProgress, resetQueue } from './support';

const temporaryDirectories: string[] = [];

after(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const openWindows = (): Promise<number> =>
  browser.electron.execute((electron) => electron.BrowserWindow.getAllWindows().length);

describe('packaged window closed during a conversion', () => {
  before(function () {
    // On macOS closing the window leaves the app and its conversion running, so nothing is asked.
    if (process.platform === 'darwin') this.skip();
  });

  it('asks first, and stays open when the person would rather keep converting', async () => {
    const testRoot = await mkdtemp(path.join(os.tmpdir(), 'mangabound-leaving-e2e-'));
    temporaryDirectories.push(testRoot);
    const fixture = path.resolve(
      'tests',
      'fixtures',
      'e2e',
      'manga-named-volumes',
      'Named Volumes',
    );
    // Several items, so that the conversion is still going when the window is asked to close.
    const folders: string[] = [];
    for (let n = 1; n <= 8; n += 1) {
      const folder = path.join(testRoot, `Series ${String(n)}`);
      await mkdir(folder);
      await cp(fixture, path.join(folder, 'Named Volumes'), { recursive: true });
      folders.push(path.join(folder, 'Named Volumes'));
    }
    const openDialog = await browser.electron.mock('dialog', 'showOpenDialog');
    await openDialog.mockResolvedValueOnce({ canceled: false, filePaths: folders });
    const messageBox = await browser.electron.mock('dialog', 'showMessageBox');
    await messageBox.mockResolvedValue({ response: 0, checkboxChecked: false });

    await resetQueue();
    await $('button=Folder').click();
    await browser.waitUntil(async () => (await $$('span=2 volumes').length) === folders.length, {
      timeout: 120_000,
      timeoutMsg: 'The folders were not all read.',
    });
    await recordProgress();
    await $(`button=Process ${String(folders.length)} items`).click();

    // The window is asked to close while the books are being made: once the first item has begun,
    // not before, or the question would be asked of a run that has not started a conversion yet.
    await browser.waitUntil(async () => (await reportedProgress()).length > 0, {
      timeout: 120_000,
      timeoutMsg: 'The conversion did not begin.',
    });
    await browser.electron.execute((electron) => {
      electron.BrowserWindow.getAllWindows()[0]?.close();
    });
    await browser.waitUntil(() => messageBox.mock.calls.length >= 1, {
      timeout: 30_000,
      timeoutMsg: 'Closing the window during a conversion asked nothing.',
    });

    const options = messageBox.mock.calls[0]?.find(
      (argument): argument is { message: string; detail: string; buttons: string[] } =>
        typeof argument === 'object' && argument !== null && 'message' in argument,
    );
    assert.equal(options?.message, 'A conversion is still running.');
    assert.equal(options.detail, 'If you close Mangabound now, it will be lost.');
    assert.deepEqual(options.buttons, ['Keep converting', 'Close anyway']);
    // They chose to keep converting: the window is still there, and the conversion goes on.
    assert.equal(await openWindows(), 1);
    await $('h1*=books ready').waitForDisplayed({ timeout: 240_000 });
  });
});
