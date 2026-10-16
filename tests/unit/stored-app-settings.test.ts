import { describe, expect, it } from 'vitest';

import {
  appSettingsFileVersion,
  parseStoredAppSettings,
  serializeStoredAppSettings,
} from '@/adapters/settings/stored-app-settings';
import path from 'node:path';

import {
  defaultKeptAppSettings,
  defaultProcessingChoice,
  type KeptAppSettings,
  type LanguagePreference,
} from '@/domain/app-settings';

const kept = (
  language: LanguagePreference,
  processing = defaultProcessingChoice,
): KeptAppSettings => ({
  language,
  processing,
});
const folder = (...parts: string[]): string => path.resolve(...parts);

const file = (contents: Record<string, unknown>): string =>
  JSON.stringify({ version: appSettingsFileVersion, ...contents });

describe('reading the file of the app settings', () => {
  it('gives the language the file holds', () => {
    expect(parseStoredAppSettings(file({ language: 'pt-BR' }))).toEqual(kept('pt-BR'));
    expect(parseStoredAppSettings(file({ language: 'system' }))).toEqual(kept('system'));
  });

  it('follows the system when the file does not say', () => {
    expect(parseStoredAppSettings(file({}))).toEqual(defaultKeptAppSettings);
  });

  it.each([
    ['a language this build does not have', 'ja'],
    ['a language written another way', 'pt_br'],
    ['a number', 3],
    ['nothing', null],
  ])('follows the system when the language is %s', (_name, language) => {
    expect(parseStoredAppSettings(file({ language }))).toEqual(defaultKeptAppSettings);
  });

  it('keeps nothing that it does not know', () => {
    expect(parseStoredAppSettings(file({ language: 'en', folder: '/somewhere' }))).toEqual(
      kept('en'),
    );
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
    expect(serializeStoredAppSettings(kept('pt-BR'))).toBe(
      `{\n  "version": ${String(appSettingsFileVersion)},\n  "language": "pt-BR",\n  "processingFolder": null,\n  "earlierProcessingFolders": []\n}\n`,
    );
  });

  it('writes what it reads back', () => {
    expect(parseStoredAppSettings(serializeStoredAppSettings(kept('en')))).toEqual(kept('en'));
  });
});

describe('the folders the app works in, in the file', () => {
  it('are none for a file an earlier version wrote, which has only the language', () => {
    expect(parseStoredAppSettings(file({ language: 'en' }))?.processing).toBe(
      defaultProcessingChoice,
    );
  });

  it('give the folder that was chosen and the ones before it', () => {
    const processing = {
      folder: folder('big'),
      earlier: [folder('old', 'one'), folder('old', 'two')],
    };

    expect(
      parseStoredAppSettings(
        file({
          processingFolder: processing.folder,
          earlierProcessingFolders: processing.earlier,
        }),
      ),
    ).toEqual(kept('system', processing));
  });

  it.each([
    ['a relative path', 'books/work'],
    ['an empty text', ''],
    ['a number', 7],
    ['nothing', null],
  ])('read %s as no folder chosen', (_name, value) => {
    expect(parseStoredAppSettings(file({ processingFolder: value }))?.processing.folder).toBeNull();
  });

  it('keep only the earlier folders that are absolute paths, once each, and never the chosen one', () => {
    const chosen = folder('chosen');
    const processing = parseStoredAppSettings(
      file({
        processingFolder: chosen,
        earlierProcessingFolders: [
          folder('a'),
          'relative/path',
          3,
          folder('a'),
          chosen,
          null,
          folder('b'),
        ],
      }),
    )?.processing;

    expect(processing).toEqual({ folder: chosen, earlier: [folder('a'), folder('b')] });
  });

  it.each([
    ['a text', 'not a list'],
    ['an object', { a: 1 }],
    ['nothing', null],
  ])('read %s in place of the earlier folders as none', (_name, value) => {
    expect(
      parseStoredAppSettings(
        file({ processingFolder: folder('big'), earlierProcessingFolders: value }),
      )?.processing,
    ).toEqual({ folder: folder('big'), earlier: [] });
  });

  it('keep no more earlier folders than anyone could have used', () => {
    const many = Array.from({ length: 100 }, (_, index) => folder('earlier', String(index)));

    const processing = parseStoredAppSettings(file({ earlierProcessingFolders: many }))?.processing;

    expect(processing?.earlier).toEqual(many.slice(0, 32));
  });

  it('are written and read back as they were', () => {
    const settings = kept('pt-BR', { folder: folder('big'), earlier: [folder('old')] });

    expect(parseStoredAppSettings(serializeStoredAppSettings(settings))).toEqual(settings);
  });
});
