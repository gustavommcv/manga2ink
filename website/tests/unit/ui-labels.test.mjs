import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  boldPhrases,
  interfaceTextFor,
  isNotALabel,
  missingLabels,
  plain,
  sectionsOf,
} from '../../scripts/ui-labels.mjs';

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
    'Manga2Ink.app',
    'A sentence that is emphasized.',
    'Is it?',
    '文が強調されています。',
    'そうでしょうか？',
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

const tags = ['en', 'pt-BR', 'ja'];
const catalog = [
  '/** What the queue says. */',
  'export interface Words { readonly title: string }',
  'export const words = {',
  "  en: { title: 'Queue' },",
  "  'pt-BR': { title: 'Fila' },",
  '};',
].join('\n');

test('what each language says is read from its entry of a catalog, and the types are no language’s', () => {
  const sections = sectionsOf(catalog, tags);

  assert.deepEqual([...sections.keys()], ['en', 'pt-BR']);
  assert.match(sections.get('en'), /Queue/u);
  assert.doesNotMatch(sections.get('en'), /Fila|What the queue says/u);
  assert.match(sections.get('pt-BR'), /Fila/u);
  assert.doesNotMatch(sections.get('pt-BR'), /Queue/u);
});

test('a source with two catalogs keeps what a language says in both, and one with none has no entries', () => {
  const twice = `${catalog}\nexport const more = {\n  en: { save: 'Save' },\n  'pt-BR': { save: 'Salvar' },\n};\n`;
  const sections = sectionsOf(twice, tags);

  assert.match(sections.get('en'), /Queue[\s\S]*Save/u);
  assert.match(sections.get('pt-BR'), /Fila[\s\S]*Salvar/u);
  assert.equal(sectionsOf("const name = { other: 'Manga2Ink' };", tags).size, 0);
});

test('the interface says in a language what its catalogs say in it, and a name written in a component in all', () => {
  const component = '<span>Manga2Ink</span>';
  const sources = [catalog, component];

  assert.match(interfaceTextFor('pt-BR', sources, tags), /Fila/u);
  assert.doesNotMatch(interfaceTextFor('pt-BR', sources, tags), /Queue/u);
  assert.match(interfaceTextFor('en', sources, tags), /Queue/u);
  assert.doesNotMatch(interfaceTextFor('en', sources, tags), /Fila/u);
  for (const tag of ['en', 'pt-BR']) {
    assert.match(interfaceTextFor(tag, sources, tags), /Manga2Ink/u);
  }
});

test('a language the app does not have yet says what English says, and a catalog with no English says nothing', () => {
  assert.match(interfaceTextFor('ja', [catalog], tags), /Queue/u);
  assert.doesNotMatch(interfaceTextFor('ja', [catalog], tags), /Fila/u);
  const onlyPortuguese = "export const words = {\n  'pt-BR': { title: 'Fila' },\n};";
  assert.equal(interfaceTextFor('ja', [onlyPortuguese], tags).trim(), '');
  assert.match(interfaceTextFor('ja', [onlyPortuguese], tags, 'pt-BR'), /Fila/u);
});
