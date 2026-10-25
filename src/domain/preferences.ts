import type { BookFormat } from './conversion';
import { defaultMangaprepSettings, type MangaprepSettings } from './output-profile';
import { defaultProcessMode, type ProcessMode } from './process-mode';

/** What a person chose that outlives the session. */
export interface Preferences {
  readonly mode: ProcessMode;
  readonly format: BookFormat;
  readonly settings: MangaprepSettings;
  /** The id of the online source chosen for volume data, when one was. */
  readonly providerId?: string;
}

export const defaultFormat: BookFormat = 'cbz';

/** Where everything starts, and where a reset returns it. */
export const defaultPreferences: Preferences = Object.freeze({
  mode: defaultProcessMode,
  format: defaultFormat,
  settings: defaultMangaprepSettings,
});

/** Whether two sets of options are the same, an option that was cleared counting as one never set. */
export function sameSettings(a: MangaprepSettings, b: MangaprepSettings): boolean {
  const fields = new Set([...Object.keys(a), ...Object.keys(b)]) as Set<keyof MangaprepSettings>;
  return [...fields].every((field) => a[field] === b[field]);
}

/** Whether the format and the mangaprep options are exactly what a fresh start has. */
export function isDefaultMangaprep(format: BookFormat, settings: MangaprepSettings): boolean {
  return format === defaultFormat && sameSettings(settings, defaultMangaprepSettings);
}
