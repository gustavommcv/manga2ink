import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { defaultMangaprepSettings } from '@/domain/output-profile';
import { defaultFormat } from '@/domain/preferences';
import { I18nContext } from '@/renderer/hooks/use-messages';
import { messagesFor } from '@/i18n/messages';
import { wordsOf } from '@/renderer/stories/language';

import {
  ConversionOptionsScreen,
  type ConversionOptionsScreenProps,
} from './conversion-options-screen';

/** Keep controlled choices in the story's parent, as the workflow does. */
function Stateful(props: ConversionOptionsScreenProps): React.JSX.Element {
  const [format, setFormat] = useState(props.format);
  const [settings, setSettings] = useState(props.settings);
  const [itemsWithOptions, setItemsWithOptions] = useState(props.itemsWithOptions);
  return (
    <ConversionOptionsScreen
      {...props}
      format={format}
      itemsWithOptions={itemsWithOptions}
      onClearItemOptions={() => {
        setItemsWithOptions(0);
        props.onClearItemOptions();
      }}
      onFormat={setFormat}
      onReset={() => {
        setFormat(defaultFormat);
        setSettings(defaultMangaprepSettings);
        props.onReset();
      }}
      onSettings={setSettings}
      settings={settings}
    />
  );
}

const meta = {
  title: 'Workflows/Conversion options',
  component: ConversionOptionsScreen,
  render: (args) => <Stateful {...args} />,
  decorators: [
    (Story) => (
      <div className="bg-background text-foreground min-h-screen px-8 py-10">
        <div className="mx-auto max-w-6xl">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    format: defaultFormat,
    itemsWithOptions: 0,
    onBack: () => undefined,
    onClearItemOptions: () => undefined,
    onFormat: () => undefined,
    onNotify: () => undefined,
    onReset: () => undefined,
    onSettings: () => undefined,
    profiles: [
      {
        code: 'KPW6',
        name: 'Kindle Paperwhite 6',
        width: 1272,
        height: 1696,
        grayLevels: 16,
        family: 'kindle',
      },
    ],
    settings: defaultMangaprepSettings,
  },
} satisfies Meta<typeof ConversionOptionsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  play: async ({ canvasElement, globals }) => {
    const words = wordsOf(globals);
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: words.options.page.title })).toHaveFocus();
    await expect(canvas.getByRole('button', { name: words.settings.reset.button })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  },
};

export const ModifiedOptions: Story = {
  args: {
    format: 'pdf',
    settings: { ...defaultMangaprepSettings, gamma: 1.2, jpegQuality: 80 },
  },
};

export const AskingToReset: Story = {
  args: ModifiedOptions.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Reset to defaults' }));
    await expect(canvas.getByRole('group', { name: 'Confirm reset' })).toHaveTextContent(
      'Put the device, format and every mangaprep option back to their defaults?',
    );
  },
};

export const ProfilesUnavailable: Story = {
  args: { profiles: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Device profile')).toBeDisabled();
  },
};

export const ValidationError: Story = {
  args: { settings: { ...defaultMangaprepSettings, jpegQuality: 500 } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText(/^JPEG quality/u)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  },
};

export const ItemsWithOptionsOfTheirOwn: Story = {
  args: { itemsWithOptions: 2 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const notice = canvas.getByRole('group', { name: 'Items with options of their own' });
    await expect(
      within(notice).getByText('2 items in the queue are converted with options of their own.'),
    ).toBeVisible();
    await userEvent.click(
      within(notice).getByRole('button', { name: 'Use the queue’s options for all' }),
    );
    await expect(canvas.getByText('2 items now follow the queue’s options.')).toHaveFocus();
  },
};

const inPortuguese: Decorator = (Story) => (
  <I18nContext.Provider value={{ language: 'pt-BR', messages: messagesFor('pt-BR') }}>
    <Story />
  </I18nContext.Provider>
);

/**
 * The page of the conversion options in Brazilian Portuguese, for webtoon strips, so that the controls
 * they leave without effect say why in the words of the language (ADR 0053).
 */
export const InPortuguese: Story = {
  decorators: [inPortuguese],
  args: {
    itemsWithOptions: 2,
    settings: { ...defaultMangaprepSettings, webtoon: true },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Opções de conversão' })).toBeVisible();
    await expect(canvas.getByLabelText('Ordem de leitura de mangá')).toBeDisabled();
  },
};

/**
 * The page of the conversion options in Japanese, for webtoon strips, so that the controls they leave
 * without effect say why in the words of the language (ADR 0053, ADR 0084).
 */
export const InJapanese: Story = {
  globals: { language: 'ja' },
  args: InPortuguese.args ?? {},
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: '変換オプション' })).toBeVisible();
    await expect(canvas.getByLabelText('マンガの読み順')).toBeDisabled();
  },
};
