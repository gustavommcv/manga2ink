/**
 * The languages the app is written in, English first: it is the one every message is first written
 * in and the one a person gets when nothing else fits. A language is added here, with its catalog
 * (ADR 0052).
 */
export const languages = ['en', 'pt-BR'] as const;

export type Language = (typeof languages)[number];

export const defaultLanguage: Language = 'en';

/** What a person chooses: one of the languages, or whatever the system is set to. */
export const languagePreferences = ['system', ...languages] as const;

export type LanguagePreference = (typeof languagePreferences)[number];

/**
 * What a person decided about the app itself, as against the conversion options (ADR 0014): kept
 * between sessions, and left alone by a reset.
 */
export interface AppSettings {
  readonly language: LanguagePreference;
}

/** Where the app starts: in the language of the system. */
export const defaultAppSettings: AppSettings = Object.freeze({ language: 'system' });

export function isLanguagePreference(value: unknown): value is LanguagePreference {
  return languagePreferences.includes(value as LanguagePreference);
}

/** A language tag as it is compared: lower case, with a hyphen whatever the system writes. */
function normalized(tag: string): string {
  return tag.trim().toLowerCase().replace(/_/gu, '-');
}

/** The language a tag names, without its region or script: `pt` for `pt-PT`. */
function primary(tag: string): string {
  return normalized(tag).split('-', 1).join('');
}

/**
 * The language the app is shown in. A chosen one is that one. Following the system, it is the
 * first language the system prefers that the app has: the whole tag if the app has it, otherwise
 * a variety of the same language (`pt-PT` gets `pt-BR`), and English when none of them fits.
 */
export function resolveLanguage(
  preference: LanguagePreference,
  systemLanguages: readonly string[],
): Language {
  if (preference !== 'system') return preference;
  for (const tag of systemLanguages) {
    const whole = languages.find((language) => normalized(language) === normalized(tag));
    if (whole !== undefined) return whole;
    const name = primary(tag);
    if (name === '') continue;
    const variety = languages.find((language) => primary(language) === name);
    if (variety !== undefined) return variety;
  }
  return defaultLanguage;
}
