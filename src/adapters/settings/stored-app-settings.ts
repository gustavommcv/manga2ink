import path from 'node:path';

import {
  defaultAppSettings,
  defaultProcessingChoice,
  isLanguagePreference,
  type KeptAppSettings,
  type ProcessingChoice,
} from '@/domain/app-settings';

export const appSettingsFileVersion = 1;

/** More earlier folders than anyone has used are a file that was edited by hand, or damaged. */
const mostEarlierFolders = 32;

/** A folder the file names: a text that is an absolute path, and nothing else. */
function folderIn(value: unknown): string | undefined {
  return typeof value === 'string' && path.isAbsolute(value) ? value : undefined;
}

function processingIn(file: Record<string, unknown>): ProcessingChoice {
  const folder = folderIn(file.processingFolder) ?? null;
  const named: unknown = file.earlierProcessingFolders;
  const earlier = (Array.isArray(named) ? named : [])
    .map(folderIn)
    .filter(
      (kept, index, all): kept is string =>
        kept !== undefined && kept !== folder && all.indexOf(kept) === index,
    )
    .slice(0, mostEarlierFolders);
  return folder === null && earlier.length === 0 ? defaultProcessingChoice : { folder, earlier };
}

/**
 * What the file of the app settings holds, or undefined when the file as a whole cannot be used:
 * not JSON, not an object, or another version. A language the app does not have (one that a newer
 * version added, or a hand edit) is not a reason to lose the file: it reads as following the system,
 * and a folder that is not an absolute path reads as none. Keys that are not known are dropped, and a
 * file that has none of the folders (one an earlier version wrote) is one with the app's own places.
 */
export function parseStoredAppSettings(raw: string): KeptAppSettings | undefined {
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
    processing: processingIn(file),
  };
}

export function serializeStoredAppSettings(settings: KeptAppSettings): string {
  return `${JSON.stringify(
    {
      version: appSettingsFileVersion,
      language: settings.language,
      processingFolder: settings.processing.folder,
      earlierProcessingFolders: settings.processing.earlier,
    },
    null,
    2,
  )}\n`;
}
