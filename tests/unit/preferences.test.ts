import { describe, expect, it } from 'vitest';

import { defaultMangaprepSettings } from '@/domain/output-profile';
import {
  defaultFormat,
  defaultPreferences,
  isDefaultMangaprep,
  sameSettings,
} from '@/domain/preferences';
import { defaultProcessMode } from '@/domain/process-mode';

describe('the defaults everything starts from', () => {
  it('are the process, format and options a first launch has', () => {
    expect(defaultPreferences).toEqual({
      mode: defaultProcessMode,
      format: 'cbz',
      settings: defaultMangaprepSettings,
    });
    expect(defaultFormat).toBe('cbz');
    expect(defaultPreferences.providerId).toBeUndefined();
  });

  it('cannot be changed by whoever holds them', () => {
    expect(Object.isFrozen(defaultPreferences)).toBe(true);
  });
});

describe('sameSettings', () => {
  it('is true for the same options, however they were built', () => {
    expect(sameSettings(defaultMangaprepSettings, { ...defaultMangaprepSettings })).toBe(true);
  });

  it('is false when any one option differs', () => {
    expect(
      sameSettings(defaultMangaprepSettings, { ...defaultMangaprepSettings, quiet: true }),
    ).toBe(false);
    expect(
      sameSettings(defaultMangaprepSettings, { ...defaultMangaprepSettings, jpegQuality: 90 }),
    ).toBe(false);
    expect(
      sameSettings({ ...defaultMangaprepSettings, jpegQuality: 90 }, defaultMangaprepSettings),
    ).toBe(false);
  });

  it('counts an option that was cleared as one that was never set', () => {
    expect(
      sameSettings(defaultMangaprepSettings, { ...defaultMangaprepSettings, gamma: undefined }),
    ).toBe(true);
  });
});

describe('isDefaultMangaprep', () => {
  it('is true for the format and options a fresh start has', () => {
    expect(isDefaultMangaprep('cbz', defaultMangaprepSettings)).toBe(true);
  });

  it('is false once the format or an option was changed', () => {
    expect(isDefaultMangaprep('pdf', defaultMangaprepSettings)).toBe(false);
    expect(isDefaultMangaprep('epub', { ...defaultMangaprepSettings, splitter: 'split' })).toBe(
      false,
    );
    expect(isDefaultMangaprep('epub', { ...defaultMangaprepSettings, language: 'pt-br' })).toBe(
      false,
    );
  });
});
