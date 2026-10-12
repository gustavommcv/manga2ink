import { describe, expect, it } from 'vitest';

import type { BookFormat } from '@/domain/conversion';
import { effectiveOptions, itemOptionsFor, type RunOptions } from '@/domain/item-options';
import { defaultMangapressSettings, type MangapressSettings } from '@/domain/output-profile';

/** A small seeded generator: the same seed gives the same cases, so a failure can be run again. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const formats: readonly BookFormat[] = ['cbz', 'epub', 'pdf'];
const choices = Object.entries(defaultMangapressSettings) as [
  keyof MangapressSettings,
  MangapressSettings[keyof MangapressSettings],
][];
const optional = ['jpegQuality', 'gamma', 'customWidth', 'customHeight'] as const;

/** Options with some of every kind of field changed: a flag turned over, a number, a text, one cleared. */
function someSettings(next: () => number): MangapressSettings {
  const settings: Record<string, unknown> = { ...defaultMangapressSettings };
  for (const [field, value] of choices) {
    if (next() > 0.35) continue;
    settings[field] =
      typeof value === 'boolean'
        ? !value
        : typeof value === 'number'
          ? Math.floor(next() * 100)
          : `${String(value)}-${String(Math.floor(next() * 5))}`;
  }
  for (const field of optional) {
    const roll = next();
    if (roll < 0.3) settings[field] = Math.floor(next() * 100) + 1;
    else if (roll < 0.5) delete settings[field];
  }
  return settings as unknown as MangapressSettings;
}

/** The same options with a cleared field left out and one set to undefined counted the same. */
const normalized = (settings: MangapressSettings): Record<string, unknown> =>
  Object.fromEntries(
    Object.entries(settings)
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right)),
  );

describe('what an item sets over the options of the queue', () => {
  const cases = Array.from({ length: 500 }, (_, index) => index + 1);

  it.each(cases)('is always enough to get back what was edited (seed %i)', (seed) => {
    const next = random(seed);
    const queue: RunOptions = {
      settings: someSettings(next),
      format: formats[Math.floor(next() * 3)] ?? 'cbz',
    };
    const edited: RunOptions = {
      settings: someSettings(next),
      format: formats[Math.floor(next() * 3)] ?? 'cbz',
    };

    const item = itemOptionsFor(queue, edited, false);
    const made = effectiveOptions(queue, item, false);

    expect(normalized(made.settings)).toEqual(normalized(edited.settings));
    expect(made.format).toBe(edited.format);
  });

  it.each(cases)('holds only what differs, and nothing when nothing does (seed %i)', (seed) => {
    const next = random(seed);
    const queue: RunOptions = { settings: someSettings(next), format: 'cbz' };
    const edited: RunOptions = { settings: someSettings(next), format: 'epub' };

    expect(itemOptionsFor(queue, queue, false)).toBeUndefined();
    const item = itemOptionsFor(queue, edited, false);
    for (const [field, value] of Object.entries(item?.settings ?? {})) {
      const queueValue = queue.settings[field as keyof MangapressSettings];
      expect(value === null ? undefined : value).not.toBe(queueValue);
    }
    // Setting back what the queue has is not a difference.
    expect(itemOptionsFor(queue, effectiveOptions(queue, item, false), false)).toEqual(item);
  });

  it.each(cases)('leaves the options of the queue as they were (seed %i)', (seed) => {
    const next = random(seed);
    const queue: RunOptions = { settings: someSettings(next), format: 'pdf' };
    const before = structuredClone(queue);
    const item = itemOptionsFor(queue, { settings: someSettings(next), format: 'epub' }, false);

    effectiveOptions(queue, item, false);

    expect(queue).toEqual(before);
  });

  it.each(cases)('never changes the format under one book per series (seed %i)', (seed) => {
    const next = random(seed);
    const queue: RunOptions = { settings: someSettings(next), format: 'epub' };
    const edited: RunOptions = { settings: someSettings(next), format: formats[seed % 3] ?? 'cbz' };

    const item = itemOptionsFor(queue, edited, true);

    expect(item?.format).toBeUndefined();
    expect(effectiveOptions(queue, item, true).format).toBe('epub');
  });
});
