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

/** What the page announced as changed since a choice was made through `chooseLanguage`. */
const announced = 'announcedLanguages';

/**
 * Picks a language in the dialog. On CI the click on the option now and then does not reach the page
 * as a change at all (the select announces nothing and keeps its value), so the click is made again
 * until the page announces it, and says so when it had to be. What was announced is kept for the
 * message of a choice that still did not take.
 */
async function chooseLanguage(value: string): Promise<void> {
  await browser.execute((key: string) => {
    const heard: string[] = [];
    Reflect.set(window, key, heard);
    document.addEventListener(
      'change',
      (event) => heard.push((event.target as HTMLSelectElement).value),
      true,
    );
  }, announced);
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await $('[role="dialog"] select').selectByAttribute('value', value);
    const heard = await browser.execute(
      (key: string) => Reflect.get(window, key) as string[],
      announced,
    );
    if (heard.length > 0) return;
    console.warn(
      `the language select announced nothing after attempt ${attempt} of choosing ${value}`,
    );
  }
}

/**
 * Waits for the dialog to be titled `title`; if it never is, says what the dialog held, what the
 * select announced, and what the file holds, which tells where a choice was lost.
 */
async function waitForDialogTitle(title: string, file: string): Promise<void> {
  const dialog = $('[role="dialog"]');
  try {
    await browser.waitUntil(
      async () => (await dialog.isExisting()) && (await dialog.$('h2').getText()) === title,
      { timeout: 30_000 },
    );
  } catch (error) {
    const held = await browser.execute((key: string) => {
      const open = document.querySelector('[role="dialog"]');
      return open === null
        ? 'no dialog'
        : JSON.stringify({
            text: open.textContent,
            chosen: open.querySelector('select')?.value,
            announced: Reflect.get(window, key) as unknown,
            lang: document.documentElement.lang,
          });
    }, announced);
    const kept = existsSync(file) ? await readFile(file, 'utf8') : 'no file';
    throw new Error(
      `the dialog should be titled "${title}", and it held: ${held}; the file holds: ${kept}`,
      { cause: error },
    );
  }
}

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
    await dialog.waitForDisplayed({ timeout: 30_000 });
    assert.equal(await dialog.$('h2').getText(), 'App settings');

    // Choosing Portuguese changes the dialog at once and keeps the choice.
    await chooseLanguage('pt-BR');
    await waitForDialogTitle('Configurações do app', file);
    await browser.waitUntil(
      async () => existsSync(file) && (await readKept(file)).language === 'pt-BR',
      { timeout: 30_000, timeoutMsg: 'the app settings file did not get the language' },
    );
    assert.equal((await readKept(file)).version, 1);
    assert.equal(await $('html').getAttribute('lang'), 'pt-BR');

    // Escape puts the dialog away, and the gear has the focus again.
    await browser.keys('Escape');
    await dialog.waitForExist({ reverse: true, timeout: 30_000 });
    await browser.waitUntil(
      async () => await $('button[aria-label="Configurações do app"]').isFocused(),
      { timeout: 30_000, timeoutMsg: 'the gear should get the focus back' },
    );

    // Opened again, as a launch does, the window is read in the kept language.
    await browser.refresh();
    await $('h1=Fila').waitForDisplayed({ timeout: 30_000 });
    await $('button[aria-label="Configurações do app"]').waitForDisplayed({ timeout: 30_000 });
    assert.equal(await $('html').getAttribute('lang'), 'pt-BR');

    // Following the system again puts it back, and leaves the window as it was found.
    await $('button[aria-label="Configurações do app"]').click();
    await $('[role="dialog"]').waitForDisplayed({ timeout: 30_000 });
    await chooseLanguage('system');
    await waitForDialogTitle('App settings', file);
    // The queue behind the dialog is in English again.
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });
    await browser.waitUntil(async () => (await readKept(file)).language === 'system', {
      timeout: 30_000,
      timeoutMsg: 'the app settings file did not go back to following the system',
    });
    await browser.keys('Escape');
  });
});
