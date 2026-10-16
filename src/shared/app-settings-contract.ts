import { z } from 'zod';

import { type AppSettings, type Language, languagePreferences } from '@/domain/app-settings';

/**
 * What the window sends to keep the app settings (ADR 0052). The language is one of the languages
 * the app has, or the system's.
 */
export const saveAppSettingsCommandSchema = z.object({
  language: z.enum(languagePreferences),
});

export type SaveAppSettingsCommand = AppSettings;

/** What the window starts from: the kept choices, and the language they come to. */
export interface RestoredAppSettings {
  readonly settings: AppSettings;
  /** The language to show: the chosen one, or the one the system's languages come to. */
  readonly language: Language;
  /** True when a file was there and could not be used, so `settings` are the defaults. */
  readonly unreadable: boolean;
}

/** What the window is told once the app settings are kept. */
export interface SavedAppSettings {
  readonly language: Language;
}
