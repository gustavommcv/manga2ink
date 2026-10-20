import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, within } from 'storybook/test';

import { NativeSelect } from '@/renderer/components/ui/native-select';

import { Field } from './field';
import { Note } from './note';

const meta = {
  title: 'Workflows/Field',
  component: Field,
  decorators: [
    (Story) => (
      <div className="bg-background text-foreground min-h-screen p-8">
        <div className="border-border bg-surface mx-auto max-w-sm space-y-5 rounded-xl border p-6">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    children: (
      <NativeSelect aria-describedby="device-message" id="device">
        <option>Kindle Paperwhite 6</option>
      </NativeSelect>
    ),
    id: 'device',
    label: 'Device',
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A label above its control, and under it what the field is for: 8 px between each (ADR 0079). */
export const WithADescription: Story = {
  args: { description: '1272 × 1696 · 16 gray levels' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The line the label is on, not the text in it: the height of the text depends on the font.
    const label = canvas.getByText('Device').parentElement?.getBoundingClientRect();
    if (label === undefined) throw new Error('The label is not drawn.');
    const control = canvas.getByRole('combobox').getBoundingClientRect();
    const note = canvas.getByText('1272 × 1696 · 16 gray levels').getBoundingClientRect();
    await expect(Math.abs(control.top - label.bottom - 8)).toBeLessThanOrEqual(1);
    await expect(Math.abs(note.top - control.bottom - 8)).toBeLessThanOrEqual(1);
  },
};

/** A changed choice has the button that puts it back, on the line of its label. */
export const Changed: Story = {
  args: { changed: true, onReset: fn() },
};

/** What is wrong with it, in the failed color, instead of what it is for. */
export const WithAnError: Story = {
  args: { description: 'Not shown', error: 'That number is too large.' },
};

/** A group of buttons has no id for its label to be for, and says why it cannot be changed. */
export const WithoutAControl: Story = {
  args: {
    children: <Note>Locked while one book is made for the series.</Note>,
    description: 'The format is the one of the series.',
    id: undefined,
    label: 'Format',
  },
};
