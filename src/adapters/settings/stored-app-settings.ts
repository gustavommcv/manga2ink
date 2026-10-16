import { type AppSettings, defaultAppSettings, isLanguagePreference } from '@/domain/app-settings';

export const appSettingsFileVersion = 1;

/**
 * What the file of the app settings holds, or undefined when the file as a whole cannot be used:
 * not JSON, not an object, or another version. A language the app does not have (one that a newer
 * version added, or a hand edit) is not a reason to lose the file: it reads as following the system.
 * Keys that are not known are dropped.
 */
export function parseStoredAppSettings(raw: string): AppSettings | undefined {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return undefined;
  const file = json as Record<string, unknown>;
  if (file.version !== appSettingsFileVersion) return undefined;
  return {
    language: isLanguagePreference(file.language) ? file.language : defaultAppSettings.language,
  };
}

export function serializeStoredAppSettings(settings: AppSettings): string {
  return `${JSON.stringify({ version: appSettingsFileVersion, language: settings.language }, null, 2)}\n`;
}
