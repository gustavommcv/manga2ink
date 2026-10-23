import type { BookFormat } from './conversion';
import type { MangaprepSettings } from './output-profile';

/** The format and the mangaprep options a book is made with. */
export interface RunOptions {
  readonly settings: MangaprepSettings;
  readonly format: BookFormat;
}

/**
 * Settings an item has set differently from the queue's. A value replaces the queue's; `null` is
 * "not set", for the few settings that can be left unset (the JPEG quality, the gamma and the
 * custom size) while the queue's options have them set.
 */
export type SettingsOverride = {
  readonly [Field in keyof MangaprepSettings]?: MangaprepSettings[Field] | null;
};

/**
 * What one item of the queue (a folder, a CBZ, or a manga of a library) does differently from the
 * options of the queue (ADR 0046). It holds only the differences, so a choice made later for the
 * whole queue still reaches every option an item did not set itself.
 */
export interface ItemOptions {
  readonly settings?: SettingsOverride;
  readonly format?: BookFormat;
}

/** Whether an item has any option of its own. */
export function hasItemOptions(options: ItemOptions | undefined): boolean {
  return (
    options !== undefined &&
    (options.format !== undefined || Object.keys(options.settings ?? {}).length > 0)
  );
}

/** The options an item is converted with: the queue's, with what the item set over them. */
export function effectiveOptions(queue: RunOptions, item: ItemOptions | undefined): RunOptions {
  if (item === undefined || !hasItemOptions(item)) return queue;
  const merged: Record<string, unknown> = { ...queue.settings };
  for (const [field, value] of Object.entries(item.settings ?? {})) {
    if (value === null) delete merged[field];
    else merged[field] = value;
  }
  return {
    settings: merged as unknown as MangaprepSettings,
    format: item.format ?? queue.format,
  };
}

/**
 * What an item has to set for `edited` to be what it is converted with, given the queue's options:
 * only what differs, and nothing when it does not.
 */
export function itemOptionsFor(queue: RunOptions, edited: RunOptions): ItemOptions | undefined {
  const differing: Record<string, MangaprepSettings[keyof MangaprepSettings] | null> = {};
  const fields = new Set([...Object.keys(queue.settings), ...Object.keys(edited.settings)]) as Set<
    keyof MangaprepSettings
  >;
  for (const field of fields) {
    const value = edited.settings[field];
    if (value !== queue.settings[field]) differing[field] = value === undefined ? null : value;
  }
  const format = edited.format === queue.format ? undefined : edited.format;
  const options: ItemOptions = {
    ...(Object.keys(differing).length === 0 ? {} : { settings: differing }),
    ...(format === undefined ? {} : { format }),
  };
  return hasItemOptions(options) ? options : undefined;
}

/**
 * The settings with one field as the queue has it again. Choosing a device also sets the two
 * things a device starts with, upscaling and color (ADR 0011), so putting the device back puts
 * those two back with it, as choosing it did. A field the queue leaves unset is left unset.
 */
export function withQueueValue(
  settings: MangaprepSettings,
  queue: MangaprepSettings,
  field: keyof MangaprepSettings,
): MangaprepSettings {
  const next: Record<string, unknown> = { ...settings };
  const fields: readonly (keyof MangaprepSettings)[] =
    field === 'deviceProfile' ? ['deviceProfile', 'upscale', 'forceColor'] : [field];
  for (const name of fields) {
    const value = queue[name];
    if (value === undefined) delete next[name];
    else next[name] = value;
  }
  return next as unknown as MangaprepSettings;
}
