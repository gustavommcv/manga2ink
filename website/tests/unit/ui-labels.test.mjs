import assert from 'node:assert/strict';
import { test } from 'node:test';

import { boldPhrases, isNotALabel, missingLabels, plain } from '../../scripts/ui-labels.mjs';

test('the bold phrases of a page are read in order, and code is not emphasis', () => {
  const page = [
    'Press **Save all** or **Delete**.',
    '```',
    '**not emphasis**',
    '```',
    'Write `**nor this**` too, then **Save all** again.',
  ].join('\n');

  assert.deepEqual(boldPhrases(page), ['Save all', 'Delete', 'Save all']);
});

test('curly quotes and runs of white space are the same as plain ones', () => {
  assert.equal(plain('Use the queue’s  options\n for “all”'), 'Use the queue\'s options for "all"');
});

test('what is not the name of something in the interface is left alone', () => {
  for (const phrase of [
    'Tools → More tools',
    '[mangabind](https://example.org)',
    'src/adapters/',
    'directory_defaults.lua',
    'Mangabound.app',
    'A sentence that is emphasized.',
    'Is it?',
    'one two three four five six seven eight nine ten',
  ]) {
    assert.equal(isNotALabel(phrase), true, phrase);
  }
  for (const phrase of ['Save all', 'Create one book for the series', 'Password (optional)']) {
    assert.equal(isNotALabel(phrase), false, phrase);
  }
});

test('a name that is not in the interface is reported once, unless the guide is allowed it', () => {
  const interfaceText = 'label="Use the queue’s options" <Button>Save all</Button>';
  const page =
    "**Use the queue's options**, **Save all**, **Delete all**, **Delete all**, **Odd**.";

  assert.deepEqual(missingLabels(page, interfaceText), ['Delete all', 'Odd']);
  assert.deepEqual(missingLabels(page, interfaceText, new Set(['Odd'])), ['Delete all']);
});
