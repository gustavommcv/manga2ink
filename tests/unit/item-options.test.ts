import { describe, expect, it } from 'vitest';

import {
  effectiveOptions,
  hasItemOptions,
  itemOptionsFor,
  type RunOptions,
} from '@/domain/item-options';
import { defaultMangapressSettings, withDeviceProfile } from '@/domain/output-profile';

const queue: RunOptions = { settings: defaultMangapressSettings, format: 'cbz' };

describe('item options', () => {
  it('is nothing until an item sets an option', () => {
    expect(hasItemOptions(undefined)).toBe(false);
    expect(hasItemOptions({})).toBe(false);
    expect(hasItemOptions({ settings: {} })).toBe(false);
    expect(hasItemOptions({ format: 'epub' })).toBe(true);
    expect(hasItemOptions({ settings: { webtoon: true } })).toBe(true);
  });

  it('converts with the options of the queue when the item sets none', () => {
    expect(effectiveOptions(queue, undefined, false)).toBe(queue);
    expect(effectiveOptions(queue, {}, false)).toBe(queue);
  });

  it('lays what an item set over the options of the queue', () => {
    const run = effectiveOptions(
      queue,
      { settings: { webtoon: true, deviceProfile: 'KoC' }, format: 'epub' },
      false,
    );
    expect(run.format).toBe('epub');
    expect(run.settings).toEqual({
      ...defaultMangapressSettings,
      webtoon: true,
      deviceProfile: 'KoC',
    });
  });

  it('is only the format when that is all the item set', () => {
    const run = effectiveOptions(queue, { format: 'pdf' }, false);
    expect(run.format).toBe('pdf');
    expect(run.settings).toEqual(queue.settings);
  });

  it('follows a later change of the queue for what the item left alone', () => {
    const item = { settings: { webtoon: true } };
    const later: RunOptions = {
      settings: { ...defaultMangapressSettings, deviceProfile: 'KoC', jpegQuality: 70 },
      format: 'pdf',
    };
    const run = effectiveOptions(later, item, false);
    expect(run.settings.webtoon).toBe(true);
    expect(run.settings.deviceProfile).toBe('KoC');
    expect(run.settings.jpegQuality).toBe(70);
    expect(run.format).toBe('pdf');
  });

  it('leaves an option unset where the item says so, though the queue has it', () => {
    const withQuality: RunOptions = {
      settings: { ...defaultMangapressSettings, jpegQuality: 70 },
      format: 'cbz',
    };
    const run = effectiveOptions(withQuality, { settings: { jpegQuality: null } }, false);
    expect('jpegQuality' in run.settings).toBe(false);
  });

  it('keeps the format of the queue under one book per series', () => {
    const run = effectiveOptions(
      { settings: defaultMangapressSettings, format: 'epub' },
      { format: 'pdf', settings: { webtoon: true } },
      true,
    );
    expect(run.format).toBe('epub');
    expect(run.settings.webtoon).toBe(true);
  });

  it('finds only what an edited set of options changes', () => {
    const edited: RunOptions = {
      settings: withDeviceProfile({ ...defaultMangapressSettings, webtoon: true }, 'KoC'),
      format: 'epub',
    };
    const item = itemOptionsFor(queue, edited, false);
    expect(item?.format).toBe('epub');
    expect(item?.settings?.webtoon).toBe(true);
    expect(item?.settings?.deviceProfile).toBe('KoC');
    expect(item?.settings).not.toHaveProperty('mangaStyle');
    // What was found lays back over the queue to give the edited options again.
    expect(effectiveOptions(queue, item, false)).toEqual(edited);
  });

  it('finds nothing to set when the edit is the queue again', () => {
    expect(itemOptionsFor(queue, { ...queue }, false)).toBeUndefined();
  });

  it('records an option cleared in the edit as unset', () => {
    const withQuality: RunOptions = {
      settings: { ...defaultMangapressSettings, jpegQuality: 70 },
      format: 'cbz',
    };
    const item = itemOptionsFor(
      withQuality,
      { settings: defaultMangapressSettings, format: 'cbz' },
      false,
    );
    expect(item).toEqual({ settings: { jpegQuality: null } });
  });

  it('records no format under one book per series', () => {
    const item = itemOptionsFor(
      { settings: defaultMangapressSettings, format: 'epub' },
      { settings: { ...defaultMangapressSettings, webtoon: true }, format: 'pdf' },
      true,
    );
    expect(item).toEqual({ settings: { webtoon: true } });
  });
});
