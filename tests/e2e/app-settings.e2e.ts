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
  readonly theme?: string;
  readonly parallelConversions?: string | number;
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

/**
 * The theme the system is set to, which an app that follows it comes to (ADR 0070). It says it only
 * while the app follows the system: once a theme is chosen, Electron's `shouldUseDarkColors` answers
 * for that theme, so a test asks it before it chooses anything and keeps the answer.
 */
const systemTheme = (): Promise<'dark' | 'light'> =>
  browser.electron.execute((electron) =>
    electron.nativeTheme.shouldUseDarkColors ? ('dark' as const) : ('light' as const),
  );

/**
 * Picks a theme in the dialog, and waits for the choice to be kept in the file and the page to be in
 * the theme it comes to (`pageTheme`: the theme itself, or what the system is set to for the choice to
 * follow it). As with the language, the click on the option now and then does not reach the page as a
 * change, and the select keeps its value, so it is made again, and said when it had to be. The file is
 * what says it arrived: the page cannot, when the choice is the theme the system already has (the
 * light one, on a system that is light). A choice that still did not take says what the page and the
 * file held.
 */
async function chooseTheme(file: string, value: string, pageTheme: string = value): Promise<void> {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await $('select[id$="-theme"]').selectByAttribute('value', value);
    try {
      await browser.waitUntil(
        async () =>
          existsSync(file) &&
          (await readKept(file)).theme === value &&
          (await $('html').getAttribute('data-theme')) === pageTheme,
        { timeout: 5_000 },
      );
      return;
    } catch {
      console.warn(`the theme select did not keep ${value} after attempt ${attempt}`);
    }
  }
  const held = await browser.execute(() =>
    JSON.stringify({
      chosen: document.querySelector<HTMLSelectElement>('select[id$="-theme"]')?.value,
      theme: document.documentElement.dataset.theme,
    }),
  );
  const kept = existsSync(file) ? await readFile(file, 'utf8') : 'no file';
  throw new Error(
    `the theme ${value} was not kept, and the page held: ${held}; the file holds: ${kept}`,
  );
}

/**
 * Picks how many conversions run at once, and waits for the file to hold it. As with the language and
 * the theme, the choice now and then does not reach the page as a change, so it is made again, and
 * said when it had to be.
 */
async function chooseParallel(file: string, value: string, kept: string | number): Promise<void> {
  const id = await $('label=Parallel conversions').getAttribute('for');
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await $(`[id="${id}"]`).selectByAttribute('value', value);
    try {
      await browser.waitUntil(async () => (await readKept(file)).parallelConversions === kept, {
        timeout: 5_000,
      });
      return;
    } catch {
      console.warn(
        `the select of parallel conversions did not keep ${value} after attempt ${attempt}`,
      );
    }
  }
  throw new Error(`the app settings file did not get ${value} conversions at once`);
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

    // The app starts looking as the system does (ADR 0070): the page is in the theme the system comes
    // to, which the stylesheet selects its colors by, and the dialog offers the themes there are.
    assert.equal(await $('html').getAttribute('data-theme'), await systemTheme());
    assert.equal(await dialog.$('option=Automatic (system theme)').isExisting(), true);
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

  it('keeps how many conversions run at once in the same file, and the app’s own count until a number is chosen', async () => {
    const userData = await browser.electron.execute((electron) => electron.app.getPath('userData'));
    const file = path.join(userData, 'app-settings.json');
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });
    await $('button[aria-label="App settings"]').click();
    await $('[role="dialog"]').waitForDisplayed({ timeout: 30_000 });
    try {
      await $('[role="tab"]=Processing').click();
      await $('label=Parallel conversions').waitForDisplayed({ timeout: 30_000 });
      const id = await $('label=Parallel conversions').getAttribute('for');
      assert.equal(await $(`[id="${id}"]`).getValue(), 'automatic');
      // The app's own count says what it comes to on this computer, and one is always on offer: a
      // small computer (a runner) may be asked for no more than that.
      const firstOption = await browser.execute(
        (select: string | null) =>
          (document.getElementById(select ?? '') as HTMLSelectElement | null)?.options[0]
            ?.textContent,
        id,
      );
      assert.match(String(firstOption), /^Automatic \(\d+ on this computer\)$/u);

      // A number is kept as a number, next to the other choices and without touching them.
      await chooseParallel(file, '1', 1);
      const kept = await readKept(file);
      assert.equal(kept.keepAwake, true);
      assert.equal(kept.notifyWhenDone, true);
      assert.equal(kept.theme, 'system');
      assert.equal(await $(`[id="${id}"]`).getValue(), '1');

      // And the app's own count puts it back, so the next tests find the app as it began.
      await chooseParallel(file, 'automatic', 'automatic');
      assert.equal(await $(`[id="${id}"]`).getValue(), 'automatic');
    } finally {
      // Whatever happened, the dialog is put away, so that a failure here is not one in the next test.
      await browser.keys('Escape');
    }
  });

  it('changes the theme at once, keeps it, and the window, the system and the page served all follow it', async () => {
    const userData = await browser.electron.execute((electron) => electron.app.getPath('userData'));
    const file = path.join(userData, 'app-settings.json');
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });
    await $('button[aria-label="App settings"]').click();
    await $('[role="dialog"]').waitForDisplayed({ timeout: 30_000 });
    // Asked first, while the app still follows the system, and kept: after a theme is chosen the
    // system answers for that theme.
    const system = await systemTheme();
    try {
      assert.equal(await $('html').getAttribute('data-theme'), system);

      // The light theme: the page is in it as soon as it is chosen, and the choice is in the file.
      await chooseTheme(file, 'light');

      // What the main process does with it (ADR 0067): it paints the window, gives what the system
      // draws the same scheme, and serves the page already in the theme, so that the next launch does
      // not open in the other one for a moment.
      const colors = await browser.electron.execute((electron) => ({
        background: electron.BrowserWindow.getAllWindows()[0]?.getBackgroundColor(),
        scheme: electron.nativeTheme.themeSource,
      }));
      assert.equal(colors.background?.toLowerCase(), '#f5f5f8');
      assert.equal(colors.scheme, 'light');
      // Asked by the main process: the scheme gives the page no fetch of its own, on purpose.
      const served = await browser.electron.execute(async (electron) => {
        const [window] = electron.BrowserWindow.getAllWindows();
        const response = await electron.net.fetch(window?.webContents.getURL() ?? '');
        return await response.text();
      });
      assert.match(served, /<html[^>]*data-theme="light"/u);

      // The dark theme is the same the other way round, whatever the system is set to.
      await chooseTheme(file, 'dark');
      assert.equal(
        await browser.electron.execute((electron) => electron.nativeTheme.themeSource),
        'dark',
      );

      // And looking as the system does gives the system its own setting back, and the window and the
      // page what it comes to (ADR 0070); the file holds the choice, not what it comes to.
      await chooseTheme(file, 'system', system);
      const followed = await browser.electron.execute((electron) => ({
        background: electron.BrowserWindow.getAllWindows()[0]?.getBackgroundColor(),
        source: electron.nativeTheme.themeSource,
      }));
      assert.equal(followed.source, 'system');
      assert.equal(followed.background?.toLowerCase(), system === 'dark' ? '#121214' : '#f5f5f8');
      const servedAgain = await browser.electron.execute(async (electron) => {
        const [window] = electron.BrowserWindow.getAllWindows();
        const response = await electron.net.fetch(window?.webContents.getURL() ?? '');
        return await response.text();
      });
      assert.match(servedAgain, new RegExp(`<html[^>]*data-theme="${system}"`, 'u'));

      // The system changes its setting while the app runs. Asking Electron for the other scheme is
      // what a change of the system's looks like to the app: the window is painted again by the main
      // process, and the page, asking `prefers-color-scheme`, changes by itself.
      const other = system === 'dark' ? 'light' : 'dark';
      await browser.electron.execute((electron, source: 'dark' | 'light') => {
        electron.nativeTheme.themeSource = source;
      }, other);
      await browser.waitUntil(async () => (await $('html').getAttribute('data-theme')) === other, {
        timeout: 30_000,
        timeoutMsg: 'the page did not follow the change of the system',
      });
      const changed = await browser.electron.execute((electron) =>
        electron.BrowserWindow.getAllWindows()[0]?.getBackgroundColor(),
      );
      assert.equal(changed?.toLowerCase(), other === 'dark' ? '#121214' : '#f5f5f8');
      await browser.electron.execute((electron) => {
        electron.nativeTheme.themeSource = 'system';
      });
      await browser.waitUntil(async () => (await $('html').getAttribute('data-theme')) === system, {
        timeout: 30_000,
        timeoutMsg: 'the page did not follow the system back',
      });
    } finally {
      // The next tests find the app as it began, looking as the system does, and the dialog is put
      // away whatever happened.
      try {
        await chooseTheme(file, 'system', system);
      } finally {
        await browser.keys('Escape');
      }
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
