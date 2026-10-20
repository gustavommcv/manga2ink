import assert from 'node:assert/strict';

import { $, browser } from '@wdio/globals';

// What the app opens at: `defaultWindowSize` in src/domain/window-state.ts, which a unit test keeps
// at these numbers. The window of this run is smaller (there is no screen to open it on), so it is
// given the size a person's opens at.
const opensAt = [1180, 760] as const;

describe('packaged application on its first screen', () => {
  it('fits in the window it opens at, without scrolling', async () => {
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });
    await browser.electron.execute(
      (electron, width: number, height: number) => {
        electron.BrowserWindow.getAllWindows()[0]?.setSize(width, height);
      },
      ...opensAt,
    );
    await browser.waitUntil(async () => (await browser.execute(() => innerHeight)) === opensAt[1], {
      timeoutMsg: 'the window did not take the size it opens at',
    });

    // The area under the title bar scrolls when what it holds is taller than it is: the first screen
    // is the queue with nothing in it, the panel beside it being the tallest part (ADR 0080).
    const overflow = await browser.execute(() => {
      const area = document.querySelector('[data-slot="page"]');
      if (area === null) throw new Error('The page is not drawn.');
      return { client: area.clientHeight, scroll: area.scrollHeight };
    });
    assert.ok(
      overflow.scroll <= overflow.client,
      `the first screen is ${String(overflow.scroll - overflow.client)} px taller than its window (${String(overflow.scroll)} of ${String(overflow.client)} px)`,
    );
  });
});
