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

/**
 * What each message that is a function is called with, in every form it has: a count of one and of
 * several, a thing that is set and one that is not. A message with no sample here fails below, so a
 * new one cannot be added without being said once in every language.
 */
const samples: Readonly<Record<string, readonly (readonly unknown[])[]>> = {
  'queue.row.editTitlesOf': [['Library']],
  'queue.row.editVolumesFor': [['Series']],
  'queue.row.editDetailsOf': [['Series']],
  'queue.row.editDetails': [[false], [true]],
  'queue.row.editOptionsOf': [['Series']],
  'queue.row.editOptions': [[false], [true]],
  'queue.row.remove': [['Series']],
  'queue.run.process': [[0], [1], [3]],
  'queue.run.reading': [[1], [2]],
  'queue.run.leftOut': [[1], [2]],
  'queue.plans.pages': [[1], [2]],
  'queue.pending.andMore': [
    ['Vol.01', 1],
    ['Vol.01', 2],
  ],
  'queue.pending.viewBooksFrom': [['Vol.01']],
  'queue.pending.deleteFrom': [['Vol.01']],
  'queue.pending.confirmDeletion': [['Vol.01']],
  'queue.pending.question': [[1], [2]],
  'settings.field.restoreDefault': [['Device']],
  'settings.field.useQueueValue': [['Device']],
};

describe('the messages of the app', () => {
  it.each(languages)('are all there in %s, and none of them is empty', (language) => {
    for (const [path, message] of messagePaths(messagesFor(language))) {
      // A message is a text, or a function that makes one from its values (the tests of each part
      // of the app call those with values, since what they say depends on them).
      expect(['string', 'function'], path).toContain(typeof message);
      if (typeof message === 'string') expect(message.trim(), path).not.toBe('');
    }
  });

  it.each(languages)('say the same things in %s as in English, in the same way', (language) => {
    const shape = (messages: unknown): readonly string[] =>
      messagePaths(messages).map(([path, message]) => `${path}: ${typeof message}`);

    expect(shape(messagesFor(language))).toEqual(shape(messagesFor('en')));
  });

  it.each(languages)(
    'say something, in %s, from each of the forms of every function',
    (language) => {
      for (const [path, message] of messagePaths(messagesFor(language))) {
        if (typeof message !== 'function') continue;
        const calls = samples[path];
        expect(calls, `a sample for ${path}`).toBeDefined();
        for (const values of calls ?? []) {
          const said = (message as (...given: unknown[]) => unknown)(...values);
          expect(typeof said, path).toBe('string');
          expect((said as string).trim(), path).not.toBe('');
        }
      }
    },
  );

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
