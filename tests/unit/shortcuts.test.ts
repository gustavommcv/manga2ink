import { describe, expect, it } from 'vitest';

import { type KeyPress, settingsShortcut } from '@/renderer/lib/shortcuts';

const press = (overrides: Partial<KeyPress> = {}): KeyPress => ({
  key: ',',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...overrides,
});

describe('the shortcut that opens the app settings', () => {
  it.each(['win32', 'linux', 'freebsd'] as const)('is Ctrl+, on %s', (platform) => {
    const shortcut = settingsShortcut(platform);

    expect(shortcut.label).toBe('Ctrl+,');
    expect(shortcut.announced).toBe('Control+,');
    expect(shortcut.matches(press({ ctrlKey: true }))).toBe(true);
  });

  it('is Cmd+, on macOS, which is how every app of the system has its settings', () => {
    const shortcut = settingsShortcut('darwin');

    expect(shortcut.label).toBe('⌘,');
    expect(shortcut.announced).toBe('Meta+,');
    expect(shortcut.matches(press({ metaKey: true }))).toBe(true);
  });

  it.each([
    [
      'Cmd+, on Windows or Linux, where the Windows key is for the system',
      'linux',
      { metaKey: true },
    ],
    ['Ctrl+, on macOS, where Ctrl is not the key of shortcuts', 'darwin', { ctrlKey: true }],
    ['the comma with nothing held', 'linux', {}],
    ['the comma with nothing held on macOS', 'darwin', {}],
    ['Ctrl+Shift+, which is another shortcut', 'linux', { ctrlKey: true, shiftKey: true }],
    ['Ctrl+Alt+, which is another shortcut', 'linux', { ctrlKey: true, altKey: true }],
    ['Cmd+Shift+, which is another shortcut', 'darwin', { metaKey: true, shiftKey: true }],
    ['Cmd+Alt+, which is another shortcut', 'darwin', { metaKey: true, altKey: true }],
    ['Ctrl+Cmd+, on macOS', 'darwin', { metaKey: true, ctrlKey: true }],
    ['Ctrl+Win+, on Windows', 'win32', { metaKey: true, ctrlKey: true }],
    ['Ctrl and another key', 'linux', { ctrlKey: true, key: 'a' }],
    ['Cmd and another key', 'darwin', { metaKey: true, key: 's' }],
    ['Ctrl+. which is next to it', 'linux', { ctrlKey: true, key: '.' }],
  ] as const)('is not %s', (_what, platform, held) => {
    expect(settingsShortcut(platform).matches(press(held))).toBe(false);
  });
});
