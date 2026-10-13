import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { defaultMangapressSettings } from '@/domain/output-profile';
import { defaultFormat } from '@/domain/preferences';

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
        setSettings(defaultMangapressSettings);
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
    settings: defaultMangapressSettings,
    singleBook: false,
  },
} satisfies Meta<typeof ConversionOptionsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Conversion options' })).toHaveFocus();
    await expect(canvas.getByRole('button', { name: 'Reset to defaults' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  },
};

export const ModifiedOptions: Story = {
  args: {
    format: 'pdf',
    settings: { ...defaultMangapressSettings, gamma: 1.2, jpegQuality: 80 },
  },
};

export const AskingToReset: Story = {
  args: ModifiedOptions.args,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Reset to defaults' }));
    await expect(canvas.getByRole('group', { name: 'Confirm reset' })).toHaveTextContent(
      'Put the device, format and every mangapress option back to their defaults?',
    );
  },
};

export const SingleBookActive: Story = {
  args: { singleBook: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status', { name: 'Single book for the series' })).toBeVisible();
    await expect(canvas.getByLabelText('Book format')).toBeDisabled();
  },
};

export const ProfilesUnavailable: Story = {
  args: { profiles: [] },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByLabelText('Device profile')).toBeDisabled();
  },
};

export const ValidationError: Story = {
  args: { settings: { ...defaultMangapressSettings, jpegQuality: 500 } },
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
