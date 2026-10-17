import { describe, expect, it } from 'vitest';

import {
  defaultWindowSize,
  minimumWindowSize,
  placeWindow,
  type Rectangle,
  type WindowState,
} from '@/domain/window-state';

/** A 1920x1080 display with a 40px bar at the bottom, and a smaller one to its left. */
const main: Rectangle = { x: 0, y: 0, width: 1920, height: 1040 };
const left: Rectangle = { x: -1280, y: 0, width: 1280, height: 984 };

const place = (saved: WindowState | undefined, areas: readonly Rectangle[] = [main, left]) =>
  placeWindow(saved, areas, defaultWindowSize, minimumWindowSize);

describe('where the window opens', () => {
  it('opens at the size it always did when nothing was kept, or when there is no display to ask', () => {
    expect(place(undefined)).toEqual({ width: 1180, height: 760, maximized: false });
    expect(place({ width: 900, height: 600, maximized: true }, [])).toEqual({
      width: 1180,
      height: 760,
      maximized: false,
    });
  });

  it('opens at the size and place it was left in, when they are on a display', () => {
    expect(place({ width: 900, height: 600, x: 100, y: 50, maximized: false })).toEqual({
      width: 900,
      height: 600,
      x: 100,
      y: 50,
      maximized: false,
    });
  });

  it('opens maximized when it was left maximized, with the size it has when it is not', () => {
    expect(place({ width: 900, height: 600, x: 100, y: 50, maximized: true })).toMatchObject({
      width: 900,
      height: 600,
      x: 100,
      y: 50,
      maximized: true,
    });
  });

  it('leaves the place to the system when none was kept, and keeps the size', () => {
    const placed = place({ width: 900, height: 600, maximized: false });

    expect(placed).toEqual({ width: 900, height: 600, maximized: false });
    expect(placed).not.toHaveProperty('x');
    expect(placed).not.toHaveProperty('y');
  });

  it('is on the display it was left on, also when that is not the main one', () => {
    expect(place({ width: 800, height: 600, x: -1000, y: 100, maximized: false })).toMatchObject({
      x: -1000,
      y: 100,
    });
  });
});

describe('a window that cannot be where it was left', () => {
  it('goes where the system chooses when the display it was on is not there any more', () => {
    const placed = place({ width: 900, height: 600, x: -1000, y: 100, maximized: false }, [main]);

    expect(placed).toEqual({ width: 900, height: 600, maximized: false });
  });

  it('goes where the system chooses when only an edge of it is on a display, too little to take hold of', () => {
    // 100px of its width is on the display: under the 120px of title bar that can be taken hold of.
    const placed = place({ width: 900, height: 600, x: 1820, y: 100, maximized: false });

    expect(placed).not.toHaveProperty('x');
  });

  it('goes where the system chooses when its title bar is below the display', () => {
    // 30px of its height is on the display: under the 48px of the title bar.
    const placed = place({ width: 900, height: 600, x: 100, y: 1010, maximized: false });

    expect(placed).not.toHaveProperty('x');
  });

  it('is moved the least that puts it wholly on the display, when most of it was on one', () => {
    expect(place({ width: 900, height: 600, x: 1500, y: 700, maximized: false })).toMatchObject({
      x: 1020,
      y: 440,
    });
    expect(place({ width: 900, height: 600, x: -300, y: -40, maximized: false })).toMatchObject({
      x: 0,
      y: 0,
    });
  });

  it('is made no bigger than the display it is on, and kept at its corner', () => {
    expect(place({ width: 3000, height: 2000, x: 200, y: 100, maximized: false })).toEqual({
      width: 1920,
      height: 1040,
      x: 0,
      y: 0,
      maximized: false,
    });
  });

  it('is made no bigger than the main display when it has no place, since that is where it goes', () => {
    expect(place({ width: 3000, height: 2000, maximized: false })).toEqual({
      width: 1920,
      height: 1040,
      maximized: false,
    });
  });

  it('is made no smaller than the least a window can be made', () => {
    expect(place({ width: 100, height: 100, x: 100, y: 100, maximized: false })).toMatchObject({
      width: 480,
      height: 400,
    });
  });

  it('is made to fit a display too small for the least, rather than moved beyond it', () => {
    const tiny: Rectangle = { x: 0, y: 0, width: 400, height: 300 };

    expect(place({ width: 900, height: 600, x: 0, y: 0, maximized: false }, [tiny])).toEqual({
      width: 480,
      height: 400,
      x: 0,
      y: 0,
      maximized: false,
    });
  });
});
