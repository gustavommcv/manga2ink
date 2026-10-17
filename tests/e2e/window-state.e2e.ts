import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { browser } from '@wdio/globals';

interface Kept {
  readonly version: number;
  readonly width: number;
  readonly height: number;
  readonly x?: number;
  readonly y?: number;
  readonly maximized: boolean;
}

describe('packaged size and place of the window', () => {
  it('keeps the size and place the window is given, once it has stayed there for a moment', async () => {
    const userData = await browser.electron.execute((electron) => electron.app.getPath('userData'));
    const file = path.join(userData, 'window-state.json');

    await browser.electron.execute((electron) => {
      electron.BrowserWindow.getAllWindows()[0]?.setBounds({
        x: 60,
        y: 60,
        width: 933,
        height: 611,
      });
    });

    const read = async (): Promise<Kept | undefined> => {
      try {
        return JSON.parse(await readFile(file, 'utf8')) as Kept;
      } catch {
        // Not written yet, or being replaced.
        return undefined;
      }
    };
    await browser.waitUntil(
      async () => {
        const now = await read();
        return now?.width === 933 && now.height === 611;
      },
      { timeout: 30_000, timeoutMsg: 'The size of the window was not kept.' },
    );

    const kept = await read();
    assert.ok(kept !== undefined);
    assert.equal(kept.version, 1);
    assert.equal(kept.maximized, false);
    // Where it is kept on every system but a Wayland session, which this suite does not run in.
    assert.equal(typeof kept.x, 'number');
    assert.equal(typeof kept.y, 'number');
  });
});
