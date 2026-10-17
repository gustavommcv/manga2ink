/** What a keyboard event says of the keys that are held; the keyboard event of the page has all of it. */
export interface KeyPress {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

/** A shortcut as a window of an app has it: how it is written, how it is announced, and when it is pressed. */
export interface Shortcut {
  /** For `aria-keyshortcuts`, which tells a screen reader which keys do what the control does. */
  readonly announced: string;
  /** For a person to read, written as the platform writes it. */
  readonly label: string;
  readonly matches: (press: KeyPress) => boolean;
}

/**
 * The shortcut that opens the app settings (ADR 0064): Cmd+, on macOS, where every app's settings
 * are, and Ctrl+, on the other systems, where it is what the editors and browsers a person has used
 * have made it. The comma is the key that prints a comma, so it is the same on a keyboard whose
 * layout puts it elsewhere. Held with any other modifier it is another shortcut, and is left alone.
 */
export function settingsShortcut(platform: NodeJS.Platform): Shortcut {
  const mac = platform === 'darwin';
  return {
    announced: mac ? 'Meta+,' : 'Control+,',
    label: mac ? '⌘,' : 'Ctrl+,',
    matches: ({ key, ctrlKey, metaKey, altKey, shiftKey }) =>
      key === ',' && !altKey && !shiftKey && (mac ? metaKey && !ctrlKey : ctrlKey && !metaKey),
  };
}
