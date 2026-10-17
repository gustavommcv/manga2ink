import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import fc from 'fast-check';

import {
  choosingFolder,
  defaultAppSettings,
  defaultKeptAppSettings,
  defaultProcessingChoice,
  forgettingFolders,
  type ProcessingChoice,
  defaultLanguage,
  isLanguagePreference,
  languagePreferences,
  languages,
  resolveLanguage,
} from '@/domain/app-settings';

describe('the languages of the app', () => {
  it('are the ones the website says the application is in, which its structured data tells search engines', async () => {
    const site = await readFile(path.resolve('website/site.config.mjs'), 'utf8');
    const declared = /export const appLanguages = \[([^\]]*)\]/u.exec(site)?.[1] ?? '';

    expect(declared.split(',').map((tag) => tag.trim().replaceAll("'", ''))).toEqual([
      ...languages,
    ]);
  });

  it('start in English, the language every message is first written in', () => {
    expect(defaultLanguage).toBe('en');
    expect(languages[0]).toBe(defaultLanguage);
  });

  it('are the choices a person has, after following the system', () => {
    expect(languagePreferences).toEqual(['system', ...languages]);
  });

  it('start by following the system', () => {
    expect(defaultAppSettings).toEqual({ language: 'system' });
    expect(Object.isFrozen(defaultAppSettings)).toBe(true);
  });
});

describe('isLanguagePreference', () => {
  it.each(['system', ...languages])('accepts %s', (value) => {
    expect(isLanguagePreference(value)).toBe(true);
  });

  it.each(['', 'ja-JP', 'EN', 'pt', undefined, null, 3, {}])('refuses %j', (value) => {
    expect(isLanguagePreference(value)).toBe(false);
  });
});

describe('resolveLanguage', () => {
  it('gives the language that was chosen, whatever the system says', () => {
    expect(resolveLanguage('en', ['pt-BR'])).toBe('en');
    expect(resolveLanguage('pt-BR', ['en-US'])).toBe('pt-BR');
    expect(resolveLanguage('pt-BR', [])).toBe('pt-BR');
  });

  it('follows the first language of the system that the app has', () => {
    expect(resolveLanguage('system', ['pt-BR', 'en-US'])).toBe('pt-BR');
    expect(resolveLanguage('system', ['en-US', 'pt-BR'])).toBe('en');
  });

  it('skips a language of the system that the app does not have', () => {
    expect(resolveLanguage('system', ['fr-FR', 'pt-BR'])).toBe('pt-BR');
  });

  it('matches the whole tag, however it is written', () => {
    expect(resolveLanguage('system', ['pt-br'])).toBe('pt-BR');
    expect(resolveLanguage('system', ['PT_BR'])).toBe('pt-BR');
  });

  it('gives a variety of a language the app has the one it has', () => {
    expect(resolveLanguage('system', ['pt-PT'])).toBe('pt-BR');
    expect(resolveLanguage('system', ['pt'])).toBe('pt-BR');
    expect(resolveLanguage('system', ['en-GB'])).toBe('en');
  });

  it('prefers the whole tag of a language over a variety of it that comes first', () => {
    expect(resolveLanguage('system', ['en-GB', 'pt-BR'])).toBe('en');
  });

  it('is English when nothing the system lists is a language the app has', () => {
    expect(resolveLanguage('system', ['fr-FR', 'de'])).toBe(defaultLanguage);
    expect(resolveLanguage('system', [])).toBe(defaultLanguage);
  });

  it('ignores what is not a language tag', () => {
    expect(resolveLanguage('system', ['', '*', '  '])).toBe(defaultLanguage);
    expect(resolveLanguage('system', ['', 'pt-BR'])).toBe('pt-BR');
  });
});

describe('where the app works', () => {
  it('starts in the places the app picks itself, with nothing earlier', () => {
    expect(defaultProcessingChoice).toEqual({ folder: null, earlier: [] });
    expect(defaultKeptAppSettings).toEqual({
      ...defaultAppSettings,
      processing: defaultProcessingChoice,
    });
  });

  it('is left as it is by choosing the folder that is already chosen', () => {
    const choice: ProcessingChoice = { folder: '/big', earlier: ['/old'] };

    expect(choosingFolder(choice, '/big')).toBe(choice);
    expect(choosingFolder(defaultProcessingChoice, null)).toBe(defaultProcessingChoice);
  });

  it('makes the folder it replaces an earlier one, the latest first', () => {
    expect(choosingFolder({ folder: '/one', earlier: ['/zero'] }, '/two')).toEqual({
      folder: '/two',
      earlier: ['/one', '/zero'],
    });
  });

  it('has nothing earlier to add when the app was in its own places', () => {
    expect(choosingFolder(defaultProcessingChoice, '/big')).toEqual({
      folder: '/big',
      earlier: [],
    });
  });

  it('puts the app back in its own places, and keeps the folder it leaves', () => {
    expect(choosingFolder({ folder: '/big', earlier: [] }, null)).toEqual({
      folder: null,
      earlier: ['/big'],
    });
  });

  it('takes a folder that comes back out of the earlier ones', () => {
    expect(choosingFolder({ folder: '/two', earlier: ['/one', '/zero'] }, '/one')).toEqual({
      folder: '/one',
      earlier: ['/two', '/zero'],
    });
  });

  it('never has the chosen folder among the earlier ones, nor one of them twice', () => {
    const folders = fc.constantFrom('/a', '/b', '/c', '/d', null);
    fc.assert(
      fc.property(fc.array(folders, { maxLength: 30 }), (choices) => {
        const choice = choices.reduce(choosingFolder, defaultProcessingChoice);
        expect(choice.folder === null ? true : !choice.earlier.includes(choice.folder)).toBe(true);
        expect(new Set(choice.earlier).size).toBe(choice.earlier.length);
        expect(choice.earlier).not.toContain(null);
      }),
    );
  });

  it('remembers every folder it has left, until they are forgotten', () => {
    const folders = fc.constantFrom('/a', '/b', '/c', '/d');
    fc.assert(
      fc.property(fc.array(folders, { minLength: 1, maxLength: 30 }), (choices) => {
        const choice = choices.reduce(choosingFolder, defaultProcessingChoice);
        for (const used of new Set(choices)) {
          expect(used === choice.folder || choice.earlier.includes(used)).toBe(true);
        }
      }),
    );
  });

  it('forgets earlier folders, and is the same choice when it forgets none', () => {
    const choice: ProcessingChoice = { folder: '/now', earlier: ['/a', '/b', '/c'] };

    expect(forgettingFolders(choice, ['/b', '/c'])).toEqual({ folder: '/now', earlier: ['/a'] });
    expect(forgettingFolders(choice, ['/elsewhere', '/now'])).toBe(choice);
    expect(forgettingFolders(choice, [])).toBe(choice);
  });
});
