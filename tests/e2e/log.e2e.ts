import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { $, browser } from '@wdio/globals';

describe('packaged log', () => {
  it('records how the app started and what it says went wrong, and its folder opens from the About tab', async () => {
    const version = await browser.electron.execute((electron) => electron.app.getVersion());
    const userData = await browser.electron.execute((electron) => electron.app.getPath('userData'));
    const file = path.join(userData, 'logs', 'mangabound.log');
    const logged = async (): Promise<string> => (existsSync(file) ? readFile(file, 'utf8') : '');
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });

    // The first line says how the app started, with the time and the level in front of it.
    await browser.waitUntil(async () => (await logged()).includes(' INFO Mangabound '), {
      timeout: 30_000,
      timeoutMsg: 'The log did not say the app had started.',
    });
    assert.match(
      await logged(),
      new RegExp(
        `^\\d{4}-\\d\\d-\\d\\dT[\\d:.]+Z INFO Mangabound ${version.replaceAll('.', '\\.')} started \\(packaged, Electron \\S+, \\S+ \\S+\\)\\.$`,
        'mu',
      ),
    );

    await $('button[aria-label="App settings"]').click();
    await $('[role="dialog"]').waitForDisplayed({ timeout: 30_000 });
    await $('[role="tab"]=About').click();
    const panel = $('[role="tabpanel"]');
    await panel.waitForDisplayed({ timeout: 30_000 });

    // What the main process writes on its terminal when something goes wrong is in the log too.
    const openPath = await browser.electron.mock('shell', 'openPath');
    await openPath.mockResolvedValueOnce('Failed to open path');
    await panel.$('button*=Open the data folder').click();
    await panel
      .$('p=The folder could not be opened. Open it from your file manager instead.')
      .waitForDisplayed({ timeout: 30_000 });
    await browser.waitUntil(
      async () =>
        (await logged()).includes(
          'ERROR The data folder of the app could not be opened. Failed to open path',
        ),
      { timeout: 30_000, timeoutMsg: 'What went wrong was not in the log.' },
    );

    // The folder of the log is opened by its name, and is there to be opened.
    await openPath.mockResolvedValue('');
    await panel.$('button*=Open the logs folder').click();
    await browser.waitUntil(() => openPath.mock.calls.length === 2, {
      timeout: 30_000,
      timeoutMsg: 'The logs folder button did not open a folder.',
    });
    assert.deepEqual(openPath.mock.calls[1], [path.join(userData, 'logs')]);

    await browser.keys('Escape');
  });
});
