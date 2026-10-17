import { defaultTheme, type Theme, themes } from '@/domain/theme';

/**
 * The theme a story is shown in: the one of the toolbar or of the address (`globals=theme:…`), the
 * default one when there is none or it is not one of the app's (ADR 0066).
 */
export function themeOf(globals: Readonly<Record<string, unknown>>): Theme {
  const chosen = globals.theme;
  return themes.find((theme) => theme === chosen) ?? defaultTheme;
}
