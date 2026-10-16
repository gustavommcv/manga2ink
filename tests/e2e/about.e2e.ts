import assert from 'node:assert/strict';

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

    await browser.keys('Escape');
  });
});
