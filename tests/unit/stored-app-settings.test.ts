import { describe, expect, it } from 'vitest';

import {
  appSettingsFileVersion,
  parseStoredAppSettings,
  serializeStoredAppSettings,
} from '@/adapters/settings/stored-app-settings';
import { defaultAppSettings } from '@/domain/app-settings';

const file = (contents: Record<string, unknown>): string =>
  JSON.stringify({ version: appSettingsFileVersion, ...contents });

describe('reading the file of the app settings', () => {
  it('gives the language the file holds', () => {
    expect(parseStoredAppSettings(file({ language: 'pt-BR' }))).toEqual({ language: 'pt-BR' });
    expect(parseStoredAppSettings(file({ language: 'system' }))).toEqual({ language: 'system' });
  });

  it('follows the system when the file does not say', () => {
    expect(parseStoredAppSettings(file({}))).toEqual(defaultAppSettings);
  });

  it.each([
    ['a language this build does not have', 'ja'],
    ['a language written another way', 'pt_br'],
    ['a number', 3],
    ['nothing', null],
  ])('follows the system when the language is %s', (_name, language) => {
    expect(parseStoredAppSettings(file({ language }))).toEqual(defaultAppSettings);
  });

  it('keeps nothing that it does not know', () => {
    expect(parseStoredAppSettings(file({ language: 'en', folder: '/somewhere' }))).toEqual({
      language: 'en',
    });
  });

  it.each([
    ['not JSON', 'not json'],
    ['an empty file', ''],
    ['an array', '[]'],
    ['null', 'null'],
    ['a number', '3'],
    ['a file with no version', JSON.stringify({ language: 'en' })],
    ['a file of another version', JSON.stringify({ version: 99, language: 'en' })],
  ])('cannot use %s', (_name, text) => {
    expect(parseStoredAppSettings(text)).toBeUndefined();
  });
});

describe('writing the file of the app settings', () => {
  it('writes the version and the language, on lines of their own', () => {
    expect(serializeStoredAppSettings({ language: 'pt-BR' })).toBe(
      `{\n  "version": ${String(appSettingsFileVersion)},\n  "language": "pt-BR"\n}\n`,
    );
  });

  it('writes what it reads back', () => {
    expect(parseStoredAppSettings(serializeStoredAppSettings({ language: 'en' }))).toEqual({
      language: 'en',
    });
  });
});
