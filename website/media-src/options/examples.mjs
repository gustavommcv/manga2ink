// What the option examples show. `npm run site:options` runs the pinned mangapress on the pages named
// here, with and without each option, and writes the pictures and the manifest the pages read.
// Only a variant's own flags differ inside an example: the page, the profile and the rest are shared.

/**
 * The settings Mangabound starts a conversion with, as mangapress flags: Kindle Paperwhite 6, CBZ,
 * manga reading order, spreads kept both ways, small pages enlarged, margins and page numbers
 * cropped. Cropping is mangapress's own default, so it needs no flag. The source of truth is
 * `defaultMangapressSettings` in src/domain/output-profile.ts; keep this in step with it.
 */
export const base = {
  profile: 'KPW6',
  format: 'cbz',
  flags: ['--manga-style', '--splitter', 'both', '--upscale'],
};

const PEPPER_SUN = { source: 'pepper-ep06', page: '002.jpg' };
const PEPPER_DARK = { source: 'pepper-ep01', page: '001.jpg' };
const GOGO = { source: 'gogo-02' };
const WITHOUT_ENLARGING = ['--upscale'];

// A screen that is not the shape of a page, so that what surrounds the page can be seen: the
// reMarkable Paper Pro Move is 954 x 1696, a ratio of 0.56 against 0.72 of a page of Pepper&Carrot.
const TALL_SCREEN = {
  profile: 'RmkPPMove',
  screen: { width: 954, height: 1696 },
  screenLabel: 'reMarkable Paper Pro Move, 954 × 1696',
};
// A whole page with a black background: white line art on black, in the manga and anime manner.
const DARK_PAGE = { source: 'wikipetan-darknesses' };
// Two consecutive pages of one comic joined side by side, as a scan of a double page is. The later
// page is on the left and the earlier one on the right, which is how a book read right to left lies open.
const SPREAD = { beside: [{ source: 'gogo-04' }, { source: 'gogo-03' }] };

// Three consecutive pages of Pepper&Carrot, episode 6, joined one under the other: a strip 992 x 4119,
// as tall as a webtoon, with the white gaps between panels a webtoon has.
const PEPPER_STRIP = [
  PEPPER_SUN,
  { source: 'pepper-ep06', page: '003.jpg' },
  { source: 'pepper-ep06', page: '004.jpg' },
];

// Pepper&Carrot has no ComicInfo.xml, so the examples about metadata give it one, written for them:
// the fields mangapress reads, with the comic's own title, series number and author.
const BOOK = {
  name: 'Pepper and Carrot 06',
  format: 'epub',
  input: { pages: PEPPER_STRIP },
  comicInfo: {
    Title: 'The Potion Contest',
    Series: 'Pepper&Carrot',
    Number: 6,
    Volume: 1,
    Writer: 'David Revoy',
    LanguageISO: 'en',
  },
};
// The first page of the episode, in color: the image a book's cover is made from.
const PEPPER_FIRST = { source: 'pepper-ep06', page: '001.jpg' };
// Three pages side by side, 3240 x 1440: `ratio` cuts the middle of it to a width of that many heights.
const WIDE_STRIP = [{ source: 'gogo-04' }, { source: 'gogo-03' }, { source: 'gogo-02' }];
const KPW6_SCREEN = {
  profile: 'KPW6',
  screen: { width: 1272, height: 1696 },
  screenLabel: 'Kindle Paperwhite 6, 1272 × 1696',
};
const TITLE = 'Pepper & Carrot 6';
const AUTHOR = 'D. Revoy';

/**
 * kind 'pictures': one picture per variant, the first page of the result.
 * kind 'sizes': no pictures, only the size of the page each variant gives and the share of the source
 *   page it keeps; the pages are not enlarged, so the size says what was cropped.
 * kind 'files': no pictures, the type and size of the file of the page each variant gives.
 * kind 'book': no pictures, what the finished book says: for each variant the facts named in
 *   `columns` (title, author, language, direction, fileName, comicInfo, pages), read back from the
 *   book. A variant may name its own `format` and `profile`, or run on the input `noComicInfo`.
 * `input` is one page; `{ pages: [...] }` for several; `{ stack: [...] }` for pages joined into one
 *   tall strip; `{ beside: [...] }` for pages joined into a spread; `{ slices: { of, every } }` for a
 *   strip cut into images of `every` pixels. `comicInfo` puts a ComicInfo.xml in the folder, and
 *   `name` names it, which names the book.
 * `without` takes flags out of `base` for this example; `show` is the index of the page to picture.
 */
export const examples = [
  {
    id: 'cropping-modes',
    kind: 'pictures',
    input: GOGO,
    variants: [
      { id: 'disabled', label: 'Page cropping: Disabled', flags: ['--cropping', 'disabled'] },
      {
        id: 'margins-and-page-numbers',
        label: 'Page cropping: Margins and page numbers',
        flags: ['--cropping', 'margins-and-page-numbers'],
      },
    ],
  },
  {
    id: 'cropping-power-sizes',
    kind: 'sizes',
    input: GOGO,
    without: WITHOUT_ENLARGING,
    variants: [0, 1, 2, 3, 3.5, 3.75, 3.76].map((power) => ({
      id: `power-${power}`,
      label: `Cropping power: ${power}`,
      flags: ['--croppingpower', String(power)],
    })),
  },
  {
    id: 'cropping-minimum-sizes',
    kind: 'sizes',
    input: GOGO,
    without: WITHOUT_ENLARGING,
    variants: [0, 70, 80, 81, 90].map((minimum) => ({
      id: `minimum-${minimum}`,
      label: `Minimum retained area: ${minimum}%`,
      flags: ['--croppingminimum', String(minimum)],
    })),
  },
  {
    id: 'cropping-preserve',
    kind: 'pictures',
    input: GOGO,
    variants: [
      { id: '0', label: 'Preserved margin: 0%', flags: ['--preservemargin', '0'] },
      { id: '50', label: 'Preserved margin: 50%', flags: ['--preservemargin', '50'] },
    ],
  },
  {
    id: 'cropping-preserve-sizes',
    kind: 'sizes',
    input: GOGO,
    without: WITHOUT_ENLARGING,
    variants: [0, 25, 50, 100].map((percent) => ({
      id: `preserve-${percent}`,
      label: `Preserved margin: ${percent}%`,
      flags: ['--preservemargin', String(percent)],
    })),
  },
  {
    id: 'cropping-gutters',
    kind: 'pictures',
    input: {
      stack: [
        PEPPER_SUN,
        { source: 'pepper-ep06', page: '003.jpg' },
        { source: 'pepper-ep06', page: '004.jpg' },
      ],
    },
    show: 1,
    variants: [
      { id: 'disabled', label: 'Inter-panel cropping: Disabled', flags: ['--webtoon'] },
      {
        id: 'horizontal',
        label: 'Inter-panel cropping: Horizontal gaps',
        flags: ['--webtoon', '--ipc', 'horizontal'],
      },
      {
        id: 'both',
        label: 'Inter-panel cropping: Horizontal and vertical gaps',
        flags: ['--webtoon', '--ipc', 'both'],
      },
    ],
  },
  {
    id: 'color-pages',
    kind: 'pictures',
    input: PEPPER_SUN,
    variants: [
      { id: 'grayscale', label: 'Color pages: Convert to grayscale', flags: [] },
      { id: 'color', label: 'Color pages: Keep in color', flags: ['--forcecolor'] },
    ],
  },
  {
    id: 'gamma',
    kind: 'pictures',
    input: PEPPER_DARK,
    stats: true,
    variants: [
      { id: '0.6', label: 'Gamma: 0.6', flags: ['--gamma', '0.6'] },
      { id: '1', label: 'Gamma: 1.0', flags: ['--gamma', '1.0'] },
      { id: '1.8', label: 'Gamma: 1.8', flags: ['--gamma', '1.8'] },
    ],
  },
  {
    id: 'autocontrast',
    kind: 'pictures',
    input: PEPPER_DARK,
    stats: true,
    variants: [
      { id: 'monochrome', label: 'Autocontrast: Black-and-white pages only', flags: [] },
      { id: 'all', label: 'Autocontrast: Color pages too', flags: ['--colorautocontrast'] },
      {
        id: 'all-autolevel',
        label: 'Autocontrast: Color pages too, with Auto-level black point',
        flags: ['--colorautocontrast', '--autolevel'],
      },
    ],
  },
  {
    id: 'rainbow',
    kind: 'pictures',
    input: PEPPER_SUN,
    zoom: { left: 520, top: 180, width: 260, height: 260 },
    variants: [
      { id: 'off', label: 'Reduce rainbow effect: Off', flags: ['--forcecolor'] },
      { id: 'on', label: 'Reduce rainbow effect: On', flags: ['--forcecolor', '--eraserainbow'] },
    ],
  },

  {
    // `flow` says, for each page of the result, which part of the spread it is made of and whether it is
    // turned on its side: the picture draws the spread, the pages in order and the link between them.
    id: 'spreads-wide-pages',
    kind: 'pictures',
    input: SPREAD,
    flowScreen: KPW6_SCREEN.screen,
    show: 'all',
    variants: [
      {
        id: 'split',
        label: 'Wide pages: Split into two pages',
        flags: ['--splitter', 'split'],
        flow: [{ from: 'right' }, { from: 'left' }],
      },
      {
        id: 'rotate',
        label: 'Wide pages: Keep whole, as one page',
        flags: ['--splitter', 'rotate'],
        flow: [{ from: 'whole', turned: 'left' }],
      },
      {
        id: 'both',
        label: 'Wide pages: Both: the halves, then the whole',
        flags: ['--splitter', 'both'],
        flow: [{ from: 'right' }, { from: 'left' }, { from: 'whole', turned: 'left' }],
      },
    ],
  },
  {
    id: 'spreads-too-wide',
    kind: 'pictures',
    // Three pages side by side: 3240 x 1440, a page 2.25 times as wide as it is tall.
    input: { beside: [{ source: 'gogo-04' }, { source: 'gogo-03' }, { source: 'gogo-02' }] },
    flowScreen: KPW6_SCREEN.screen,
    show: 'all',
    variants: [
      {
        id: 'split',
        label: 'Wide pages: Split into two pages',
        flags: ['--splitter', 'split'],
        flow: [{ from: 'whole', turned: 'left' }],
      },
    ],
  },
  {
    id: 'spreads-reading-order',
    kind: 'pictures',
    input: SPREAD,
    flowScreen: KPW6_SCREEN.screen,
    show: 'all',
    variants: [
      {
        id: 'right-to-left',
        label: 'Manga reading order: On',
        flags: ['--splitter', 'split'],
        flow: [{ from: 'right' }, { from: 'left' }],
      },
      {
        id: 'left-to-right',
        label: 'Manga reading order: Off',
        flags: ['--splitter', 'split'],
        without: ['--manga-style'],
        flow: [{ from: 'left' }, { from: 'right' }],
      },
    ],
  },
  {
    id: 'spreads-whole-copy',
    kind: 'pictures',
    input: SPREAD,
    flowScreen: KPW6_SCREEN.screen,
    show: 'all',
    variants: [
      {
        id: 'default',
        label: 'Wide pages: Both, with the whole spread last',
        flags: ['--splitter', 'both'],
        flow: [{ from: 'right' }, { from: 'left' }, { from: 'whole', turned: 'left' }],
      },
      {
        id: 'first',
        label: 'Whole spread first',
        flags: ['--splitter', 'both', '--rotatefirst'],
        flow: [{ from: 'whole', turned: 'left' }, { from: 'right' }, { from: 'left' }],
      },
      {
        id: 'upright',
        label: 'Keep the whole spread upright',
        flags: ['--splitter', 'both', '--norotate'],
        flow: [{ from: 'right' }, { from: 'left' }, { from: 'whole' }],
      },
      {
        id: 'clockwise',
        label: 'Rotate clockwise',
        flags: ['--splitter', 'both', '--rotateright'],
        flow: [{ from: 'right' }, { from: 'left' }, { from: 'whole', turned: 'right' }],
      },
    ],
  },
  {
    id: 'spreads-restack',
    kind: 'pictures',
    input: SPREAD,
    flowScreen: KPW6_SCREEN.screen,
    show: 'all',
    variants: [
      {
        id: 'off',
        label: 'Restack 4-panel strips as 2×2: Off',
        flags: [],
        flow: [{ from: 'right' }, { from: 'left' }, { from: 'whole', turned: 'left' }],
      },
      {
        id: 'on',
        label: 'Restack 4-panel strips as 2×2: On',
        flags: ['--maximizestrips'],
        flow: [{ from: ['right', 'left'] }],
      },
    ],
  },

  {
    id: 'size-fit-enlarge',
    kind: 'pictures',
    input: PEPPER_SUN,
    profile: 'KPW6',
    screen: { width: 1272, height: 1696 },
    screenLabel: 'Kindle Paperwhite 6, 1272 × 1696',
    variants: [
      { id: 'fit', label: 'Page size: Fit, never enlarge', flags: [], without: ['--upscale'] },
      { id: 'enlarge', label: 'Page size: Fit, enlarging small pages', flags: ['--upscale'] },
    ],
  },
  {
    id: 'size-stretch-fill',
    kind: 'pictures',
    input: PEPPER_SUN,
    ...TALL_SCREEN,
    variants: [
      { id: 'enlarge', label: 'Page size: Fit, enlarging small pages', flags: ['--upscale'] },
      {
        id: 'stretch',
        label: 'Page size: Stretch to the screen',
        flags: ['--stretch'],
        without: ['--upscale'],
      },
      {
        id: 'fill',
        label: 'Page size: Crop to fill the screen',
        flags: ['--wallpaper'],
        without: ['--upscale'],
      },
    ],
  },
  {
    id: 'borders-light-page',
    kind: 'pictures',
    input: PEPPER_SUN,
    ...TALL_SCREEN,
    variants: [
      { id: 'automatic', label: 'Borders: Automatic', flags: [] },
      { id: 'white', label: 'Borders: White', flags: ['--whiteborders'] },
      { id: 'black', label: 'Borders: Black', flags: ['--blackborders'] },
    ],
  },
  {
    id: 'borders-dark-page',
    kind: 'pictures',
    input: DARK_PAGE,
    ...TALL_SCREEN,
    variants: [
      { id: 'automatic', label: 'Borders: Automatic', flags: [] },
      { id: 'white', label: 'Borders: White', flags: ['--whiteborders'] },
      { id: 'black', label: 'Borders: Black', flags: ['--blackborders'] },
    ],
  },

  {
    id: 'format-zoom',
    kind: 'pictures',
    input: PEPPER_SUN,
    zoom: { left: 330, top: 470, width: 120, height: 120 },
    variants: [
      { id: 'jpeg', label: 'Page format: JPEG, full tone', flags: [] },
      {
        id: 'png',
        label: 'Page format: PNG, reduced to the screen’s grays',
        flags: ['--forcepng'],
      },
      {
        id: 'png-256',
        label: 'Page format: PNG, with Keep all 256 grays',
        flags: ['--forcepng', '--noquantize'],
      },
    ],
  },
  {
    id: 'format-files',
    kind: 'files',
    input: PEPPER_SUN,
    variants: [
      { id: 'jpeg', label: 'Page format: JPEG, full tone', flags: [] },
      {
        id: 'png',
        label: 'Page format: PNG, reduced to the screen’s grays',
        flags: ['--forcepng'],
      },
      {
        id: 'png-8bit',
        label: 'PNG with 8-bit PNG',
        flags: ['--forcepng', '--pnglegacy'],
      },
      {
        id: 'png-256',
        label: 'PNG with Keep all 256 grays',
        flags: ['--forcepng', '--noquantize'],
      },
      { id: 'color', label: 'Color pages: Keep in color', flags: ['--forcecolor'] },
      {
        id: 'color-png',
        label: 'Color pages: Keep in color, with PNG pages',
        flags: ['--forcecolor', '--forcepng'],
      },
      {
        id: 'color-png-rgb',
        label: 'Color pages: Keep in color, with Color pages as PNG too',
        flags: ['--forcecolor', '--forcepng', '--force-png-rgb'],
      },
    ],
  },
  {
    id: 'jpeg-quality-files',
    kind: 'files',
    input: PEPPER_SUN,
    variants: [100, 95, 90, 85, 70, 50, 30, 10].map((quality) => ({
      id: `quality-${quality}`,
      label: `JPEG quality: ${quality}`,
      flags: ['--jpeg-quality', String(quality)],
    })),
  },
  {
    id: 'jpeg-quality-zoom',
    kind: 'pictures',
    input: PEPPER_SUN,
    zoom: { left: 700, top: 1100, width: 320, height: 200 },
    variants: [
      { id: 'quality-85', label: 'JPEG quality: 85', flags: ['--jpeg-quality', '85'] },
      { id: 'quality-30', label: 'JPEG quality: 30', flags: ['--jpeg-quality', '30'] },
      { id: 'quality-10', label: 'JPEG quality: 10', flags: ['--jpeg-quality', '10'] },
    ],
  },
  {
    id: 'as-they-are',
    kind: 'files',
    input: PEPPER_SUN,
    variants: [
      { id: 'processed', label: 'Use the images as they are: Off', flags: [] },
      { id: 'untouched', label: 'Use the images as they are: On', flags: ['--noprocessing'] },
    ],
  },

  {
    // The strip cut every 1500 pixels is the shape a webtoon is handed out in: each image ends where
    // it ends, and that is not between panels.
    id: 'reading-webtoon',
    kind: 'pictures',
    input: { slices: { of: PEPPER_STRIP, every: 1500 } },
    show: 'all',
    variants: [
      { id: 'pages', label: 'Content: Manga or comic pages', flags: [] },
      { id: 'webtoon', label: 'Content: Webtoon strips', flags: ['--webtoon'] },
    ],
  },
  {
    id: 'reading-webtoon-pages',
    kind: 'book',
    columns: ['pages'],
    input: { slices: { of: PEPPER_STRIP, every: 1500 } },
    variants: [
      { id: 'pages', label: 'Content: Manga or comic pages', flags: [] },
      { id: 'webtoon', label: 'Content: Webtoon strips', flags: ['--webtoon'] },
      {
        id: 'fill',
        label: 'Webtoon strips, with Page size: Crop to fill the screen',
        flags: ['--webtoon', '--wallpaper'],
      },
      {
        id: 'stretch',
        label: 'Webtoon strips, with Page size: Stretch to the screen',
        flags: ['--webtoon', '--stretch'],
      },
      {
        id: 'gutters',
        label: 'Webtoon strips, with Inter-panel cropping: Horizontal gaps',
        flags: ['--webtoon', '--ipc', 'horizontal'],
      },
      {
        id: 'borders',
        label: 'Webtoon strips, with Borders: Black',
        flags: ['--webtoon', '--blackborders'],
      },
      {
        id: 'cropping',
        label: 'Webtoon strips, with Page cropping: Disabled',
        flags: ['--webtoon', '--cropping', 'disabled'],
      },
      {
        id: 'untouched',
        label: 'Webtoon strips, with Use the images as they are',
        flags: ['--webtoon', '--noprocessing'],
      },
    ],
  },
  {
    id: 'reading-direction',
    kind: 'book',
    columns: ['direction'],
    input: { pages: PEPPER_STRIP },
    variants: [
      {
        id: 'epub-on',
        label: 'EPUB, Manga reading order: On',
        flags: ['--manga-style'],
        format: 'epub',
      },
      {
        id: 'epub-off',
        label: 'EPUB, Manga reading order: Off',
        flags: [],
        without: ['--manga-style'],
        format: 'epub',
      },
      {
        id: 'epub-webtoon',
        label: 'EPUB, Webtoon strips, with Manga reading order on',
        flags: ['--webtoon', '--manga-style'],
        format: 'epub',
      },
      {
        id: 'pdf-on',
        label: 'PDF, Manga reading order: On',
        flags: ['--manga-style'],
        format: 'pdf',
      },
      {
        id: 'cbz-on',
        label: 'CBZ, Manga reading order: On',
        flags: ['--manga-style'],
        format: 'cbz',
      },
    ],
  },

  {
    id: 'metadata-formats',
    kind: 'book',
    ...BOOK,
    columns: ['title', 'author', 'language'],
    variants: ['epub', 'pdf', 'cbz'].map((format) => ({
      id: format,
      label: format.toUpperCase(),
      flags: ['--title', TITLE, '--author', AUTHOR, '--language', 'ja'],
      format,
    })),
  },
  {
    id: 'metadata-title-author',
    kind: 'book',
    ...BOOK,
    columns: ['title', 'author'],
    variants: [
      { id: 'plain', label: 'Nothing given, and no ComicInfo.xml', flags: [], noComicInfo: true },
      { id: 'info', label: 'Nothing given, with a ComicInfo.xml', flags: [] },
      { id: 'title', label: 'Title given', flags: ['--title', TITLE] },
      { id: 'author', label: 'Author given', flags: ['--author', AUTHOR] },
      { id: 'both', label: 'Both given', flags: ['--title', TITLE, '--author', AUTHOR] },
    ],
  },
  {
    id: 'metadata-comicinfo-title',
    kind: 'book',
    ...BOOK,
    columns: ['title'],
    variants: [
      {
        id: 'series-only',
        label: 'ComicInfo title: Use series, volume, and number',
        flags: ['--metadatatitle', 'series-only'],
      },
      {
        id: 'combine',
        label: 'ComicInfo title: Append the ComicInfo title',
        flags: ['--metadatatitle', 'combine'],
      },
      {
        id: 'title-only',
        label: 'ComicInfo title: Use the ComicInfo title only',
        flags: ['--metadatatitle', 'title-only'],
      },
      {
        id: 'given-series-only',
        label: 'A title given, with Use series, volume, and number',
        flags: ['--title', TITLE, '--metadatatitle', 'series-only'],
      },
      {
        id: 'given-combine',
        label: 'A title given, with Append the ComicInfo title',
        flags: ['--title', TITLE, '--metadatatitle', 'combine'],
      },
      {
        id: 'given-title-only',
        label: 'A title given, with Use the ComicInfo title only',
        flags: ['--title', TITLE, '--metadatatitle', 'title-only'],
      },
      {
        id: 'no-info',
        label: 'Use the ComicInfo title only, and no ComicInfo.xml',
        flags: ['--metadatatitle', 'title-only'],
        noComicInfo: true,
      },
    ],
  },
  {
    id: 'metadata-keep-comicinfo',
    kind: 'book',
    ...BOOK,
    columns: ['comicInfo'],
    variants: [
      { id: 'off', label: 'CBZ, Keep ComicInfo.xml: Off', flags: [], format: 'cbz' },
      { id: 'on', label: 'CBZ, Keep ComicInfo.xml: On', flags: ['--keepcomicinfo'], format: 'cbz' },
      {
        id: 'on-given',
        label: 'CBZ, Keep ComicInfo.xml: On, with a title and an author given',
        flags: ['--keepcomicinfo', '--title', TITLE, '--author', AUTHOR],
        format: 'cbz',
      },
      {
        id: 'on-plain',
        label: 'CBZ, Keep ComicInfo.xml: On, and no ComicInfo.xml in the input',
        flags: ['--keepcomicinfo'],
        format: 'cbz',
        noComicInfo: true,
      },
      {
        id: 'epub',
        label: 'EPUB, Keep ComicInfo.xml: On',
        flags: ['--keepcomicinfo'],
        format: 'epub',
      },
      {
        id: 'pdf',
        label: 'PDF, Keep ComicInfo.xml: On',
        flags: ['--keepcomicinfo'],
        format: 'pdf',
      },
    ],
  },
  {
    id: 'metadata-language',
    kind: 'book',
    ...BOOK,
    columns: ['language'],
    variants: [
      { id: 'default', label: 'EPUB language: not given', flags: [], format: 'epub' },
      { id: 'ja', label: 'EPUB language: ja', flags: ['--language', 'ja'], format: 'epub' },
      {
        id: 'pt-BR',
        label: 'EPUB language: pt-BR',
        flags: ['--language', 'pt-BR'],
        format: 'epub',
      },
      { id: 'pdf', label: 'PDF, with ja', flags: ['--language', 'ja'], format: 'pdf' },
      { id: 'cbz', label: 'CBZ, with ja', flags: ['--language', 'ja'], format: 'cbz' },
    ],
  },
  {
    id: 'metadata-kepub',
    kind: 'book',
    ...BOOK,
    columns: ['fileName'],
    profile: 'KoLC',
    variants: [
      { id: 'kobo', label: 'Kobo Libra Colour, EPUB', flags: [], format: 'epub' },
      {
        id: 'kobo-plain',
        label: 'Kobo Libra Colour, EPUB, Name the book .epub: On',
        flags: ['--nokepub'],
        format: 'epub',
      },
      {
        id: 'kobo-custom',
        label: 'Kobo Libra Colour, EPUB, with a Custom width',
        flags: ['--customwidth', '1000'],
        format: 'epub',
      },
      { id: 'kobo-cbz', label: 'Kobo Libra Colour, CBZ', flags: [], format: 'cbz' },
      {
        id: 'kindle',
        label: 'Kindle Paperwhite 6, EPUB',
        flags: [],
        format: 'epub',
        profile: 'KPW6',
      },
    ],
  },

  {
    // The picture is the cover of an EPUB, which is made from the whole first image.
    id: 'cover-fit-fill',
    kind: 'pictures',
    cover: true,
    format: 'epub',
    input: PEPPER_FIRST,
    ...KPW6_SCREEN,
    variants: [
      { id: 'fit', label: 'Crop the cover to fill the screen: Off', flags: [] },
      { id: 'fill', label: 'Crop the cover to fill the screen: On', flags: ['--coverfill'] },
      { id: 'color', label: 'Color pages: Keep in color', flags: ['--forcecolor'] },
    ],
  },
  {
    // A wide first image, as a jacket scan or a spread is: two pages of Go Go! side by side, the later
    // one on the left, which is where the front of a right-to-left book lies.
    id: 'cover-smart-crop',
    kind: 'pictures',
    cover: true,
    format: 'epub',
    input: SPREAD,
    ...KPW6_SCREEN,
    variants: [
      { id: 'source', label: 'The first image as it came', flags: [], original: true },
      { id: 'whole', label: 'Cut the front cover from a wide image: Off', flags: [] },
      {
        id: 'smart',
        label: 'Cut the front cover from a wide image: On',
        flags: ['--smartcovercrop'],
      },
      {
        id: 'other-side',
        label: 'Cut the front cover from a wide image: On, with Manga reading order off',
        flags: ['--smartcovercrop'],
        without: ['--manga-style'],
      },
      {
        id: 'fill',
        label: 'Cut the front cover from a wide image: On, with Crop the cover to fill the screen',
        flags: ['--smartcovercrop', '--coverfill'],
      },
    ],
  },
  {
    id: 'cover-formats',
    kind: 'book',
    columns: ['source', 'firstPage', 'cover'],
    input: PEPPER_FIRST,
    variants: [
      { id: 'epub', label: 'EPUB', flags: [], format: 'epub' },
      {
        id: 'epub-fill',
        label: 'EPUB, with Crop the cover to fill the screen',
        flags: ['--coverfill'],
        format: 'epub',
      },
      {
        id: 'epub-color',
        label: 'EPUB, with Color pages: Keep in color',
        flags: ['--forcecolor'],
        format: 'epub',
      },
      { id: 'cbz', label: 'CBZ', flags: [], format: 'cbz' },
      {
        id: 'cbz-fill',
        label: 'CBZ, with Crop the cover to fill the screen',
        flags: ['--coverfill'],
        format: 'cbz',
      },
      {
        id: 'cbz-smart-page',
        label: 'CBZ, with Cut the front cover from a wide image, on a page',
        flags: ['--smartcovercrop'],
        format: 'cbz',
      },
      {
        id: 'cbz-smart-wide',
        label: 'CBZ, with Cut the front cover from a wide image, on a wide image',
        flags: ['--smartcovercrop'],
        format: 'cbz',
        input: SPREAD,
      },
      {
        id: 'cbz-smart-fill',
        label: 'CBZ, with that and Crop the cover to fill the screen',
        flags: ['--smartcovercrop', '--coverfill'],
        format: 'cbz',
        input: SPREAD,
      },
      {
        id: 'cbz-own',
        label: 'CBZ, with a cover of your own',
        flags: [],
        format: 'cbz',
        ownCover: PEPPER_DARK,
      },
      {
        id: 'cbz-own-fill',
        label: 'CBZ, with a cover of your own and Crop the cover to fill the screen',
        flags: ['--coverfill'],
        format: 'cbz',
        ownCover: PEPPER_DARK,
      },
      {
        id: 'pdf-own',
        label: 'PDF, with a cover of your own',
        flags: [],
        format: 'pdf',
        ownCover: PEPPER_DARK,
      },
      {
        id: 'pdf-smart-wide',
        label: 'PDF, with Cut the front cover from a wide image, on a wide image',
        flags: ['--smartcovercrop'],
        format: 'pdf',
        input: SPREAD,
      },
    ],
  },
  {
    // One image from each of the shapes mangapress tells apart, cut from the same three pages.
    id: 'cover-smart-bands',
    kind: 'book',
    columns: ['source', 'cover'],
    format: 'epub',
    input: { beside: WIDE_STRIP, ratio: 0.75 },
    variants: [0.75, 1.2, 1.5, 1.75, 1.9, 2.2].map((ratio) => ({
      id: `ratio-${ratio}`,
      label: `An image ${ratio} times as wide as tall`,
      flags: ['--smartcovercrop'],
      input: { beside: WIDE_STRIP, ratio },
    })),
  },
];
