/**
 * The looks the app can have (ADR 0066): the dark graphite one it has always had, and a light one
 * (ADR 0067). A theme is added here, with its window colors below, its words in the catalogs, and the
 * block of tokens in `src/renderer/styles.css` that `[data-theme]` selects; the compiler and a test
 * say where one of them is missing.
 */
export const themes = ['dark', 'light'] as const;

export type Theme = (typeof themes)[number];

/** The theme a person starts with, and the one a file that names no theme this build has gets. */
export const defaultTheme: Theme = 'dark';

export function isTheme(value: unknown): value is Theme {
  return themes.includes(value as Theme);
}

/**
 * What of a theme the window itself needs, as hex: Electron cannot read CSS variables, so the paint
 * of the window before the page draws and the title bar that the system draws over the page's own
 * (the buttons to minimize and close) take these. A test keeps them in step with the tokens of the
 * theme in `styles.css`.
 */
export interface ThemeWindowColors {
  /** What the window is painted with, and the title bar overlay: the `--background` of the theme. */
  readonly background: string;
  /** What the buttons of the title bar are drawn with: the `--foreground` of the theme. */
  readonly foreground: string;
  /**
   * Whether the theme is a dark one or a light one: the `color-scheme` of its block, and what the
   * system's own parts (dialogs, menus, scrollbars) are drawn as, so they sit with the page.
   */
  readonly scheme: 'dark' | 'light';
}

export const themeWindowColors: Readonly<Record<Theme, ThemeWindowColors>> = {
  dark: { background: '#121214', foreground: '#e8e8eb', scheme: 'dark' },
  light: { background: '#f5f5f8', foreground: '#18181d', scheme: 'light' },
};
