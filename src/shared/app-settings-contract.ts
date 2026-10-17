import { z } from 'zod';

import {
  type AppSettings,
  type AppSettingsChange,
  type Language,
  languagePreferences,
} from '@/domain/app-settings';

/**
 * What the window sends to keep the app settings (ADR 0052): the choices that changed, one or
 * several, and no others. The language is one of the languages the app has, or the system's; the
 * others are a yes or no (ADR 0065).
 */
export const saveAppSettingsCommandSchema = z
  .object({
    language: z.enum(languagePreferences).optional(),
    notifyWhenDone: z.boolean().optional(),
    keepAwake: z.boolean().optional(),
  })
  .refine((change) => Object.values<unknown>(change).some((choice) => choice !== undefined), {
    message: 'A change names at least one choice.',
  });

export type SaveAppSettingsCommand = AppSettingsChange;

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
