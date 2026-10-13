import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import test from 'node:test';

import { checkGallery, referencedExamples } from '../../scripts/options-gallery-check.mjs';
import {
  epubFacts,
  hasComicInfo,
  otherEntries,
  pdfFacts,
  unescapeXml,
} from '../../scripts/options-gallery/book-facts.mjs';
import { readZip } from '../../scripts/options-gallery/zip.mjs';

// ---- the ZIP reader -----------------------------------------------------------------------------

/** A ZIP archive of [name, bytes, method] entries, built by hand so that the reader is tested on its own. */
function zip(entries, { flags = 0, signature = 0x04034b50 } = {}) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const [name, data, method = 0] of entries) {
    const body = method === 8 ? deflateRawSync(data) : data;
    const nameBytes = Buffer.from(name);
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(signature, 0);
    local.writeUInt16LE(nameBytes.length, 26);
    nameBytes.copy(local, 30);
    const central = Buffer.alloc(46 + nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(flags, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    nameBytes.copy(central, 46);
    locals.push(local, body);
    centrals.push(central);
    offset += local.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

test('a ZIP archive gives its stored and deflated files by name, and leaves directories out', () => {
  const text = Buffer.from('a page '.repeat(50));
  const files = readZip(
    zip([
      ['book/', Buffer.alloc(0)],
      ['/001.jpg', Buffer.from('stored')],
      ['book/002.jpg', text, 8],
    ]),
  );
  assert.deepEqual([...files.keys()], ['/001.jpg', 'book/002.jpg']);
  assert.equal(files.get('/001.jpg').toString(), 'stored');
  assert.deepEqual(files.get('book/002.jpg'), text);
});

test('a ZIP archive that cannot be read is refused, and says why', () => {
  assert.throws(
    () => readZip(Buffer.from('not a zip archive at all')),
    /no end of central directory/,
  );
  const damaged = zip([['a.jpg', Buffer.from('x')]]);
  damaged.writeUInt32LE(0, damaged.length - 22 - 46 - 5);
  assert.throws(() => readZip(damaged), /central directory is damaged/);
  assert.throws(
    () => readZip(zip([['a.jpg', Buffer.from('x')]], { flags: 1 })),
    /a\.jpg is encrypted/,
  );
  assert.throws(
    () => readZip(zip([['a.jpg', Buffer.from('x')]], { signature: 0 })),
    /a\.jpg has no local header/,
  );
  const odd = zip([['a.jpg', Buffer.from('x')]]);
  odd.writeUInt16LE(14, odd.length - 22 - 46 - 5 + 10);
  assert.throws(() => readZip(odd), /a\.jpg uses compression method 14/);
});

// ---- what a book says about itself ---------------------------------------------------------------

test('XML entities, named and numbered, are turned back into characters', () => {
  assert.equal(
    unescapeXml('Pepper&amp;Carrot &lt;1&gt; &quot;a&quot; &apos;b&apos; &AMP;'),
    `Pepper&Carrot <1> "a" 'b' &`,
  );
  assert.equal(unescapeXml('Caf&#233; &#x2603; no entity'), 'Café ☃ no entity');
  assert.equal(unescapeXml('&unknown; stays'), '&unknown; stays');
});

test('the title, author, language and direction of an EPUB come from its package file', () => {
  const opf = [
    '<dc:title>Pepper&amp;Carrot Vol. 01 #006</dc:title>',
    '<dc:creator>David Revoy</dc:creator>',
    '<dc:language>en-US</dc:language>',
    '<spine toc="ncx" page-progression-direction="rtl">',
  ].join('\n');
  assert.deepEqual(epubFacts(opf), {
    title: 'Pepper&Carrot Vol. 01 #006',
    author: 'David Revoy',
    language: 'en-US',
    direction: 'rtl',
  });
  assert.deepEqual(epubFacts('<package/>'), {
    title: null,
    author: null,
    language: null,
    direction: null,
  });
});

/** A PDF string as the document properties store it: hexadecimal UTF-16, with or without the byte order mark. */
const hexString = (text, mark = true) =>
  `<${mark ? 'FEFF' : ''}${Buffer.from(text, 'utf16le').swap16().toString('hex').toUpperCase()}>`;

test('the title, author, language and direction of a PDF are what it states, and null where it does not', () => {
  const pdf = Buffer.from(
    `%PDF-1.3 /Title${hexString('My Title')}/Author ${hexString('Zoë', false)}/Creator() /Lang(ja) /ViewerPreferences<</Direction/R2L>>`,
    'latin1',
  );
  assert.deepEqual(pdfFacts(pdf), {
    title: 'My Title',
    author: 'Zoë',
    language: 'ja',
    direction: 'rtl',
  });
  assert.deepEqual(pdfFacts(Buffer.from('/Direction /L2R', 'latin1')), {
    title: null,
    author: null,
    language: null,
    direction: 'ltr',
  });
  assert.deepEqual(pdfFacts(Buffer.from('%PDF-1.3 /Creator()', 'latin1')), {
    title: null,
    author: null,
    language: null,
    direction: null,
  });
});

test('a CBZ is known by its ComicInfo.xml and by what else it holds apart from pages', () => {
  assert.equal(hasComicInfo(['Untitled/p0001.jpg', 'ComicInfo.xml']), true);
  assert.equal(hasComicInfo(['book/ComicInfo.xml']), true);
  assert.equal(hasComicInfo(['Untitled/p0001.jpg', 'NotComicInfo.xml']), false);
  assert.deepEqual(
    otherEntries([
      'a/p0001.JPG',
      'a/p0002.png',
      'a/p0003.gif',
      'ComicInfo.xml',
      'extra.txt',
      'x/y.xml',
    ]),
    ['extra.txt', 'x/y.xml'],
  );
});

// ---- the check ------------------------------------------------------------------------------------

function gallery(changes = {}) {
  const base = {
    manifest: {
      mangapress: '0.7.3',
      examples: {
        crop: {
          license: 'CC BY 4.0',
          variants: [
            { id: 'off', file: 'crop-off.webp', sha256: 'aa' },
            { id: 'on', file: 'crop-on.webp', sha256: 'bb' },
          ],
        },
        sizes: { variants: [{ id: 'a', width: 1, height: 1 }] },
      },
    },
    pin: '0.7.3',
    licenses: '| `crop-*.webp` | a page | CC BY 4.0 |',
    pictures: new Map([
      ['crop-off.webp', 'aa'],
      ['crop-on.webp', 'bb'],
    ]),
    userFlags: ['--cropping', '-c', '--quiet'],
    coverage: {
      pages: { cropping: ['--cropping', '-c'], reading: [] },
      elsewhere: { 'cli/mangapress': ['--quiet'] },
      planned: ['reading'],
    },
    pages: {
      en: {
        cropping:
          'Use `--cropping`. <OptionExample id="crop" alt={{}} /> <OptionSizes\n  id="sizes"\n/>',
      },
      'pt-br': {
        cropping:
          'Use `--cropping`. <OptionExample id="crop" alt={{}} /> <OptionSizes id="sizes" />',
      },
    },
    guides: {
      en: { 'cli/mangapress': 'Use `--quiet` or `-q`.' },
      'pt-br': { 'cli/mangapress': 'Use `--quiet`.' },
    },
  };
  return { ...base, ...changes };
}

test('the examples a page uses are found, over several lines too', () => {
  assert.deepEqual(
    referencedExamples(
      '<OptionExample id="a" /> text <OptionSizes\n  alt="x"\n  id="b"\n/> <Other id="c" /> <OptionBook id="d" />',
    ),
    ['a', 'b', 'd'],
  );
  assert.deepEqual(referencedExamples('nothing here'), []);
});

test('pages, pictures and options that agree are no problem', () => {
  assert.deepEqual(checkGallery(gallery()), []);
});

test('pictures with no licence in the manifest, or not in the licences file, are a problem', () => {
  const manifest = gallery().manifest;
  delete manifest.examples.crop.license;
  assert.deepEqual(checkGallery(gallery({ manifest })), [
    'crop: the licence of its pictures is not in the manifest.',
  ]);
  assert.deepEqual(checkGallery(gallery({ licenses: 'Nothing about them.' })), [
    'crop: its pictures are not in LICENSES.md. Run npm run site:options.',
  ]);
});

test('pictures made with another mangapress than the one shipped are a problem', () => {
  const problems = checkGallery(gallery({ pin: '0.8.0' }));
  assert.deepEqual(problems, [
    'The pictures were made with mangapress 0.7.3, and Mangabound ships 0.8.0. Run npm run site:options.',
  ]);
});

test('a missing, changed or unlisted picture is a problem', () => {
  const problems = checkGallery(
    gallery({
      pictures: new Map([
        ['crop-off.webp', 'changed'],
        ['stray.webp', 'cc'],
      ]),
    }),
  );
  assert.deepEqual(problems, [
    'crop: crop-off.webp is not the file the manifest describes. Run npm run site:options.',
    'crop: the picture crop-on.webp is missing.',
    'stray.webp is in the assets folder and in no example.',
  ]);
});

test('an example that no page uses, or that does not exist, is a problem in each language', () => {
  const problems = checkGallery(
    gallery({
      pages: {
        en: {
          cropping: 'Use `--cropping`. <OptionExample id="crop" /> <OptionExample id="ghost" />',
        },
        'pt-br': { cropping: 'Use `--cropping`. <OptionSizes id="sizes" />' },
      },
    }),
  );
  assert.deepEqual(problems, [
    'en/cropping: there is no example called ghost.',
    'The example crop is on no page in pt-br.',
    'The example sizes is on no page in en.',
  ]);
});

test('an option that no page covers, or that does not exist, is a problem', () => {
  const problems = checkGallery(
    gallery({
      userFlags: ['--cropping', '-c', '--quiet', '--gamma'],
      coverage: {
        pages: { cropping: ['--cropping', '-c', '--invented'], reading: ['--quiet'] },
        elsewhere: { 'cli/mangapress': ['--quiet'] },
        planned: ['reading'],
      },
    }),
  );
  assert.deepEqual(problems, [
    '--quiet is listed under the page reading and under cli/mangapress.',
    '--gamma is a mangapress option and no page covers it.',
    '--invented is covered, but mangapress has no such option.',
    'en/cropping does not mention --invented.',
    'pt-br/cropping does not mention --invented.',
  ]);
});

test('a page that is promised must exist, and one that exists is no longer promised', () => {
  const missing = checkGallery(
    gallery({
      coverage: {
        pages: { cropping: ['--cropping', '-c'], reading: [] },
        elsewhere: { 'cli/mangapress': ['--quiet'] },
        planned: [],
      },
    }),
  );
  assert.deepEqual(missing, ['The page reading covers options and does not exist.']);

  const written = checkGallery(
    gallery({
      coverage: {
        pages: { cropping: ['--cropping', '-c'] },
        elsewhere: { 'cli/mangapress': ['--quiet'] },
        planned: ['cropping', 'nothing'],
      },
    }),
  );
  assert.deepEqual(written, [
    'The page cropping exists and is still listed as planned.',
    'nothing is planned and covers no option.',
  ]);
});

test('a page must exist in both languages and name every long option it covers', () => {
  const problems = checkGallery(
    gallery({
      pages: {
        en: {
          cropping:
            'Use `--cropping` and `-c`. <OptionExample id="crop" /> <OptionSizes id="sizes" />',
        },
        'pt-br': {},
      },
    }),
  );
  assert.deepEqual(problems, [
    'The example crop is on no page in pt-br.',
    'The example sizes is on no page in pt-br.',
    'The page cropping has no pt-br version.',
  ]);
});

test('the other pages that cover options must exist in both languages and name every long option', () => {
  const missing = checkGallery(
    gallery({ guides: { en: {}, 'pt-br': { 'cli/mangapress': 'Use `--quiet`.' } } }),
  );
  assert.deepEqual(missing, [
    'en/cli/mangapress is where options are covered, and it does not exist.',
  ]);

  const silent = checkGallery(
    gallery({
      guides: {
        en: { 'cli/mangapress': 'Nothing about it.' },
        'pt-br': { 'cli/mangapress': 'Use `--quiet`.' },
      },
    }),
  );
  assert.deepEqual(silent, ['en/cli/mangapress does not mention --quiet.']);
});
