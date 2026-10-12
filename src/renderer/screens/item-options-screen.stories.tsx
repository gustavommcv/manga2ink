import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { defaultMangapressSettings } from '@/domain/output-profile';

import { ItemOptionsScreen, type ItemOptionsScreenProps } from './item-options-screen';

/** Keeps the item's options in the story's parent, as the workflow keeps them with the row. */
function Stateful(props: ItemOptionsScreenProps): React.JSX.Element {
  const [run, setRun] = useState({ format: props.format, settings: props.settings });
  const [own, setOwn] = useState(props.hasOwnOptions);
  return (
    <ItemOptionsScreen
      {...props}
      format={run.format}
      hasOwnOptions={own}
      onChange={(next) => {
        setRun(next);
        setOwn(true);
      }}
      onUseQueueOptions={() => {
        setRun({ format: 'cbz', settings: defaultMangapressSettings });
        setOwn(false);
      }}
      settings={run.settings}
    />
  );
}

const meta = {
  title: 'Workflows/Item options',
  component: ItemOptionsScreen,
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
    backLabel: 'Queue',
    format: 'cbz',
    hasOwnOptions: false,
    name: 'Chainsaw Man',
    onBack: () => undefined,
    onChange: () => undefined,
    onNotify: () => undefined,
    onUseQueueOptions: () => undefined,
    profiles: [
      {
        code: 'KPW6',
        name: 'Kindle Paperwhite 6',
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
    ],
    queue: { format: 'cbz', settings: defaultMangapressSettings },
    settings: defaultMangapressSettings,
    singleBook: false,
  },
} satisfies Meta<typeof ItemOptionsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An item that follows the queue: the same choices as the queue's page, and nothing of its own. */
export const FollowsTheQueue: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Options for Chainsaw Man' })).toHaveFocus();
    await expect(canvas.getByText('This item uses the options of the queue.')).toBeVisible();
    await expect(canvas.getByRole('button', { name: /Use the queue’s options/u })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  },
};

/** A choice made here is this item's: the page says so, and offers going back to the queue's. */
export const ChoosingOwnOptions: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.selectOptions(canvas.getByLabelText('Device profile'), 'KoC');
    await expect(canvas.getByText('This item has options of its own.')).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: /Use the queue’s options/u }));
    await expect(canvas.getByText('This item uses the options of the queue.')).toBeVisible();
  },
};

export const WithOptionsOfItsOwn: Story = {
  args: {
    hasOwnOptions: true,
    format: 'epub',
    settings: { ...defaultMangapressSettings, deviceProfile: 'KoC', webtoon: true },
  },
};

/** One title of a library: Back leads to the library it is in, and the name can be long. */
export const TitleOfALibrary: Story = {
  args: {
    backLabel: 'Manga Library with a rather long folder name',
    name: 'Kimi ni Todoke: From Me to You (Complete Edition, Remastered Scans)',
  },
};

/** One book per series is on for the whole queue, so the format cannot be set here. */
export const SingleBookActive: Story = {
  args: { format: 'epub', singleBook: true },
};
