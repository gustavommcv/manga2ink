import assert from 'node:assert/strict';
import { sep } from 'node:path';
import test from 'node:test';

import { auditLinks, auditSearchData, translationGaps } from '../../scripts/verification.mjs';

const options = { site: 'https://example.org', base: '/mangabound/' };
const page = (path, html) => ({ path, html });

test('empty input cannot produce a false green verification', () => {
  assert.throws(() => translationGaps([]), /No documentation pages found/);
  assert.throws(() => auditLinks([], options), /No built HTML pages found/);
  assert.throws(() => auditSearchData([], options), /No built HTML pages found/);
});

test('translation parity accepts Windows and POSIX separators', () => {
  for (const paths of [
    ['guide/start.mdx', 'pt-br/guide/start.mdx'],
    ['guide' + sep + 'start.mdx', 'pt-br' + sep + 'guide' + sep + 'start.mdx'],
  ]) {
    assert.deepEqual(translationGaps(paths), {
      counts: { en: 1, 'pt-br': 1 },
      listed: { 'pt-br': 0 },
      missing: { 'pt-br': [] },
      orphans: { 'pt-br': [] },
      stale: { 'pt-br': [] },
    });
  }
});

test('translation parity reports a page with no counterpart in either direction', () => {
  const result = translationGaps(['en-only.mdx', 'pt-br/pt-only.mdx']);
  assert.deepEqual(result.missing, { 'pt-br': ['en-only.mdx'] });
  assert.deepEqual(result.orphans, { 'pt-br': ['pt-only.mdx'] });
});

const threeLanguages = [
  { id: 'en', directory: '', lang: 'en' },
  { id: 'pt-br', directory: 'pt-br', lang: 'pt-BR' },
  { id: 'ja', directory: 'ja', lang: 'ja' },
];

test('each language is compared with the default one, and a folder of another language is not English', () => {
  const result = translationGaps(
    ['a.mdx', 'b.mdx', 'pt-br/a.mdx', 'pt-br/b.mdx', 'ja/a.mdx', 'ja/extra.mdx'],
    { languages: threeLanguages },
  );
  assert.deepEqual(result.counts, { en: 2, 'pt-br': 2, ja: 2 });
  assert.deepEqual(result.missing, { 'pt-br': [], ja: ['b.mdx'] });
  assert.deepEqual(result.orphans, { 'pt-br': [], ja: ['extra.mdx'] });
});

test('a language may leave pages untranslated on purpose, and the list has to stay true', () => {
  const paths = ['a.mdx', 'b.mdx', 'pt-br/a.mdx', 'pt-br/b.mdx', 'ja/a.mdx'];
  const gaps = (untranslated) =>
    translationGaps(paths, { languages: threeLanguages, untranslated });
  const listed = gaps({ ja: ['b.mdx'] });
  assert.deepEqual(listed.missing.ja, []);
  assert.deepEqual(listed.stale.ja, []);
  assert.equal(listed.listed.ja, 1);
  // The page is translated after all, or never was a page: the list has gone stale.
  assert.deepEqual(gaps({ ja: ['a.mdx'] }).stale.ja, ['a.mdx']);
  assert.deepEqual(gaps({ ja: ['gone.mdx'] }).stale.ja, ['gone.mdx']);
  // The list of a language does not excuse another one.
  assert.deepEqual(gaps({ 'pt-br': ['b.mdx'] }).missing.ja, ['b.mdx']);
});

test('valid relative, project-root, query, and encoded-anchor URLs resolve', () => {
  const result = auditLinks(
    [
      page(
        'index.html',
        '<a href="guide/?q=1&amp;x=2#ol%C3%A1">go</a><a href="/mangabound/guide/">go</a>',
      ),
      page(
        'guide/index.html',
        '<h2 id="olá">Title</h2><a href="../">home</a><a href="#ol%C3%A1">same</a>',
      ),
    ],
    options,
  );
  assert.deepEqual(result.errors, []);
  assert.equal(result.internal, 4);
});

test('a missing project base fails even when the dist file exists', () => {
  const result = auditLinks(
    [
      page(
        'index.html',
        '<a href="/guide/">wrong</a><a href="https://example.org/guide/">also wrong</a>',
      ),
      page('guide/index.html', '<h1>Guide</h1>'),
    ],
    options,
  );
  assert.equal(result.errors.length, 2);
  assert.match(result.errors[0].reason, /outside the project base/);
});

test('alternate deployment bases use configuration, not the project name', () => {
  const result = auditLinks(
    [
      page('index.html', '<a href="/preview/guide/">go</a>'),
      page('guide/index.html', '<h1>Guide</h1>'),
    ],
    { ...options, base: '/preview/' },
  );
  assert.deepEqual(result.errors, []);
});

test('host-root deployment and direct HTML pages resolve', () => {
  const result = auditLinks(
    [page('index.html', '<a href="/404.html">404</a>'), page('404.html', '<a href="/">home</a>')],
    { ...options, base: '/' },
  );
  assert.deepEqual(result.errors, []);
});

test('missing pages and missing anchors fail', () => {
  const result = auditLinks(
    [page('index.html', '<a href="missing/">bad</a><a href="#missing">bad</a>')],
    options,
  );
  assert.deepEqual(
    result.errors.map(({ reason }) => reason),
    ['Target does not exist', 'Anchor #missing does not exist'],
  );
});

test('external and contact links do not trigger network requests', () => {
  const result = auditLinks(
    [
      page(
        'index.html',
        '<a href="https://external.org/">external</a><a href="mailto:a@example.org">mail</a><a href="tel:123">call</a>',
      ),
    ],
    options,
  );
  assert.equal(result.external, 1);
  assert.equal(result.internal, 0);
  assert.deepEqual(result.errors, []);
});

test('HTML parsing supports unquoted attributes and named anchors', () => {
  const result = auditLinks(
    [page('index.html', '<a name=legacy></a><a href=#legacy>legacy</a>')],
    options,
  );
  assert.deepEqual(result.errors, []);
});

test('missing local images and videos fail; present GIF assets pass', () => {
  const result = auditLinks(
    [page('index.html', '<img src="images/demo.gif"><video src="images/missing.webm"></video>')],
    { ...options, assets: ['images/demo.gif'] },
  );
  assert.equal(result.errors.length, 1);
  assert.equal(result.errors[0].link, 'images/missing.webm');
});

test('unsafe schemes, malformed URLs, and malformed encoding fail', () => {
  const result = auditLinks(
    [
      page(
        'index.html',
        '<a href="javascript:alert(1)">unsafe</a><a href="https://[">invalid</a><a href="#%ZZ">bad encoding</a>',
      ),
    ],
    options,
  );
  assert.deepEqual(
    result.errors.map(({ reason }) => reason),
    ['Unsupported URL scheme', 'Invalid URL', 'Invalid URL encoding'],
  );
});

const description = 'd'.repeat(120);
const languagesForTests = threeLanguages;
const indexed = (
  address,
  { title = `Page ${address}`, text = description, body = '<h1>T</h1>', root = options.base } = {},
) => {
  const url = `https://example.org${root}${address}`;
  const language =
    languagesForTests.find(({ directory }) => directory && address.startsWith(`${directory}/`)) ??
    languagesForTests[0];
  const lang = language.lang;
  const home = `https://example.org${root}${language.directory ? `${language.directory}/` : ''}`;
  const data =
    url === home
      ? {
          '@context': 'https://schema.org',
          '@graph': [
            { '@type': 'WebSite', name: 'Mangabound', url, description: text, inLanguage: lang },
            {
              '@type': 'SoftwareApplication',
              name: 'Mangabound',
              url,
              description: text,
              inLanguage: 'en',
            },
          ],
        }
      : {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Mangabound', item: home },
            { '@type': 'ListItem', position: 2, name: 'T', item: url },
          ],
        };
  return (
    `<html lang="${lang}"><head><title>${title}</title><meta name="description" content="${text}">` +
    `<link rel="canonical" href="${url}">` +
    `<meta property="og:image" content="https://example.org${root}social-preview.png">` +
    `<script type="application/ld+json">${JSON.stringify(data)}</script></head>${body}</html>`
  );
};

const withData = (html, data) =>
  html.replace(/(<script type="application\/ld\+json">).*?(<\/script>)/, `$1${data}$2`);

test('a page of any language of the list is checked against that language', () => {
  const withJapanese = { ...options, languages: threeLanguages };
  assert.deepEqual(
    auditSearchData(
      [
        page('index.html', indexed('')),
        page('ja/index.html', indexed('ja/')),
        page('ja/guide/index.html', indexed('ja/guide/')),
      ],
      withJapanese,
    ),
    { indexable: 3, errors: [] },
  );
  const wrong = indexed('ja/guide/').replace('<html lang="ja">', '<html lang="en">');
  const reasons = auditSearchData([page('ja/guide/index.html', wrong)], withJapanese).errors.map(
    ({ reason }) => reason,
  );
  assert.deepEqual(
    reasons.filter((reason) => /language/.test(reason)),
    ['Page language is not ja'],
  );
});

test('both locales pass, while only the noindex 404 is exempt', () => {
  const result = auditSearchData(
    [
      page('index.html', indexed('')),
      page('guide\\index.html', indexed('guide/', { body: '<h1>T</h1><img src="a.png" alt="">' })),
      page('pt-br/index.html', indexed('pt-br/')),
      page('pt-br/guide/index.html', indexed('pt-br/guide/')),
      page('404.html', '<head><meta name="robots" content="noindex"></head>'),
    ],
    options,
  );
  assert.deepEqual(result, { indexable: 4, errors: [] });
});

test('a page with nothing for a search engine reports each missing part', () => {
  const result = auditSearchData([page('index.html', '<head></head><img src="a.png">')], options);
  assert.deepEqual(
    result.errors.map((error) => error.reason),
    [
      'No title',
      'No description',
      'Canonical address is not https://example.org/mangabound/',
      'Social preview image is not https://example.org/mangabound/social-preview.png',
      'Expected one h1, found 0',
      'Page language is not en',
      'No structured data',
      '1 image(s) without alternative text',
    ],
  );
});

test('a repeated title, a blank description, and broken structured data fail', () => {
  const result = auditSearchData(
    [
      page('index.html', indexed('', { title: 'Same' })),
      page('a/index.html', indexed('a/', { title: 'Same', text: '   ' })),
      page('b/index.html', withData(indexed('b/'), '{')),
    ],
    options,
  );
  assert.deepEqual(result.errors, [
    { source: 'a/index.html', reason: 'Title is also used by index.html' },
    { source: 'a/index.html', reason: 'No description' },
    { source: 'b/index.html', reason: 'Structured data is not valid JSON' },
  ]);
});

test('a page whose social preview card is missing, or is another file, fails', () => {
  const card = 'https://example.org/mangabound/social-preview.png';
  const result = auditSearchData(
    [
      page('a/index.html', indexed('a/').replace(card, 'https://example.org/other.png')),
      page('b/index.html', indexed('b/').replace(/<meta property="og:image"[^>]*>/, '')),
    ],
    options,
  );
  assert.deepEqual(result.errors, [
    { source: 'a/index.html', reason: `Social preview image is not ${card}` },
    { source: 'b/index.html', reason: `Social preview image is not ${card}` },
  ]);
});

test('descriptions are required but have no arbitrary character-count gate', () => {
  for (const text of ['Short summary.', 'A complete summary. '.repeat(20)]) {
    assert.deepEqual(
      auditSearchData([page('index.html', indexed('', { text }))], options).errors,
      [],
    );
  }
});

test('noindex on any guide fails, including case variations and Google-specific directives', () => {
  for (const tag of [
    '<meta name="robots" content="noindex">',
    '<meta name="ROBOTS" content="NOINDEX, FOLLOW">',
    '<meta name="googlebot" content="none">',
  ]) {
    const result = auditSearchData(
      [
        page('index.html', indexed('')),
        page('guide/index.html', indexed('guide/').replace('</head>', `${tag}</head>`)),
      ],
      options,
    );
    assert.deepEqual(result, {
      indexable: 1,
      errors: [{ source: 'guide/index.html', reason: 'Documentation page must remain indexable' }],
    });
  }
});

test('an entirely excluded site and a site containing only a 404 cannot pass', () => {
  const excluded = '<meta name="robots" content="noindex">';
  assert.deepEqual(auditSearchData([page('index.html', excluded)], options), {
    indexable: 0,
    errors: [
      { source: 'index.html', reason: 'Documentation page must remain indexable' },
      { source: 'dist', reason: 'No indexable documentation pages found' },
    ],
  });
  assert.deepEqual(auditSearchData([page('404.html', excluded)], options).errors, [
    { source: 'dist', reason: 'No indexable documentation pages found' },
  ]);
});

test('the 404 must explicitly exclude itself from indexing', () => {
  const result = auditSearchData(
    [page('index.html', indexed('')), page('404.html', '<meta name="robots">')],
    options,
  );
  assert.deepEqual(result.errors, [
    { source: '404.html', reason: '404 page must be marked noindex' },
  ]);
});

test('valid JSON cannot stand in for missing structured-data entities', () => {
  for (const data of [
    '{}',
    'null',
    '[]',
    '"text"',
    '{"@context":"https://schema.org","@graph":[null,0,{}]}',
  ]) {
    const result = auditSearchData([page('index.html', withData(indexed(''), data))], options);
    assert.ok(result.errors.some(({ reason }) => reason === 'No WebSite structured data'));
    assert.ok(
      result.errors.some(({ reason }) => reason === 'No SoftwareApplication structured data'),
    );
  }
});

test('structured-data context, identity, page URL, description, and language must match', () => {
  const data = {
    '@context': 'https://example.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'Other',
        url: 'https://other.org',
        description: 'Other',
        inLanguage: 'de',
      },
      {
        '@type': 'SoftwareApplication',
        name: 'Other',
        url: 'https://other.org',
        description: 'Other',
        inLanguage: 'pt-BR',
      },
    ],
  };
  const result = auditSearchData(
    [page('index.html', withData(indexed(''), JSON.stringify(data)))],
    options,
  );
  assert.deepEqual(
    result.errors.map(({ reason }) => reason),
    [
      'Structured data context is not schema.org',
      'WebSite.name does not match this page',
      'WebSite.url does not match this page',
      'WebSite.description does not match this page',
      'WebSite.inLanguage does not match this page',
      'SoftwareApplication.name does not match this page',
      'SoftwareApplication.url does not match this page',
      'SoftwareApplication.description does not match this page',
      'SoftwareApplication.inLanguage does not match this page',
    ],
  );
});

test('breadcrumbs cannot cross locales or lose their ordered path back home', () => {
  for (const data of [
    { '@context': 'https://schema.org', '@type': 'WebSite' },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [] },
  ]) {
    const result = auditSearchData(
      [page('pt-br/guide/index.html', withData(indexed('pt-br/guide/'), JSON.stringify(data)))],
      options,
    );
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].reason, /BreadcrumbList/);
  }
});

test('structured-data and canonical checks follow an alternate deployment base', () => {
  for (const root of ['/', '/preview/']) {
    const result = auditSearchData(
      [
        page('index.html', indexed('', { root })),
        page('pt-br/index.html', indexed('pt-br/', { root })),
      ],
      { ...options, base: root },
    );
    assert.deepEqual(result.errors, []);
  }
});
