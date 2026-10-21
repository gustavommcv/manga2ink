import type { Meta, StoryObj } from '@storybook/react-vite';

import { InfoBanner } from './info-banner';

const meta = {
  title: 'Workflows/Info banner',
  component: InfoBanner,
  args: {
    title: 'Single book for the series',
    message:
      'Active from the queue: the series will be produced as a single book, in the format chosen here. The process steps are locked.',
  },
} satisfies Meta<typeof InfoBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MessageOnly: Story = {
  args: {
    title: undefined,
    message: 'Each title in the library will be produced as its own single-series EPUB.',
  },
};
