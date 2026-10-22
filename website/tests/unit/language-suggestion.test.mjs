import assert from 'node:assert/strict';
import test from 'node:test';

import {
  languageToSuggest,
  pathsInEachLanguage,
  preferredSiteLanguage,
} from '../../src/language-suggestion.mjs';

const siteLanguages = ['en', 'pt-BR', 'ja'];
const languages = [
  { lang: 'en', directory: '' },
  { lang: 'pt-BR', directory: 'pt-br' },
  { lang: 'ja', directory: 'ja' },
];

test('the first language of the reader that the site has is the one they come to', () => {
  assert.equal(preferredSiteLanguage(['ja-JP', 'en-US'], siteLanguages), 'ja');
  assert.equal(preferredSiteLanguage(['en-US', 'ja'], siteLanguages), 'en');
  assert.equal(preferredSiteLanguage(['de-DE', 'fr', 'pt'], siteLanguages), 'pt-BR');
});

test('only the language is compared: another region of it comes to the language of the site', () => {
  assert.equal(preferredSiteLanguage(['pt-PT'], siteLanguages), 'pt-BR');
  assert.equal(preferredSiteLanguage(['PT-br'], siteLanguages), 'pt-BR');
  assert.equal(preferredSiteLanguage(['en-GB'], siteLanguages), 'en');
});

test('a reader whose languages the site does not have comes to none', () => {
  assert.equal(preferredSiteLanguage(['de-DE', 'fr'], siteLanguages), undefined);
  assert.equal(preferredSiteLanguage([], siteLanguages), undefined);
});

test('the same page is in each language under that language’s directory, and none for the default', () => {
  const site = { base: '/manga2ink/', languages };

  assert.deepEqual(
    pathsInEachLanguage({ ...site, pathname: '/manga2ink/user-guide/exporting/' }),
    {
      en: '/manga2ink/user-guide/exporting/',
      'pt-BR': '/manga2ink/pt-br/user-guide/exporting/',
      ja: '/manga2ink/ja/user-guide/exporting/',
    },
  );
  assert.deepEqual(
    pathsInEachLanguage({ ...site, pathname: '/manga2ink/pt-br/user-guide/exporting/' }),
    {
      en: '/manga2ink/user-guide/exporting/',
      'pt-BR': '/manga2ink/pt-br/user-guide/exporting/',
      ja: '/manga2ink/ja/user-guide/exporting/',
    },
  );
});

test('a home page is the home page of each language', () => {
  const site = { base: '/manga2ink/', languages };

  assert.deepEqual(pathsInEachLanguage({ ...site, pathname: '/manga2ink/' }), {
    en: '/manga2ink/',
    'pt-BR': '/manga2ink/pt-br/',
    ja: '/manga2ink/ja/',
  });
  assert.deepEqual(pathsInEachLanguage({ ...site, pathname: '/manga2ink/ja/' }), {
    en: '/manga2ink/',
    'pt-BR': '/manga2ink/pt-br/',
    ja: '/manga2ink/ja/',
  });
});

test('a base without its closing slash, or the site at the root, gives the same addresses', () => {
  assert.equal(
    pathsInEachLanguage({ base: '/manga2ink', pathname: '/manga2ink/ja/a/', languages }).en,
    '/manga2ink/a/',
  );
  assert.deepEqual(pathsInEachLanguage({ base: '/', pathname: '/pt-br/a/', languages }), {
    en: '/a/',
    'pt-BR': '/pt-br/a/',
    ja: '/ja/a/',
  });
});

test('a page whose name only starts like a directory of a language is in the default language', () => {
  const paths = pathsInEachLanguage({
    base: '/manga2ink/',
    pathname: '/manga2ink/jazz/',
    languages,
  });

  assert.equal(paths.en, '/manga2ink/jazz/');
  assert.equal(paths.ja, '/manga2ink/ja/jazz/');
});

test('a path outside the base is taken as it is', () => {
  const paths = pathsInEachLanguage({ base: '/manga2ink/', pathname: '/elsewhere/', languages });

  assert.equal(paths.en, '/manga2ink/elsewhere/');
});

const state = {
  current: 'ja',
  readerLanguages: ['en-US'],
  siteLanguages,
  never: false,
  dismissed: false,
  chosen: undefined,
};

test('a reader whose language is not the page’s is suggested their own', () => {
  assert.equal(languageToSuggest(state), 'en');
  assert.equal(
    languageToSuggest({ ...state, current: 'en', readerLanguages: ['pt-BR', 'en'] }),
    'pt-BR',
  );
});

test('nothing is suggested when the page is in the language the reader asked for first', () => {
  assert.equal(languageToSuggest({ ...state, current: 'en' }), undefined);
  assert.equal(
    languageToSuggest({ ...state, current: 'ja', readerLanguages: ['ja', 'en'] }),
    undefined,
  );
});

test('nothing is suggested when the site has none of the reader’s languages', () => {
  assert.equal(languageToSuggest({ ...state, readerLanguages: ['de', 'fr'] }), undefined);
});

test('nothing is suggested to a reader who said not to ask again, or put it away for this visit', () => {
  assert.equal(languageToSuggest({ ...state, never: true }), undefined);
  assert.equal(languageToSuggest({ ...state, dismissed: true }), undefined);
});

test('nothing is suggested on the language the reader chose on purpose, but is on another', () => {
  assert.equal(languageToSuggest({ ...state, chosen: 'ja' }), undefined);
  assert.equal(languageToSuggest({ ...state, chosen: 'pt-BR' }), 'en');
});
