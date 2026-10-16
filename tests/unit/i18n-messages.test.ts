import { describe, expect, it } from 'vitest';

import { languages } from '@/domain/app-settings';
import { languageNames, messagesFor } from '@/renderer/i18n/messages';

/** Every message of a catalog with the path that names it, so one that is wrong can be found. */
function messagePaths(value: unknown, path = ''): readonly (readonly [string, unknown])[] {
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, inner]) =>
      messagePaths(inner, path === '' ? key : `${path}.${key}`),
    );
  }
  return [[path, value]];
}

describe('the messages of the app', () => {
  it.each(languages)('are all there in %s, and none of them is empty', (language) => {
    for (const [path, message] of messagePaths(messagesFor(language))) {
      expect(typeof message, path).toBe('string');
      expect((message as string).trim(), path).not.toBe('');
    }
  });

  it.each(languages)('say the same things in %s as in English', (language) => {
    expect(messagePaths(messagesFor(language)).map(([path]) => path)).toEqual(
      messagePaths(messagesFor('en')).map(([path]) => path),
    );
  });

  it('are one object for a language, so the same one is the same language', () => {
    expect(messagesFor('en')).toBe(messagesFor('en'));
    expect(messagesFor('pt-BR')).not.toBe(messagesFor('en'));
  });
});

describe('the names of the languages', () => {
  it('have one for each language, written in the language itself', () => {
    expect(Object.keys(languageNames).sort()).toEqual([...languages].sort());
    expect(languageNames).toEqual({ en: 'English', 'pt-BR': 'Português (Brasil)' });
  });

  it('are different from one another, or a list of them could not be told apart', () => {
    expect(new Set(Object.values(languageNames)).size).toBe(languages.length);
  });
});
