import type { Meta, StoryObj } from '@storybook/react-vite';

import { Screen } from './screen';
import { ScreenHeader } from './screen-header';
import { TwoColumns } from './two-columns';

const card = 'border-border bg-surface rounded-xl border p-5 text-sm';

const meta = {
  title: 'Workflows/Screen',
  component: Screen,
  args: { labelledBy: 'screen-title', children: null },
  render: (args) => (
    <Screen {...args}>
      <ScreenHeader description="What the screen says." id="screen-title" title="A screen" />
      <div className={card}>What the screen is made of.</div>
    </Screen>
  ),
} satisfies Meta<typeof Screen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The whole of what the window gives, for a screen that sets things beside each other. */
export const Wide: Story = { args: { width: 'wide' } };

/** A column to read and fill in. */
export const Form: Story = { args: { width: 'form' } };

/** A short column that says one thing. */
export const Status: Story = { args: { width: 'status' } };

/** What the screen is about and a card beside it, on the one proportion of the queue and the books. */
export const WithACardBeside: Story = {
  args: { width: 'wide' },
  render: (args) => (
    <Screen {...args}>
      <ScreenHeader id="screen-title" title="A screen" />
      <TwoColumns aside={<aside className={`${card} h-fit`}>The card beside it.</aside>}>
        <div className={card}>What the screen is about.</div>
      </TwoColumns>
    </Screen>
  ),
};
