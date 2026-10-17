import { describe, expect, it } from 'vitest';

import {
  parseStoredWindowState,
  serializeStoredWindowState,
  windowStateFileVersion,
} from '@/adapters/settings/stored-window-state';

const file = (overrides: Record<string, unknown> = {}): string =>
  JSON.stringify({
    version: windowStateFileVersion,
    width: 900,
    height: 600,
    x: 120,
    y: 80,
    maximized: false,
    ...overrides,
  });

describe('reading the file of the window', () => {
  it('gives the size, the place and whether it was maximized', () => {
    expect(parseStoredWindowState(file({ maximized: true }))).toEqual({
      width: 900,
      height: 600,
      x: 120,
      y: 80,
      maximized: true,
    });
  });

  it('takes the place as it is when it is negative, as it is on a display to the left of the main one', () => {
    expect(parseStoredWindowState(file({ x: -1000, y: -20 }))).toMatchObject({ x: -1000, y: -20 });
  });

  it('rounds to whole pixels', () => {
    expect(
      parseStoredWindowState(file({ width: 900.4, height: 599.6, x: 12.5, y: 7.2 })),
    ).toMatchObject({ width: 900, height: 600, x: 13, y: 7 });
  });

  it('gives a window that was not maximized when the file does not say', () => {
    const { maximized } = parseStoredWindowState(file({ maximized: undefined })) ?? {};
    expect(maximized).toBe(false);
    expect(parseStoredWindowState(file({ maximized: 'yes' }))?.maximized).toBe(false);
  });

  it.each([
    ['no x', { x: undefined }],
    ['no y', { y: undefined }],
    ['an x that is not a number', { x: '12' }],
    ['a y that is not a finite number', { y: null }],
    ['a place nothing has come near', { x: 1e9 }],
  ])('keeps the size and leaves the place out for %s', (_what, overrides) => {
    const state = parseStoredWindowState(file(overrides));

    expect(state).toMatchObject({ width: 900, height: 600 });
    expect(state).not.toHaveProperty('x');
    expect(state).not.toHaveProperty('y');
  });

  it.each([
    ['text that is not JSON', 'width: 900'],
    ['a list', '[]'],
    ['nothing', 'null'],
    ['a number', '7'],
    ['another version', file({ version: 2 })],
    ['no version', file({ version: undefined })],
    ['no width', file({ width: undefined })],
    ['a width that is not a number', file({ width: '900' })],
    ['a width of nothing', file({ width: 0 })],
    ['a negative height', file({ height: -600 })],
    ['a height nothing has come near', file({ height: 1e9 })],
    ['a size that is not finite', file({ width: null })],
  ])('cannot use %s', (_what, text) => {
    expect(parseStoredWindowState(text)).toBeUndefined();
  });
});

describe('writing the file of the window', () => {
  it('writes what reads back as the same', () => {
    const state = { width: 900, height: 600, x: -30, y: 12, maximized: true };

    expect(parseStoredWindowState(serializeStoredWindowState(state))).toEqual(state);
  });

  it('writes no place when it was not kept, and a version', () => {
    const text = serializeStoredWindowState({ width: 900, height: 600, maximized: false });

    expect(JSON.parse(text)).toEqual({ version: 1, width: 900, height: 600, maximized: false });
    expect(text.endsWith('\n')).toBe(true);
  });

  it('writes no place when only half of it is there', () => {
    const text = serializeStoredWindowState({ width: 900, height: 600, x: 5, maximized: false });

    expect(JSON.parse(text)).not.toHaveProperty('x');
  });
});
