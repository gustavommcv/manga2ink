import { describe, expect, it } from 'vitest';

import { languages } from '@/domain/app-settings';
import { languageNames, messagesFor } from '@/i18n/messages';

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
  'appSettings.openTip': [['Ctrl+,'], ['⌘,']],
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
  'queue.run.lowSpace': [['1.5 GB', '3 GB']],
  'queue.plans.pages': [[1], [2]],
  'queue.plans.oneBookFor': [['Berserk']],
  'queue.pending.andMore': [
    ['Vol.01', 1],
    ['Vol.01', 2],
  ],
  'queue.pending.viewBooksFrom': [['Vol.01']],
  'queue.pending.deleteFrom': [['Vol.01']],
  'queue.pending.confirmDeletion': [['Vol.01']],
  'queue.pending.question': [[1], [2]],
  'processing.earlier.books': [[1], [2]],
  'processing.queue.notify.help': [[30]],
  'dialogs.queueEnded.done.body': [[1], [3]],
  'dialogs.queueEnded.notes.body': [[1], [3]],
  'dialogs.queueEnded.failures.body': [
    [0, 2],
    [1, 1],
    [3, 2],
  ],
  'processing.waiting.summary': [
    [1, 1, '480 MB'],
    [5, 2, '1.2 GB'],
  ],
  'processing.waiting.days': [[7], [30], [90]],
  'processing.waiting.nothingIdle': [[30]],
  'processing.waiting.question': [
    [1, 1, '480 MB', 30],
    [2, 3, '1.2 GB', 90],
  ],
  'processing.waiting.deleted': [
    [1, '480 MB'],
    [2, '1.2 GB'],
  ],
  'mapping.editor.origin.suggestedBy': [['MangaDex']],
  'mapping.editor.title': [[''], ['Chainsaw Man']],
  'mapping.editor.start.createVolume': [['1']],
  'mapping.editor.chapters.selected': [
    [0, 3],
    [1, 3],
    [3, 3],
  ],
  'mapping.editor.chapters.select': [['Ch.1']],
  'mapping.editor.chapters.pages': [[1], [2]],
  'mapping.editor.chapters.volume': [['1']],
  'mapping.editor.volumes.created': [[0], [1], [2]],
  'mapping.editor.volumes.numberFor': [['1']],
  'mapping.editor.volumes.remove': [['1']],
  'mapping.editor.volumes.chapterCount': [[1], [2]],
  'mapping.editor.volumes.splitLabel': [['1']],
  'mapping.editor.volumes.mergeInto': [['1']],
  'mapping.summary.counts': [
    [1, 1, 1],
    [2, 3, 3],
  ],
  'mapping.summary.volumeLine': [
    [0, '', ''],
    [1, 'Ch.1', 'Ch.1'],
    [3, 'Ch.1', 'Ch.3'],
  ],
  'mapping.chaptersFrom.names.none': [[true], [false]],
  'mapping.chaptersFrom.names.read': [
    [1, 1],
    [2, 5],
  ],
  'mapping.chaptersFrom.manual.buildOrTry': [['Online source']],
  'mapping.chaptersFrom.online.open': [['MangaDex']],
  'mapping.chaptersFrom.online.search': [['MangaDex']],
  'mapping.chaptersFrom.online.privacy': [['MangaDex']],
  'mapping.chaptersFrom.online.language': [['ja']],
  'mapping.noMatches.text': [
    ['Work', 'search'],
    ['Work', 'title'],
  ],
  'running.item': [[1, 3]],
  'running.heading.binding': [['Berserk']],
  'running.heading.converting': [['Berserk']],
  'running.percentComplete': [[0], [50]],
  'running.pagesCopied': [[4, 10]],
  'running.details.volume': [[1]],
  'running.details.volumeProgress': [[1]],
  'results.ready': [[1], [2]],
  'results.saveBookAs': [['Vol.01.epub']],
  'results.showInFolder': [['Vol.01.epub']],
  'results.open': [['Vol.01.epub']],
  'results.failed': [['Berserk']],
  'results.skipped': [['Berserk']],
  'results.fixBook': [['Berserk']],
  'updates.upToDate': [['0.1.0-alpha.15']],
  'updates.available': [
    ['0.1.0-alpha.16', 'October 20, 2026'],
    ['0.1.0-alpha.16', undefined],
  ],
  'library.summary': [[1], [3]],
  'library.chips.volumes': [[1], [2]],
  'library.chapters': [
    [1, 0],
    [3, 0],
    [3, 1],
    [5, 2],
  ],
  'library.editOptions': [[false], [true]],
  'details.language.use': [['en-US']],
  'details.language.foldersSay': [['ja']],
  'details.language.foldersSayButOnlyEpub': [['ja']],
  'details.titled.more': [[1], [4]],
  'details.lookup.willSearch': [['MangaDex', 'Work']],
  'details.lookup.useLabel': [['Author', 'Work']],
  'details.covers.fromFolder': [['01.jpg']],
  'details.covers.choose': [['Vol.1']],
  'details.covers.change': [['Vol.1']],
  'details.covers.remove': [['Vol.1']],
  'options.item.title': [['Series']],
  'options.overrides.some': [[1], [3]],
  'options.overrides.cleared': [[1], [3]],
  'fields.device.profile.detail': [[1272, 1696, 16]],
  'fields.images.jpegQuality.hint': [[85]],
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
        // What is said by code has a table of its own, typed by the codes (i18n-said.test.ts).
        if (typeof message !== 'function' || path.startsWith('said.')) continue;
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
