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
// Two consecutive pages of one comic joined side by side, as a scan of a double page is. The later
// page is on the left and the earlier one on the right, which is how a book read right to left lies open.
const SPREAD = { beside: [{ source: 'gogo-04' }, { source: 'gogo-03' }] };

/**
 * kind 'pictures': one picture per variant, the first page of the result.
 * kind 'sizes': no pictures, only the size of the page each variant gives and the share of the source
 *   page it keeps; the pages are not enlarged, so the size says what was cropped.
 * `input` is one page, or `{ stack: [...] }` for pages joined into one tall strip.
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
    id: 'spreads-wide-pages',
    kind: 'pictures',
    input: SPREAD,
    show: 'all',
    variants: [
      { id: 'source', label: 'The spread as it came', original: true },
      { id: 'split', label: 'Wide pages: Split into two pages', flags: ['--splitter', 'split'] },
      {
        id: 'rotate',
        label: 'Wide pages: Keep whole, as one page',
        flags: ['--splitter', 'rotate'],
      },
      {
        id: 'both',
        label: 'Wide pages: Both: the halves, then the whole',
        flags: ['--splitter', 'both'],
      },
    ],
  },
  {
    id: 'spreads-too-wide',
    kind: 'pictures',
    // Three pages side by side: 3240 x 1440, a page 2.25 times as wide as it is tall.
    input: { beside: [{ source: 'gogo-04' }, { source: 'gogo-03' }, { source: 'gogo-02' }] },
    show: 'all',
    variants: [
      { id: 'source', label: 'The wide page as it came', original: true },
      { id: 'split', label: 'Wide pages: Split into two pages', flags: ['--splitter', 'split'] },
    ],
  },
  {
    id: 'spreads-reading-order',
    kind: 'pictures',
    input: SPREAD,
    show: 'all',
    variants: [
      { id: 'right-to-left', label: 'Manga reading order: On', flags: ['--splitter', 'split'] },
      {
        id: 'left-to-right',
        label: 'Manga reading order: Off',
        flags: ['--splitter', 'split'],
        without: ['--manga-style'],
      },
    ],
  },
  {
    id: 'spreads-whole-copy',
    kind: 'pictures',
    input: SPREAD,
    show: 'all',
    variants: [
      {
        id: 'default',
        label: 'Wide pages: Both, with the whole spread last',
        flags: ['--splitter', 'both'],
      },
      { id: 'first', label: 'Whole spread first', flags: ['--splitter', 'both', '--rotatefirst'] },
      {
        id: 'upright',
        label: 'Keep the whole spread upright',
        flags: ['--splitter', 'both', '--norotate'],
      },
      {
        id: 'clockwise',
        label: 'Rotate clockwise',
        flags: ['--splitter', 'both', '--rotateright'],
      },
    ],
  },
  {
    id: 'spreads-restack',
    kind: 'pictures',
    input: SPREAD,
    show: 'all',
    variants: [
      { id: 'off', label: 'Restack 4-panel strips as 2×2: Off', flags: [] },
      { id: 'on', label: 'Restack 4-panel strips as 2×2: On', flags: ['--maximizestrips'] },
    ],
  },
];
