import assert from 'node:assert/strict';

import { $, browser } from '@wdio/globals';

/** What the Updates tab can say once the check has come back: the things a check can come to. */
const outcome =
  /You have the latest version \(|A new version is available: |Could not reach GitHub|GitHub did not answer in time|GitHub is rate-limiting|GitHub returned an unexpected/u;

describe('packaged Updates tab', () => {
  it('looks for nothing by itself, and asks GitHub through the main process when the button is clicked', async () => {
    const version = await browser.electron.execute((electron) => electron.app.getVersion());
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });
    await $('button[aria-label="App settings"]').click();
    await $('[role="dialog"]').waitForDisplayed({ timeout: 30_000 });
    await $('[role="tab"]=Updates').click();
    const panel = $('[role="tabpanel"]');
    await panel.waitForDisplayed({ timeout: 30_000 });

    // Nothing was asked yet: the tab says the version that runs and has a button, and no result.
    const before = await panel.getText();
    assert.ok(before.includes(`Installed version\n${version}`), before);
    assert.doesNotMatch(before, outcome);

    await panel.$('button=Check for updates').click();

    // Whatever the network does (the runner may be offline or limited by GitHub), the answer is one of
    // the sentences of the tab, and the button can be pressed again.
    await browser.waitUntil(async () => outcome.test(await panel.getText()), {
      timeout: 30_000,
      timeoutMsg: 'the check for updates did not come back with an answer',
    });
    assert.ok(await panel.$('button=Check for updates').isEnabled());
    await browser.keys('Escape');
  });
});
