import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { $, browser } from '@wdio/globals';

/** The width of each picture of the page that has loaded, by what the page says it is. */
const loadedPictures = (): Promise<Record<string, number>> =>
  browser.execute(() =>
    Object.fromEntries(
      [...document.querySelectorAll('img')].map((picture) => [
        picture.closest('header') === null ? 'about' : 'titlebar',
        picture.complete ? picture.naturalWidth : 0,
      ]),
    ),
  );

describe('packaged About tab', () => {
  it('draws the logo and the version, and opens a place through the system, never an address of the page', async () => {
    const version = await browser.electron.execute((electron) => electron.app.getVersion());
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });

    // The title bar has the logo, so the page's policy lets the pictures inside the bundle load.
    assert.deepEqual(await loadedPictures(), { titlebar: 48 });

    await $('button[aria-label="App settings"]').click();
    await $('[role="dialog"]').waitForDisplayed({ timeout: 30_000 });
    await $('[role="tab"]=About').click();
    const panel = $('[role="tabpanel"]');
    await panel.waitForDisplayed({ timeout: 30_000 });

    assert.match(
      await panel.getText(),
      new RegExp(`Version ${version.replaceAll('.', '\\.')}`, 'u'),
    );
    assert.deepEqual(await loadedPictures(), { titlebar: 48, about: 192 });

    // The tools are the ones the lock file pins, each said with its version and that it passed.
    const lock = JSON.parse(await readFile(path.resolve('toolchain.lock.json'), 'utf8')) as {
      tools: Record<string, { pin: { releaseTag: string } }>;
    };
    const tools = $('dl*=mangabind');
    await tools.waitForDisplayed({ timeout: 30_000 });
    for (const name of ['mangabind', 'mangapress']) {
      const tag = lock.tools[name]?.pin.releaseTag.replace(/^v/u, '');
      assert.match(
        await tools.getText(),
        new RegExp(`${name}\\s+v${tag?.replaceAll('.', '\\.') ?? ''} · verified`, 'u'),
      );
    }

    const openExternal = await browser.electron.mock('shell', 'openExternal');
    await openExternal.mockResolvedValue(undefined);
    await panel.$('button=Support the project').click();
    await browser.waitUntil(() => openExternal.mock.calls.length === 1, {
      timeout: 30_000,
      timeoutMsg: 'The support button did not open a page.',
    });
    assert.deepEqual(openExternal.mock.calls[0], ['https://buymeacoffee.com/gusmonnerat']);

    await panel.$('button=User guide').click();
    await browser.waitUntil(() => openExternal.mock.calls.length === 2, {
      timeout: 30_000,
      timeoutMsg: 'The guide button did not open a page.',
    });
    assert.deepEqual(openExternal.mock.calls[1], ['https://gustavommcv.github.io/mangabound/']);

    await panel.$('button=Release notes').click();
    await browser.waitUntil(() => openExternal.mock.calls.length === 3, {
      timeout: 30_000,
      timeoutMsg: 'The release notes button did not open a page.',
    });
    assert.deepEqual(openExternal.mock.calls[2], [
      `https://github.com/gustavommcv/mangabound/releases/tag/v${version}`,
    ]);

    // The diagnostics are put on the clipboard, in English, with the versions and no path.
    await browser.electron.execute((electron) => electron.clipboard.writeText(''));
    await panel.$('button*=Copy diagnostics').click();
    await panel.$('p=Copied. Paste it into your report.').waitForDisplayed({ timeout: 30_000 });
    const diagnostics = await browser.electron.execute((electron) => electron.clipboard.readText());
    assert.match(
      diagnostics,
      new RegExp(`^Mangabound ${version.replaceAll('.', '\\.')} \\(packaged\\)`, 'u'),
    );
    assert.match(diagnostics, /^Working folder: the default$/mu);
    assert.match(diagnostics, /^ {2}mangabind v\d+\.\d+\.\d+: verified$/mu);
    assert.match(diagnostics, /^ {2}mangapress v\d+\.\d+\.\d+: verified$/mu);
    const userData = await browser.electron.execute((electron) => electron.app.getPath('userData'));
    assert.ok(!diagnostics.includes(userData), 'the diagnostics should not say where the data is');
    assert.ok(
      !diagnostics.includes(os.homedir()),
      'the diagnostics should not name the home folder',
    );

    // The data folder is opened by the system, by its name and not by a path of the page.
    const openPath = await browser.electron.mock('shell', 'openPath');
    await openPath.mockResolvedValue('');
    await panel.$('button*=Open the data folder').click();
    await browser.waitUntil(() => openPath.mock.calls.length === 1, {
      timeout: 30_000,
      timeoutMsg: 'The data folder button did not open a folder.',
    });
    assert.deepEqual(openPath.mock.calls[0], [userData]);

    await browser.keys('Escape');
  });
});
