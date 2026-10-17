import assert from 'node:assert/strict';

import { $, browser } from '@wdio/globals';

interface Reply {
  readonly ok: boolean;
  readonly value?: {
    readonly scratchFreeBytes: number | null;
    readonly pendingFreeBytes: number | null;
    readonly sameDrive: boolean;
  };
}

describe('packaged working space', () => {
  it('tells the window what is left on the drives the app works on, and warns of nothing on a drive with room', async () => {
    await $('h1=Queue').waitForDisplayed({ timeout: 30_000 });

    const reply = await browser.execute(() =>
      (
        window as unknown as { mangabound: { getWorkingSpace: () => Promise<Reply> } }
      ).mangabound.getWorkingSpace(),
    );

    assert.equal(reply.ok, true);
    assert.ok((reply.value?.scratchFreeBytes ?? 0) > 0, 'the volumes folder should have room');
    assert.ok((reply.value?.pendingFreeBytes ?? 0) > 0, 'the books folder should have room');
    assert.equal(typeof reply.value?.sameDrive, 'boolean');
    assert.ok(!(await $('p*=free where Mangabound works').isExisting()));
  });
});
