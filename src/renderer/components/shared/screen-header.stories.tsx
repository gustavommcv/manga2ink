import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { Button } from '@/renderer/components/ui/button';

import { Eyebrow } from './eyebrow';
import { ScreenHeader } from './screen-header';

const meta = {
  title: 'Workflows/Screen header',
  component: ScreenHeader,
  args: {
    id: 'screen-title',
    title: 'Chainsaw Man',
    description: 'Every field is optional. What you leave empty uses its default.',
    eyebrow: <Eyebrow>Book details</Eyebrow>,
    back: { label: 'Queue', onBack: fn() },
  },
  decorators: [
    (Story) => (
      <section aria-labelledby="screen-title" className="mx-auto max-w-3xl">
        <Story />
      </section>
    ),
  ],
} satisfies Meta<typeof ScreenHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The way back, the line above, the title and what it says: what every page starts with. */
export const Page: Story = {};

export const WithActions: Story = {
  args: {
    actions: <Button variant="outline">Convert more</Button>,
    back: undefined,
    eyebrow: undefined,
    title: '3 books ready',
    description: 'Kobo Libra Colour · EPUB',
  },
};

/** A name with no space to break at stays inside the page. */
export const LongName: Story = {
  args: {
    title:
      'A_Very_Long_Folder_Name_With_No_Spaces_In_It_At_All_That_Would_Run_Past_The_Edge_Of_The_Page',
  },
};

/** The title of a screen that is one list among others, with how many are in it. */
export const Section: Story = {
  args: {
    actions: <Button variant="outline">Files</Button>,
    back: undefined,
    badge: (
      <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">5</span>
    ),
    description: undefined,
    eyebrow: undefined,
    size: 'section',
    title: 'Queue',
  },
};
