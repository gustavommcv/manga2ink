import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { I18nContext } from '@/renderer/hooks/use-messages';
import { messagesFor } from '@/i18n/messages';

import { defaultMangapressSettings } from '@/domain/output-profile';

import { MangapressSettingsEditor } from './mangapress-settings';

const profiles = [
  {
    code: 'KPW6',
    name: 'Kindle Paperwhite 6',
    width: 1272,
    height: 1696,
    grayLevels: 16,
    family: 'kindle',
  },
  {
    code: 'OTHER',
    name: 'Custom',
    width: 0,
    height: 0,
    grayLevels: 256,
    family: 'other',
  },
  {
    code: 'KS',
    name: 'Kindle Scribe',
    width: 1860,
    height: 2480,
    grayLevels: 16,
    family: 'kindle',
  },
  {
    code: 'KCS',
    name: 'Kindle Colorsoft',
    width: 1272,
    height: 1696,
    grayLevels: 16,
    family: 'kindle',
  },
  {
    code: 'KoC',
    name: 'Kobo Clara HD',
    width: 1072,
    height: 1448,
    grayLevels: 16,
    family: 'kobo',
  },
] as const;

const meta = {
  title: 'Workflows/Output settings',
  component: MangapressSettingsEditor,
  decorators: [
    (Story) => (
      <div className="bg-background text-foreground min-h-screen p-8">
        <div className="mx-auto max-w-5xl">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    format: 'epub',
    onFormat: () => undefined,
    onNotify: () => undefined,
    onSettings: () => undefined,
    profiles,
    settings: defaultMangapressSettings,
  },
} satisfies Meta<typeof MangapressSettingsEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};

/** The middle of an element, as the page draws it. */
const middleOf = (element: Element | null): number => {
  if (element === null) throw new Error('An element of the page is not drawn.');
  const { top, height } = element.getBoundingClientRect();
  return top + height / 2;
};

/**
 * A choice beside a field with a label is in line with the field's control, and its description with
 * the field's own; two choices side by side are in line with each other (ADR 0071).
 */
export const ChoicesLineUp: Story = {
  play: async () => {
    const select = document.getElementById('content');
    const box = document.getElementById('manga-style');
    await expect(Math.abs(middleOf(box) - middleOf(select))).toBeLessThanOrEqual(0.75);
    await expect(
      Math.abs(
        (document.getElementById('manga-style-message')?.getBoundingClientRect().top ?? NaN) -
          (document.getElementById('content-message')?.getBoundingClientRect().top ?? NaN),
      ),
    ).toBeLessThanOrEqual(0.75);

    const first = document.getElementById('no-processing');
    const second = document.getElementById('no-kepub');
    await expect(Math.abs(middleOf(first) - middleOf(second))).toBeLessThanOrEqual(0.5);
    await expect(first?.closest('[data-slot="check-row"]')).not.toHaveAttribute(
      'data-beside-field',
    );
  },
};

/** The same, in Portuguese, whose words are longer: the lines still meet (ADR 0071). */
export const ChoicesLineUpInPortuguese: Story = {
  decorators: [
    (Story) => (
      <I18nContext.Provider value={{ language: 'pt-BR', messages: messagesFor('pt-BR') }}>
        <Story />
      </I18nContext.Provider>
    ),
  ],
  play: async () => {
    await expect(
      Math.abs(
        middleOf(document.getElementById('manga-style')) -
          middleOf(document.getElementById('content')),
      ),
    ).toBeLessThanOrEqual(0.75);
    await expect(
      Math.abs(
        (document.getElementById('manga-style-message')?.getBoundingClientRect().top ?? NaN) -
          (document.getElementById('content-message')?.getBoundingClientRect().top ?? NaN),
      ),
    ).toBeLessThanOrEqual(0.75);
  },
};

/** A changed choice shows its reset button on the row of its box, not above or below it. */
export const ChangedChoiceLinesUp: Story = {
  args: { settings: { ...defaultMangapressSettings, mangaStyle: false } },
  play: async () => {
    const reset = within(document.body).getByRole('button', {
      name: /Manga reading order/u,
    });
    await expect(
      Math.abs(middleOf(reset) - middleOf(document.getElementById('manga-style'))),
    ).toBeLessThanOrEqual(1.5);
  },
};

export const ModifiedOptions: Story = {
  args: {
    format: 'cbz',
    settings: {
      ...defaultMangapressSettings,
      deviceProfile: 'KS',
      upscale: false,
      mangaStyle: false,
      splitter: 'rotate',
      gamma: 1.2,
      jpegQuality: 80,
      quiet: true,
    },
  },
};

export const ConditionalControls: Story = {
  args: {
    format: 'cbz',
    settings: {
      ...defaultMangapressSettings,
      forcePng: true,
      noAutoContrast: true,
      wallpaper: true,
    },
  },
};

/**
 * Webtoon strips lock what mangapress never does to them; each locked control says so. A locked choice,
 * dimmed and with the reason where its description is, stays where it is: in line with its neighbour.
 */
export const WebtoonStrips: Story = {
  args: {
    settings: { ...defaultMangapressSettings, webtoon: true },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('combobox', { name: 'Content' })).toHaveValue('webtoon');
    await expect(canvas.getByRole('checkbox', { name: 'Manga reading order' })).toBeDisabled();
    await expect(canvas.getByRole('combobox', { name: 'Wide pages' })).toBeDisabled();
    await expect(canvas.getByRole('combobox', { name: 'Borders' })).toBeDisabled();
    await expect(canvas.getByRole('combobox', { name: 'Page cropping' })).toBeDisabled();
    await expect(canvas.getByRole('combobox', { name: 'Inter-panel cropping' })).toBeEnabled();
    // The locked choice is where it would be if it were not locked.
    await expect(
      Math.abs(
        middleOf(document.getElementById('manga-style')) -
          middleOf(document.getElementById('content')),
      ),
    ).toBeLessThanOrEqual(0.75);
    await expect(
      Math.abs(
        (document.getElementById('manga-style-message')?.getBoundingClientRect().top ?? NaN) -
          (document.getElementById('content-message')?.getBoundingClientRect().top ?? NaN),
      ),
    ).toBeLessThanOrEqual(0.75);
  },
};

/** The whole spread kept upright, black borders, and the two-page view of an EPUB set. */
export const SpreadsAndBorders: Story = {
  args: {
    settings: {
      ...defaultMangapressSettings,
      splitter: 'rotate',
      noRotate: true,
      blackBorders: true,
      wallpaper: true,
      upscale: false,
      spreadShift: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('combobox', { name: 'Page size' })).toHaveValue('fill');
    await expect(canvas.getByRole('combobox', { name: 'Borders' })).toHaveValue('black');
    await expect(canvas.getByRole('checkbox', { name: 'Whole spread first' })).toBeDisabled();
    await expect(canvas.getByRole('checkbox', { name: 'Rotate clockwise' })).toBeDisabled();
  },
};

/** A color reader with PNG pages: color is kept, and the PNG variants are there to choose. */
export const ColorAndPng: Story = {
  args: {
    settings: {
      ...defaultMangapressSettings,
      deviceProfile: 'KCS',
      forceColor: true,
      colorAutoContrast: true,
      forcePng: true,
      noQuantize: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('combobox', { name: 'Color pages' })).toHaveValue('color');
    await expect(canvas.getByRole('combobox', { name: 'Autocontrast' })).toHaveValue('all');
    await expect(canvas.getByRole('combobox', { name: 'Page format' })).toHaveValue('png');
    await expect(canvas.getByRole('spinbutton', { name: /^JPEG quality/u })).toBeEnabled();
    await expect(canvas.getByRole('checkbox', { name: '8-bit PNG' })).toBeDisabled();
    await expect(canvas.getByRole('checkbox', { name: 'Color pages as PNG too' })).toBeEnabled();
  },
};

/** Images left as they are: what would change them is locked, what the book still takes is not. */
export const UntouchedImages: Story = {
  args: {
    settings: { ...defaultMangapressSettings, noProcessing: true },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('checkbox', { name: 'Use the images as they are' }),
    ).toBeChecked();
    await expect(canvas.getByRole('combobox', { name: 'Wide pages' })).toBeDisabled();
    await expect(canvas.getByRole('combobox', { name: 'Page size' })).toBeDisabled();
    await expect(canvas.getByRole('combobox', { name: 'Page format' })).toBeDisabled();
    await expect(canvas.getByRole('checkbox', { name: 'Manga reading order' })).toBeEnabled();
    await expect(canvas.getByRole('combobox', { name: 'Color pages' })).toBeEnabled();
  },
};

/** A Kobo with the plain file name, and a cover cut from a wide image and cropped to the screen. */
export const KoboCover: Story = {
  args: {
    settings: {
      ...defaultMangapressSettings,
      deviceProfile: 'KoC',
      noKepub: true,
      smartCoverCrop: true,
      coverFill: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = canvas.getByRole('checkbox', { name: 'Name the book .epub' });
    await expect(name).toBeEnabled();
    await expect(name).toBeChecked();
    await expect(
      canvas.getByRole('checkbox', { name: 'Cut the front cover from a wide image' }),
    ).toBeChecked();
    await expect(
      canvas.getByRole('checkbox', { name: 'Crop the cover to fill the screen' }),
    ).toBeChecked();
  },
};

export const ValidationError: Story = {
  args: {
    settings: { ...defaultMangapressSettings, deviceProfile: 'OTHER' },
  },
};

/** When single-book mode is active from the queue, the format stays a choice and the status shows active. */
export const SingleBookActive: Story = {
  args: {
    singleBook: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('combobox', { name: 'Book format' })).toBeEnabled();
    await expect(canvas.getByRole('status')).toHaveTextContent('Single book for the series');
    await expect(canvas.getByRole('status')).toHaveTextContent(
      'Active from the queue: the series will be produced as a single book',
    );
  },
};
