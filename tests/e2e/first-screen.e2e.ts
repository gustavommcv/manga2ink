import assert from 'node:assert/strict';

import { $, browser } from '@wdio/globals';

// What the app opens at: `defaultWindowSize` in src/domain/window-state.ts, which a unit test keeps
// at these numbers. The window of this run is smaller (there is no screen to open it on), and one on a
// screen that is not as tall cannot be as tall, so what is measured is the height the first screen
// is, which a window of that height holds, not the height of the window this run happens to have.
const opensAt = { height: 760, width: 1180 };
// Where the queue and its panel are side by side, as they are at the size the app opens at.
const twoColumnsFrom = 1024;

describe('packaged application on its first screen', () => {
  it('is no taller than the window it opens at holds, so it opens without scrolling', async () => {
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });
    await browser.electron.execute(
      (electron, width: number, height: number) => {
        electron.BrowserWindow.getAllWindows()[0]?.setSize(width, height);
      },
      opensAt.width,
      opensAt.height,
    );
    await browser.waitUntil(
      async () => (await browser.execute(() => innerWidth)) >= twoColumnsFrom,
      {
        timeoutMsg: `the window did not get ${String(twoColumnsFrom)} px wide, where the panel is beside the queue`,
      },
    );

    // The queue with nothing in it, the panel beside it being the tallest part (ADR 0080): the page is
    // as tall as what it holds, and what is over it is the title bar.
    const measured = await browser.execute(() => {
      const area = document.querySelector('[data-slot="page"]');
      const page = area?.querySelector('main');
      if (area === null || page === null || page === undefined)
        throw new Error('The page is not drawn.');
      return { bar: area.getBoundingClientRect().top, page: page.getBoundingClientRect().height };
    });
    const needed = Math.ceil(measured.bar + measured.page);
    assert.ok(
      needed <= opensAt.height,
      `the first screen needs a window ${String(needed)} px tall, ${String(needed - opensAt.height)} px more than the ${String(opensAt.height)} px it opens at`,
    );
  });
});
