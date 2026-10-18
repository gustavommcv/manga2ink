/**
 * The looks the app can have (ADR 0066): the dark graphite one it has always had, and a light one
 * (ADR 0067). A theme is added here, with its window colors below, its words in the catalogs, and the
 * block of tokens in `src/renderer/styles.css` that `[data-theme]` selects; the compiler and a test
 * say where one of them is missing.
 */
export const themes = ['dark', 'light'] as const;

export type Theme = (typeof themes)[number];

/**
 * The theme the app is drawn in when nothing says otherwise: the one the bare `:root` of the
 * stylesheet selects, a story with no toolbar choice, and what a system that is dark comes to. It is
 * not what a person starts with (they start with `defaultThemePreference`).
 */
export const defaultTheme: Theme = 'dark';

export function isTheme(value: unknown): value is Theme {
  return themes.includes(value as Theme);
}

/** What a person chooses: one of the themes, or whatever the system is set to (ADR 0070). */
export const themePreferences = ['system', ...themes] as const;

export type ThemePreference = (typeof themePreferences)[number];

/**
 * What a person starts with, and what a file that names no preference this build has gets: the look
 * of the system, as the language starts as the system's.
 */
export const defaultThemePreference: ThemePreference = 'system';

export function isThemePreference(value: unknown): value is ThemePreference {
  return themePreferences.includes(value as ThemePreference);
}

/**
 * The theme a preference comes to: a chosen one is that one, and following the system it is the dark
 * theme when the system is set to dark and the light one when it is not.
 */
export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): Theme {
  if (preference !== 'system') return preference;
  return systemIsDark ? 'dark' : 'light';
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
