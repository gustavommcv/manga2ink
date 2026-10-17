import { defaultTheme, type Theme } from './theme';

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
  /** Tell when a long queue ends, if no window of the app is in front (ADR 0065). */
  readonly notifyWhenDone: boolean;
  /** Keep the computer from going to sleep while a queue runs (ADR 0065). */
  readonly keepAwake: boolean;
  /** How the app looks (ADR 0066). */
  readonly theme: Theme;
}

/** Where the app starts: in the language of the system, telling and keeping awake, in the default theme. */
export const defaultAppSettings: AppSettings = Object.freeze({
  language: 'system',
  notifyWhenDone: true,
  keepAwake: true,
  theme: defaultTheme,
});

/** What a person changes at one time: any of the choices, and nothing else. */
export type AppSettingsChange = { readonly [Choice in keyof AppSettings]?: AppSettings[Choice] };

/** The settings with the choices a change names; a choice it leaves out (or leaves undefined) stays. */
export function applyingChange<Settings extends AppSettings>(
  settings: Settings,
  change: AppSettingsChange,
): Settings {
  return {
    ...settings,
    ...Object.fromEntries(
      Object.entries<unknown>(change).filter(([, value]) => value !== undefined),
    ),
  };
}

/** The choices the window reads and changes, out of everything the file keeps. */
export function choicesOf(settings: AppSettings): AppSettings {
  return {
    language: settings.language,
    notifyWhenDone: settings.notifyWhenDone,
    keepAwake: settings.keepAwake,
    theme: settings.theme,
  };
}

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

/**
 * Where the app works, as a person decided it (ADR 0056): the folder it builds volumes in while it
 * converts, and keeps finished books in until they are saved. `folder` is one a person chose, or
 * `null` while the app picks the places itself (the system's temporary folder, and its own data).
 */
export interface ProcessingChoice {
  readonly folder: string | null;
  /**
   * Folders that were chosen before, in the order they stopped being: books may still be waiting in
   * them, so they are looked in until nothing is left there. Never holds `folder`.
   */
  readonly earlier: readonly string[];
}

export const defaultProcessingChoice: ProcessingChoice = Object.freeze({
  folder: null,
  earlier: Object.freeze([]),
});

/**
 * Everything the file of the app settings keeps. The window reads and changes `AppSettings` (the
 * language); where the app works is changed through its own commands, which the main process checks.
 */
export interface KeptAppSettings extends AppSettings {
  readonly processing: ProcessingChoice;
}

export const defaultKeptAppSettings: KeptAppSettings = Object.freeze({
  ...defaultAppSettings,
  processing: defaultProcessingChoice,
});

/**
 * The choice once `folder` is the one chosen (`null` for the app's own places). The one it replaces
 * goes among the earlier folders, since books may be waiting in it, and a folder that comes back
 * is no longer an earlier one.
 */
export function choosingFolder(choice: ProcessingChoice, folder: string | null): ProcessingChoice {
  if (folder === choice.folder) return choice;
  const earlier = [...(choice.folder === null ? [] : [choice.folder]), ...choice.earlier].filter(
    (kept, index, all) => kept !== folder && all.indexOf(kept) === index,
  );
  return { folder, earlier };
}

/** The choice without these earlier folders: nothing is waiting in them any more. */
export function forgettingFolders(
  choice: ProcessingChoice,
  folders: readonly string[],
): ProcessingChoice {
  const earlier = choice.earlier.filter((kept) => !folders.includes(kept));
  return earlier.length === choice.earlier.length ? choice : { ...choice, earlier };
}
