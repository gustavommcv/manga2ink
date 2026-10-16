import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { $, browser } from '@wdio/globals';

interface KeptAppSettings {
  readonly version: number;
  readonly language: string;
}

const readKept = async (file: string): Promise<KeptAppSettings> =>
  JSON.parse(await readFile(file, 'utf8')) as KeptAppSettings;

describe('packaged app settings', () => {
  it('keeps the language in a file of its own, and the window reads it again at launch', async () => {
    const userData = await browser.electron.execute((electron) => electron.app.getPath('userData'));
    const file = path.join(userData, 'app-settings.json');
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });
    // Opening the app changes nothing, so nothing is written.
    assert.equal(existsSync(file), false, 'a first launch should leave no app settings file');

    // The gear on the title bar opens the dialog, in the language of the system (English here).
    await $('button[aria-label="App settings"]').click();
    const dialog = $('[role="dialog"]');
    await dialog.waitForDisplayed({ timeout: 15_000 });
    assert.equal(await dialog.$('h2').getText(), 'App settings');

    // Choosing Portuguese changes the dialog at once and keeps the choice.
    await dialog.$('select').selectByAttribute('value', 'pt-BR');
    await dialog.$('h2=Configurações do app').waitForDisplayed({ timeout: 15_000 });
    await browser.waitUntil(
      async () => existsSync(file) && (await readKept(file)).language === 'pt-BR',
      { timeout: 15_000, timeoutMsg: 'the app settings file did not get the language' },
    );
    assert.equal((await readKept(file)).version, 1);
    assert.equal(await $('html').getAttribute('lang'), 'pt-BR');
    // The queue behind the dialog is in Portuguese too.
    await $('h1=Fila').waitForDisplayed({ timeout: 15_000 });

    // Escape puts the dialog away, and the gear has the focus again.
    await browser.keys('Escape');
    await dialog.waitForExist({ reverse: true, timeout: 15_000 });
    await browser.waitUntil(
      async () => await $('button[aria-label="Configurações do app"]').isFocused(),
      { timeout: 15_000, timeoutMsg: 'the gear should get the focus back' },
    );

    // Opened again, as a launch does, the window is read in the kept language.
    await browser.refresh();
    await $('h1=Fila').waitForDisplayed({ timeout: 30_000 });
    await $('button[aria-label="Configurações do app"]').waitForDisplayed({ timeout: 15_000 });
    assert.equal(await $('html').getAttribute('lang'), 'pt-BR');

    // Following the system again puts it back, and leaves the window as it was found.
    await $('button[aria-label="Configurações do app"]').click();
    await $('[role="dialog"]').waitForDisplayed({ timeout: 15_000 });
    await $('[role="dialog"] select').selectByAttribute('value', 'system');
    try {
      await browser.waitUntil(
        async () => (await $('[role="dialog"] h2').getText()) === 'App settings',
        { timeout: 15_000 },
      );
    } catch (error) {
      // Says what the dialog shows instead, so that a failure can be read from the log.
      const shown = await $('[role="dialog"]').getText();
      throw new Error(`The dialog did not come back to English. It says: ${shown}`, {
        cause: error,
      });
    }
    await $('h1=Queue').waitForDisplayed({ timeout: 15_000 });
    await browser.waitUntil(async () => (await readKept(file)).language === 'system', {
      timeout: 15_000,
      timeoutMsg: 'the app settings file did not go back to following the system',
    });
    await browser.keys('Escape');
  });
});
