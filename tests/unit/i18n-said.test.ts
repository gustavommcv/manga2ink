import { describe, expect, it } from 'vitest';

import { languages } from '@/domain/app-settings';
import { type AnyMessage, type MessageId, message, raw } from '@/domain/message';
import { messagesFor } from '@/i18n/messages';
import { sentenceMarks } from '@/i18n/sentence-marks';
import { namesOf, say, sayAll } from '@/i18n/say';

import { failureRows } from './support/said-failure-rows';
import { japaneseRows } from './support/said-japanese-rows';
import { libraryRows } from './support/said-library-rows';
import { mappingRows } from './support/said-mapping-rows';
import { optionsRows } from './support/said-options-rows';
import { queueRows } from './support/said-queue-rows';
import { runRows } from './support/said-run-rows';
import { toolchainRows } from './support/said-toolchain-rows';
import { warningRows } from './support/said-warning-rows';

/**
 * Every message the domain, the workflows and the main process say by code, in each of the forms it has:
 * what it says in English (which is what the app has always said, character for character) and in
 * Portuguese here and in the tables of `support/`, and in Japanese in `japaneseRows`. The compiler
 * fails for a code that has no row.
 */
const table = {
  ...queueRows,
  ...failureRows,
  ...mappingRows,
  ...libraryRows,
  ...optionsRows,
  ...runRows,
  ...warningRows,
  ...toolchainRows,
};

const entries = Object.entries(table) as readonly (readonly [
  MessageId,
  readonly (readonly [unknown, string, string])[],
])[];

describe('what is said by code', () => {
  it('has a row in this table for every code, and a sentence for every code in every language', () => {
    const codes = Object.keys(table).sort();

    for (const language of languages) {
      expect(Object.keys(messagesFor(language).said).sort()).toEqual(codes);
    }
  });

  it.each(entries.flatMap(([id, forms]) => forms.map((form) => [id, form] as const)))(
    'says %s in English as the app always said it, and in Portuguese',
    (id, [values, english, portuguese]) => {
      const one = message(id, values as never) as AnyMessage;

      expect(say(messagesFor('en').said, one)).toBe(english);
      expect(say(messagesFor('pt-BR').said, one)).toBe(portuguese);
    },
  );

  it('has a Japanese text for every form of every row, and for no other', () => {
    expect(Object.keys(japaneseRows).sort()).toEqual(Object.keys(table).sort());
    for (const [id, forms] of entries) {
      expect(japaneseRows[id], id).toHaveLength(forms.length);
    }
  });

  it.each(
    entries.flatMap(([id, forms]) =>
      forms.map(([values], form) => [id, values, japaneseRows[id][form]] as const),
    ),
  )('says %s in Japanese', (id, values, japanese) => {
    const one = message(id, values as never) as AnyMessage;

    expect(say(messagesFor('ja').said, one)).toBe(japanese);
  });

  it('writes what someone else wrote as it is, in any language', () => {
    for (const language of languages) {
      expect(say(messagesFor(language).said, raw('ENOSPC: no space left on device'))).toBe(
        'ENOSPC: no space left on device',
      );
    }
  });
});

describe('sayAll', () => {
  it('writes messages that follow one another as the sentences of one note', () => {
    const said = messagesFor('en').said;

    expect(
      sayAll(said, [
        message('queue.note.chaptersLeftOut', { count: 2 }),
        message('queue.note.libraryEmpty', {}),
      ]),
    ).toBe('2 chapters left out. mangabind found no manga in this folder.');
    expect(sayAll(said, [])).toBe('');
  });

  it('puts what the language puts between sentences, which is nothing in Japanese', () => {
    const notes = [
      message('queue.note.chaptersLeftOut', { count: 2 }),
      message('queue.note.libraryEmpty', {}),
    ];

    expect(sentenceMarks).toEqual({
      en: { gap: ' ', stop: '.' },
      'pt-BR': { gap: ' ', stop: '.' },
      ja: { gap: '', stop: '。' },
    });
    expect(sayAll(messagesFor('ja').said, notes, sentenceMarks.ja.gap)).toBe(
      '2 話が対象外です。このフォルダーに、mangabind はマンガを見つけられませんでした。',
    );
  });
});

describe('namesOf', () => {
  const more = (count: number): string => ` and ${String(count)} more`;

  it('spells out up to three names, and says how many more there are', () => {
    expect(namesOf(['A', 'B', 'C'], more)).toBe('A, B, C');
    expect(namesOf(['A', 'B', 'C', 'D'], more)).toBe('A, B, C and 1 more');
    expect(namesOf(['A', 'B', 'C', 'D', 'E', 'F'], more)).toBe('A, B, C and 3 more');
    expect(namesOf([], more)).toBe('');
  });

  it('joins them as the language writes a list', () => {
    expect(namesOf(['A', 'B', 'C', 'D'], more, '、')).toBe('A、B、C and 1 more');
    expect(namesOf(['A', 'B'], more, '、')).toBe('A、B');
  });
});
