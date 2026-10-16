import { describe, expect, it } from 'vitest';

import {
  defaultAppSettings,
  defaultLanguage,
  isLanguagePreference,
  languagePreferences,
  languages,
  resolveLanguage,
} from '@/domain/app-settings';

describe('the languages of the app', () => {
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
