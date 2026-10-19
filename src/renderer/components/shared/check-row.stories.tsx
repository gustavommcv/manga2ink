import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn } from 'storybook/test';

import { CheckRow } from './check-row';

/** Where the middle of the box is, and where the middle of its title is, as the page draws them. */
function middles(id: string): { box: number; title: number } {
  const box = document.getElementById(id)?.getBoundingClientRect();
  const title = document.querySelector(`label[for="${id}"]`)?.getBoundingClientRect();
  if (box === undefined || title === undefined) throw new Error(`The row ${id} is not drawn.`);
  return { box: box.top + box.height / 2, title: title.top + title.height / 2 };
}

const meta = {
  title: 'Workflows/Check row',
  component: CheckRow,
  decorators: [
    (Story) => (
      <div className="bg-background text-foreground min-h-screen p-8">
        <div className="border-border bg-surface mx-auto max-w-sm rounded-xl border p-6">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    checked: true,
    id: 'keep-awake',
    onChange: fn(),
    title: 'Keep the computer awake while converting',
  },
} satisfies Meta<typeof CheckRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** However long its note is, the box is centered on the line of the title (ADR 0071, ADR 0075). */
export const WithANote: Story = {
  args: {
    note: (
      <p className="text-muted-foreground text-xs" id="keep-awake-note">
        The system does not go to sleep while a conversion runs, and may after it, as it was set. A
        long note takes as many lines as it needs and does not move the box.
      </p>
    ),
    describedBy: 'keep-awake-note',
  },
  play: async () => {
    const { box, title } = middles('keep-awake');
    await expect(Math.abs(box - title)).toBeLessThanOrEqual(0.75);
  },
};

/** The title alone, and a box that cannot be changed. */
export const Disabled: Story = {
  args: { checked: false, disabled: true, title: 'Check for updates automatically' },
  play: async () => {
    const { box, title } = middles('keep-awake');
    await expect(Math.abs(box - title)).toBeLessThanOrEqual(0.75);
  },
};
