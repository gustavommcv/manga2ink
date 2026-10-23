import { z } from 'zod';

import type { StoredSettings } from '@/application/ports/settings-store';
import type { OptionName } from '@/domain/messages/notice';
import {
  defaultMangaprepSettings,
  type MangaprepSettingField,
  type MangaprepSettings,
} from '@/domain/output-profile';
import { defaultPreferences } from '@/domain/preferences';
import { networkInterfacePreferenceSchema, preferencesSchema } from '@/shared/settings-contract';
import { mangaprepSettingFields, mangaprepSettingsSchema } from '@/shared/workflow-contract';

export const settingsFileVersion = 1;

const storedFields = {
  outputFolder: z.string().min(1).max(4096),
  lastPickerFolder: z.string().min(1).max(4096),
  preferredNetworkInterface: networkInterfacePreferenceSchema,
};

export const defaultStoredSettings: StoredSettings = defaultPreferences;

/** A settings file that could be read, and the options in it that could not. */
export interface ParsedSettings {
  readonly settings: StoredSettings;
  /**
   * The options whose saved value was of the wrong kind or out of range, which are back to their
   * defaults, by their names: each language says them in its own words (ADR 0053).
   */
  readonly reset: readonly OptionName[];
}

/**
 * `safeParse`, which does not throw for a value of the wrong kind but did for one that only looks like
 * a string: zod checks the length of anything that has one, and compares it, so a file edited by hand
 * to `{"length":{"toString":null}}` made the comparison throw a `TypeError`. A value that makes the check
 * throw is a bad value like any other: `undefined` is what is given, and the option goes back to its
 * default.
 */
function parseWithoutThrowing<Schema extends z.ZodType>(
  schema: Schema,
  value: unknown,
): z.ZodSafeParseResult<z.output<Schema>> | undefined {
  try {
    return schema.safeParse(value);
  } catch {
    return undefined;
  }
}

/**
 * What a settings file holds, or undefined when the file as a whole cannot be used: not JSON,
 * not an object, or another version. A single value of the wrong kind or out of range (a hand
 * edit, or a range tightened by a later version) does not cost the person the rest: that option
 * goes back to its default, the others are kept, and the ones that were reset are named. The
 * ranges are the ones a conversion request is held to, so the file cannot hold what a run would
 * refuse. Keys that are not known are dropped, so nothing outside what is kept (such as the title
 * and author an older version once had) gets back in through the file.
 */
export function parseStoredSettings(raw: string): ParsedSettings | undefined {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (typeof json !== 'object' || json === null || Array.isArray(json)) return undefined;
  const file = json as Record<string, unknown>;
  if (file.version !== settingsFileVersion) return undefined;

  const rawSettings =
    typeof file.settings === 'object' && file.settings !== null && !Array.isArray(file.settings)
      ? { ...(file.settings as Record<string, unknown>) }
      : {};
  // An earlier version kept "bind the whole series" among the options; it is a choice of its own now.
  const wasCombining =
    file.combineIntoOneVolume === true || rawSettings.combineIntoOneVolume === true;

  const reset: OptionName[] = [];
  /** The value if the file has one that is good, `undefined` and a note if it has a bad one. */
  const read = <Schema extends z.ZodType>(
    name: OptionName,
    schema: Schema,
    value: unknown,
  ): z.output<Schema> | undefined => {
    if (value === undefined) return undefined;
    const parsed = parseWithoutThrowing(schema, value);
    if (parsed?.success === true) return parsed.data;
    reset.push(name);
    return undefined;
  };

  const options: Record<string, unknown> = { ...defaultMangaprepSettings };
  for (const [name, schema] of Object.entries(mangaprepSettingFields) as [
    MangaprepSettingField,
    z.ZodType,
  ][]) {
    const value = read(name, schema, rawSettings[name]);
    if (value !== undefined) options[name] = value;
  }
  // The options hold together or not at all: a custom device with no size is not a device.
  if (!mangaprepSettingsSchema.safeParse(options).success) {
    for (const name of ['deviceProfile', 'customWidth', 'customHeight'] as const) {
      delete options[name];
      if (name === 'deviceProfile') options[name] = defaultMangaprepSettings.deviceProfile;
    }
    reset.push('customDeviceSize');
  }

  const choices = preferencesSchema.shape;
  const mode = read('mode', choices.mode, file.mode);
  const format = read('format', choices.format, file.format);
  const singleBook = read('singleBook', choices.singleBook, file.singleBook);
  const providerId = read('providerId', choices.providerId, file.providerId);
  const outputFolder = read('outputFolder', storedFields.outputFolder, file.outputFolder);
  const lastPickerFolder = read(
    'lastPickerFolder',
    storedFields.lastPickerFolder,
    file.lastPickerFolder,
  );
  const preferredNetworkInterface = read(
    'preferredNetworkInterface',
    storedFields.preferredNetworkInterface,
    file.preferredNetworkInterface,
  );

  const settings: StoredSettings = {
    mode: mode ?? defaultPreferences.mode,
    format: format ?? defaultPreferences.format,
    singleBook: singleBook ?? (wasCombining ? true : defaultPreferences.singleBook),
    settings: { ...(options as unknown as MangaprepSettings), combineIntoOneVolume: false },
    ...(providerId === undefined ? {} : { providerId }),
    ...(outputFolder === undefined ? {} : { outputFolder }),
    ...(lastPickerFolder === undefined ? {} : { lastPickerFolder }),
    ...(preferredNetworkInterface === undefined ? {} : { preferredNetworkInterface }),
  };
  return { settings, reset };
}

export function serializeStoredSettings(settings: StoredSettings): string {
  return `${JSON.stringify({ version: settingsFileVersion, ...settings }, null, 2)}\n`;
}
