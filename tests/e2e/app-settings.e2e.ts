import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { $, browser } from '@wdio/globals';
import { Key } from 'webdriverio';

interface KeptAppSettings {
  readonly version: number;
  readonly language: string;
  readonly notifyWhenDone?: boolean;
  readonly keepAwake?: boolean;
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

/** Whether the checkbox that a label names is checked, as the page says it. */
const checked = (label: string): Promise<boolean> =>
  browser.execute((text: string) => {
    const named = [...document.querySelectorAll('label')].find((each) => each.textContent === text);
    return document.getElementById(named?.htmlFor ?? '')?.getAttribute('aria-checked') === 'true';
  }, label);

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

    // The page is in the theme the app starts with, which the stylesheet selects its colors by, and
    // the dialog offers the themes there are (ADR 0066).
    assert.equal(await $('html').getAttribute('data-theme'), 'dark');
    assert.equal(await dialog.$('option=Dark (graphite)').isExisting(), true);

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

  it('keeps what a queue does in the same file: telling and keeping awake are on until they are turned off', async () => {
    const userData = await browser.electron.execute((electron) => electron.app.getPath('userData'));
    const file = path.join(userData, 'app-settings.json');
    const notify = 'Tell me when a long conversion ends';
    const awake = 'Keep the computer awake while converting';
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });
    await $('button[aria-label="App settings"]').click();
    await $('[role="dialog"]').waitForDisplayed({ timeout: 30_000 });
    try {
      await $('[role="tab"]=Processing').click();
      const panel = $('[role="tabpanel"]');
      await panel.$(`label=${notify}`).waitForDisplayed({ timeout: 30_000 });
      assert.equal(await checked(notify), true);
      assert.equal(await checked(awake), true);

      // Turning one off keeps only that one off, in the file the language is in. The page shows it
      // once the main process has answered, which is a moment after the file is written.
      await panel.$(`label=${notify}`).click();
      await browser.waitUntil(
        async () => existsSync(file) && (await readKept(file)).notifyWhenDone === false,
        { timeout: 30_000, timeoutMsg: 'the app settings file did not get the choice' },
      );
      assert.equal((await readKept(file)).keepAwake, true);
      await browser.waitUntil(async () => !(await checked(notify)), {
        timeout: 30_000,
        timeoutMsg: 'the choice was kept but the checkbox was not shown unchecked',
      });
      assert.equal(await checked(awake), true);

      // And turning it on again puts it back, so the next tests find the app as it began.
      await panel.$(`label=${notify}`).click();
      await browser.waitUntil(async () => (await readKept(file)).notifyWhenDone === true, {
        timeout: 30_000,
        timeoutMsg: 'the app settings file did not get the choice back',
      });
      await browser.waitUntil(async () => await checked(notify), {
        timeout: 30_000,
        timeoutMsg: 'the choice was put back but the checkbox was not shown checked',
      });
    } finally {
      // Whatever happened, the dialog is put away, so that a failure here is not one in the next test.
      await browser.keys('Escape');
    }
  });

  it('keeps its size from one tab to the next, and stays under the title bar', async () => {
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });
    await $('button[aria-label="App settings"]').click();
    await $('[role="dialog"]').waitForDisplayed({ timeout: 30_000 });

    const sizes: { width: number; height: number; top: number }[] = [];
    for (const tab of ['Interface', 'Updates', 'About']) {
      await $(`[role="tab"]=${tab}`).click();
      await $('[role="tabpanel"]').waitForDisplayed({ timeout: 30_000 });
      sizes.push(
        await browser.execute(() => {
          const box = document.querySelector('[role="dialog"]')?.getBoundingClientRect();
          return {
            width: Math.round(box?.width ?? 0),
            height: Math.round(box?.height ?? 0),
            top: Math.round(box?.top ?? 0),
          };
        }),
      );
    }

    // The box does not change with what is in it, and the title bar (48px) is left alone.
    assert.deepEqual(sizes[1], sizes[0]);
    assert.deepEqual(sizes[2], sizes[0]);
    assert.ok(sizes[0] !== undefined && sizes[0].width > 0 && sizes[0].top >= 48);
    await browser.keys('Escape');
  });

  it('opens by the keys of the system, Ctrl+, or Cmd+, on a Mac, and the gear says so', async () => {
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });
    const gear = $('button[aria-label="App settings"]');
    assert.equal(
      await gear.getAttribute('aria-keyshortcuts'),
      process.platform === 'darwin' ? 'Meta+,' : 'Control+,',
    );

    // `Key.Ctrl` is Command on a Mac, where the shortcut is Cmd+,.
    await browser.keys([Key.Ctrl, ',']);

    await $('[role="dialog"]').waitForDisplayed({ timeout: 30_000 });
    await browser.keys('Escape');
    await $('[role="dialog"]').waitForExist({ reverse: true, timeout: 30_000 });
  });
});
