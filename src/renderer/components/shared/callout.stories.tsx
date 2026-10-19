import type { Meta, StoryObj } from '@storybook/react-vite';
import { CircleAlert, Info, SlidersHorizontal, TriangleAlert } from 'lucide-react';
import { expect, fn, within } from 'storybook/test';

import { Button } from '@/renderer/components/ui/button';

import { Callout } from './callout';

/** The middle of the first line of what a callout says, and the middle of its icon, as drawn. */
function middles(callout: HTMLElement): { icon: number; line: number } {
  const icon = callout.querySelector('svg:not(.lucide-x)')?.getBoundingClientRect();
  const first = callout.querySelector('h1, h2, .text-muted-foreground');
  if (icon === undefined || first === null) throw new Error('The callout is not drawn.');
  const range = document.createRange();
  const text = document.createTreeWalker(first, NodeFilter.SHOW_TEXT).nextNode();
  if (text === null) throw new Error('The callout says nothing.');
  range.selectNodeContents(text);
  const line = range.getClientRects()[0];
  if (line === undefined) throw new Error('The callout has no line.');
  return { icon: icon.top + icon.height / 2, line: line.top + line.height / 2 };
}

const meta = {
  title: 'Workflows/Callout',
  component: Callout,
  decorators: [
    (Story) => (
      <div className="bg-background text-foreground min-h-screen p-8">
        <div className="mx-auto max-w-xl space-y-6">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    icon: Info,
    role: 'status',
    title: 'Single book for the series',
    children:
      'Active from the queue: the series will be produced as a single EPUB with volumes and chapters in the table of contents, and it takes as many lines as it needs.',
  },
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The icon is on the middle of the title, however many lines follow (ADR 0077). */
export const WithATitle: Story = {
  play: async ({ canvasElement }) => {
    const { icon, line } = middles(within(canvasElement).getByRole('status'));
    await expect(Math.abs(icon - line)).toBeLessThanOrEqual(0.75);
  },
};

/** Without a title, the icon is on the middle of the first line of the text. */
export const WithoutATitle: Story = {
  args: { title: undefined, icon: TriangleAlert },
  play: async ({ canvasElement }) => {
    const { icon, line } = middles(within(canvasElement).getByRole('status'));
    await expect(Math.abs(icon - line)).toBeLessThanOrEqual(0.75);
  },
};

/** What went wrong, and what can be done about it. */
export const Failed: Story = {
  args: {
    action: <Button variant="outline">Fix</Button>,
    children: 'The volumes were not found where the folder says they are.',
    icon: CircleAlert,
    role: 'alert',
    title: 'Random scans could not be made',
    tone: 'failed',
  },
  play: async ({ canvasElement }) => {
    const { icon, line } = middles(within(canvasElement).getByRole('alert'));
    await expect(Math.abs(icon - line)).toBeLessThanOrEqual(0.75);
  },
};

/** What one item sets over the queue's options, with a button at its end. */
export const Override: Story = {
  args: {
    action: (
      <Button size="sm" variant="outline">
        Put them all back
      </Button>
    ),
    children: '2 items have options of their own.',
    icon: SlidersHorizontal,
    role: 'group',
    title: undefined,
    tone: 'override',
  },
};

/** A few lines of its own, put away when read. */
export const Dismissible: Story = {
  args: {
    children: (
      <ul className="space-y-1">
        <li>Your saved language could not be used; English is used instead.</li>
        <li>The saved theme was not one of the app's; it follows the system.</li>
      </ul>
    ),
    dismiss: { label: 'Dismiss', onDismiss: fn() },
    icon: undefined,
    title: undefined,
  },
};

/** A remark, with nothing tinted. */
export const Neutral: Story = {
  args: { icon: TriangleAlert, title: undefined, tone: 'neutral', children: 'Nothing was moved.' },
};
