import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { BookFormat } from '@/domain/conversion';
import { defaultMangapressSettings, type MangapressSettings } from '@/domain/output-profile';
import { MangapressSettingsEditor } from '@/renderer/components/settings/mangapress-settings';

const profiles = [
  {
    code: 'KPW6',
    name: 'Kindle Paperwhite 6',
    width: 1272,
    height: 1696,
    grayLevels: 16,
    family: 'kindle',
  },
  { code: 'KoC', name: 'Kobo Clara HD', width: 1072, height: 1448, grayLevels: 16, family: 'kobo' },
  { code: 'OTHER', name: 'Custom', width: 0, height: 0, grayLevels: 256, family: 'other' },
] as const;

type Change =
  | { readonly kind: 'toggle' }
  | { readonly kind: 'select'; readonly option: string }
  | { readonly kind: 'number'; readonly typed: string }
  | { readonly kind: 'text'; readonly typed: string };

interface Control {
  /** The label the page shows for it. */
  readonly label: string;
  readonly change: Change;
  /** What the settings become, beside what they were. */
  readonly sets: Partial<MangapressSettings>;
  /** The settings it starts from, where the control only works with another choice made. */
  readonly from?: Partial<MangapressSettings>;
  readonly format?: BookFormat;
}

/**
 * Every control of the options page and the one setting it is for. A control wired to the wrong
 * key still looks right on the page and still saves, and so is found only by a person who looks at
 * the converted book: this finds it by changing each control and asking what changed.
 */
const controls: readonly Control[] = [
  { label: 'Custom width', change: { kind: 'number', typed: '1400' }, sets: { customWidth: 1400 } },
  {
    label: 'Custom height',
    change: { kind: 'number', typed: '1800' },
    sets: { customHeight: 1800 },
  },
  { label: 'Use the images as they are', change: { kind: 'toggle' }, sets: { noProcessing: true } },
  {
    label: 'Name the book .epub',
    change: { kind: 'toggle' },
    sets: { noKepub: true },
    // Only a Kobo's EPUB is named .kepub.epub.
    from: { deviceProfile: 'KoC' },
  },
  {
    label: 'Content',
    change: { kind: 'select', option: 'webtoon' },
    sets: { webtoon: true },
    // The page-reading order, wide pages and every other choice that does not apply to a strip are
    // locked by it: the editor puts them where webtoon needs them, and this keeps what it says.
  },
  { label: 'Manga reading order', change: { kind: 'toggle' }, sets: { mangaStyle: false } },
  {
    label: 'Wide pages',
    change: { kind: 'select', option: 'split' },
    sets: { splitter: 'split' },
  },
  { label: 'Whole spread first', change: { kind: 'toggle' }, sets: { rotateFirst: true } },
  {
    label: 'Keep the whole spread upright',
    change: { kind: 'toggle' },
    sets: { noRotate: true },
    from: { splitter: 'rotate' },
  },
  { label: 'Rotate clockwise', change: { kind: 'toggle' }, sets: { rotateRight: true } },
  {
    label: 'Restack 4-panel strips as 2×2',
    change: { kind: 'toggle' },
    sets: { maximizeStrips: true },
  },
  {
    label: 'Page cropping',
    change: { kind: 'select', option: 'margins' },
    sets: { cropping: 'margins' },
  },
  {
    label: 'Cropping power',
    change: { kind: 'number', typed: '2.5' },
    sets: { croppingPower: 2.5 },
  },
  {
    label: 'Minimum retained area (%)',
    change: { kind: 'number', typed: '40' },
    sets: { croppingMinimum: 40 },
  },
  {
    label: 'Preserved margin (%)',
    change: { kind: 'number', typed: '15' },
    sets: { preserveMargin: 15 },
  },
  {
    label: 'Inter-panel cropping',
    change: { kind: 'select', option: 'both' },
    sets: { interPanelCrop: 'both' },
  },
  { label: 'Start on the other side', change: { kind: 'toggle' }, sets: { spreadShift: true } },
  { label: 'One page in landscape', change: { kind: 'toggle' }, sets: { onePageLandscape: true } },
  { label: 'Invert page turns', change: { kind: 'toggle' }, sets: { invertDirection: true } },
  {
    label: 'Color pages',
    change: { kind: 'select', option: 'color' },
    sets: { forceColor: true },
  },
  { label: 'Reduce rainbow effect', change: { kind: 'toggle' }, sets: { eraseRainbow: true } },
  { label: 'Auto-level black point', change: { kind: 'toggle' }, sets: { autoLevel: true } },
  { label: 'Gamma', change: { kind: 'number', typed: '1.4' }, sets: { gamma: 1.4 } },
  {
    label: 'Page format',
    change: { kind: 'select', option: 'png' },
    sets: { forcePng: true },
  },
  { label: 'JPEG quality', change: { kind: 'number', typed: '70' }, sets: { jpegQuality: 70 } },
  {
    label: 'Keep all 256 grays',
    change: { kind: 'toggle' },
    sets: { noQuantize: true },
    // The three PNG choices have nothing to act on while pages are saved as JPEG.
    from: { forcePng: true },
  },
  {
    label: '8-bit PNG',
    change: { kind: 'toggle' },
    sets: { pngLegacy: true },
    from: { forcePng: true },
  },
  {
    label: 'Color pages as PNG too',
    change: { kind: 'toggle' },
    sets: { forcePngRgb: true },
    // Only pages kept in color can be saved as color PNG.
    from: { forcePng: true, forceColor: true },
  },
  {
    label: 'Cut the front cover from a wide image',
    change: { kind: 'toggle' },
    sets: { smartCoverCrop: true },
  },
  {
    label: 'Crop the cover to fill the screen',
    change: { kind: 'toggle' },
    sets: { coverFill: true },
  },
  {
    label: 'ComicInfo title',
    change: { kind: 'select', option: 'title-only' },
    sets: { metadataTitle: 'title-only' },
  },
  { label: 'EPUB language', change: { kind: 'text', typed: 'pt-BR' }, sets: { language: 'pt-BR' } },
  {
    label: 'Keep ComicInfo.xml',
    change: { kind: 'toggle' },
    sets: { keepComicInfo: true },
    // Only a CBZ keeps the file it was given.
    format: 'cbz',
  },
  { label: 'Quiet mode', change: { kind: 'toggle' }, sets: { quiet: true } },
];

const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
/** The control of a label; a field that may be left empty has "(optional)" after it. */
const controlOf = (label: string): HTMLElement =>
  screen.getByLabelText(new RegExp(`^${escaped(label)}( \\(optional\\))?$`, 'u'));

describe('every control of the conversion options page', () => {
  it.each(controls)(
    '$label changes its own setting, and no other',
    async ({ label, change, sets, from, format = 'epub' }) => {
      const user = userEvent.setup();
      const onSettings = vi.fn<(settings: MangapressSettings) => void>();
      const settings = { ...defaultMangapressSettings, ...from };
      render(
        <MangapressSettingsEditor
          format={format}
          onFormat={vi.fn()}
          onNotify={vi.fn()}
          onSettings={onSettings}
          profiles={profiles}
          settings={settings}
          singleBook={false}
        />,
      );
      const control = controlOf(label);
      expect(control).toBeEnabled();

      if (change.kind === 'toggle') await user.click(control);
      else if (change.kind === 'select') await user.selectOptions(control, change.option);
      else fireEvent.change(control, { target: { value: change.typed } });

      expect(onSettings).toHaveBeenCalled();
      expect(onSettings.mock.lastCall?.[0]).toEqual({ ...settings, ...sets });
    },
  );

  it('are all of the settings the page can change, so a new control is added here on purpose', () => {
    const covered = new Set(controls.flatMap((control) => Object.keys(control.sets)));

    // What is not a control of this table is chosen by another: the device and its two coupled
    // choices, the page size and the borders, auto-contrast and the three the page lays out as one.
    const elsewhere = [
      'deviceProfile',
      'upscale',
      'stretch',
      'wallpaper',
      'whiteBorders',
      'blackBorders',
      'noAutoContrast',
      'colorAutoContrast',
      'combineIntoOneVolume',
    ];
    const missing = Object.keys(defaultMangapressSettings).filter(
      (key) => !covered.has(key) && !elsewhere.includes(key),
    );
    expect(missing).toEqual([]);
  });
});
