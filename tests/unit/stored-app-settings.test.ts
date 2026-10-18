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
  ...defaultKeptAppSettings,
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
  it('writes the version and the choices, on lines of their own', () => {
    expect(serializeStoredAppSettings(kept('pt-BR'))).toBe(
      `{\n  "version": ${String(appSettingsFileVersion)},\n  "language": "pt-BR",\n  "notifyWhenDone": true,\n  "keepAwake": true,\n  "theme": "dark",\n  "parallelConversions": "automatic",\n  "processingFolder": null,\n  "earlierProcessingFolders": []\n}\n`,
    );
  });

  it('writes a yes or no that was turned off, and reads it back', () => {
    const settings: KeptAppSettings = { ...kept('en'), notifyWhenDone: false, keepAwake: false };

    expect(serializeStoredAppSettings(settings)).toContain('"notifyWhenDone": false');
    expect(serializeStoredAppSettings(settings)).toContain('"keepAwake": false');
    expect(parseStoredAppSettings(serializeStoredAppSettings(settings))).toEqual(settings);
  });

  it('writes what it reads back', () => {
    expect(parseStoredAppSettings(serializeStoredAppSettings(kept('en')))).toEqual(kept('en'));
  });
});

describe('the choices about a queue, in the file', () => {
  it('start on for a file an earlier version wrote, which does not have them', () => {
    expect(parseStoredAppSettings(file({ language: 'en' }))).toMatchObject({
      notifyWhenDone: true,
      keepAwake: true,
    });
  });

  it('give the yes or no the file holds, each on its own', () => {
    expect(parseStoredAppSettings(file({ notifyWhenDone: false, keepAwake: true }))).toMatchObject({
      notifyWhenDone: false,
      keepAwake: true,
    });
    expect(parseStoredAppSettings(file({ notifyWhenDone: true, keepAwake: false }))).toMatchObject({
      notifyWhenDone: true,
      keepAwake: false,
    });
  });

  it.each([
    ['a text', 'no'],
    ['a number', 0],
    ['nothing', null],
  ])('start on when the file has %s in place of a yes or no', (_name, value) => {
    expect(parseStoredAppSettings(file({ notifyWhenDone: value, keepAwake: value }))).toMatchObject(
      { notifyWhenDone: true, keepAwake: true },
    );
  });
});

describe('the theme, in the file', () => {
  it('is the default one for a file that does not have it, which an earlier version wrote', () => {
    expect(parseStoredAppSettings(file({ language: 'en' }))?.theme).toBe('dark');
  });

  it.each(['dark', 'light'] as const)(
    'is the one the file holds, when this build has it: %s',
    (theme) => {
      expect(parseStoredAppSettings(file({ theme }))?.theme).toBe(theme);
    },
  );

  it.each([
    ['a theme this build does not have, one a newer version added', 'neon'],
    ['a theme written another way', 'Dark'],
    ['a number', 3],
    ['nothing', null],
  ])('is the default one when the file has %s', (_name, theme) => {
    expect(parseStoredAppSettings(file({ theme }))).toEqual(defaultKeptAppSettings);
  });

  it.each(['dark', 'light'] as const)('is written, and read back as it was: %s', (theme) => {
    const settings: KeptAppSettings = { ...kept('en'), theme };

    expect(serializeStoredAppSettings(settings)).toContain(`"theme": "${theme}"`);
    expect(parseStoredAppSettings(serializeStoredAppSettings(settings))).toEqual(settings);
  });
});

describe('how many are converted at once, in the file', () => {
  it('is the app’s own count for a file that does not have it, which an earlier version wrote', () => {
    expect(parseStoredAppSettings(file({ language: 'en' }))?.parallelConversions).toBe('automatic');
  });

  it.each(['automatic', 1, 2, 3, 4, 6, 8] as const)(
    'is the one the file holds: %s',
    (parallelConversions) => {
      expect(parseStoredAppSettings(file({ parallelConversions }))?.parallelConversions).toBe(
        parallelConversions,
      );
    },
  );

  it.each([
    ['a number this build does not allow', 5],
    ['one that is too many', 9],
    ['zero', 0],
    ['a number written as text', '2'],
    ['a count that is not whole', 1.5],
    ['nothing', null],
  ])('is the app’s own count when the file has %s', (_name, parallelConversions) => {
    expect(parseStoredAppSettings(file({ parallelConversions }))).toEqual(defaultKeptAppSettings);
  });

  it.each(['automatic', 1, 2, 3, 4, 6, 8] as const)(
    'is written, and read back as it was: %s',
    (choice) => {
      const settings: KeptAppSettings = { ...kept('en'), parallelConversions: choice };

      expect(serializeStoredAppSettings(settings)).toContain(
        `"parallelConversions": ${JSON.stringify(choice)}`,
      );
      expect(parseStoredAppSettings(serializeStoredAppSettings(settings))).toEqual(settings);
    },
  );
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
