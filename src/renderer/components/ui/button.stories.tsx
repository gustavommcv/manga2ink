import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoaderCircle, X } from 'lucide-react';
import { expect, within } from 'storybook/test';

import { Button } from './button';

const meta = {
  title: 'Design system/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {
  args: {
    children: 'Continue',
  },
};

export const Loading: Story = {
  args: {
    children: (
      <>
        <LoaderCircle aria-hidden="true" className="animate-spin" />
        Processing
      </>
    ),
    disabled: true,
  },
};

export const Disabled: Story = {
  args: {
    children: 'Unavailable',
    disabled: true,
  },
};

export const ErrorAction: Story = {
  args: {
    children: 'Remove failed job',
    variant: 'destructive',
  },
};

export const StateGallery: Story = {
  render: () => (
    <div className="bg-background grid min-w-xl grid-cols-2 gap-6 rounded-xl p-8">
      <Button>Normal</Button>
      <Button variant="outline">Secondary</Button>
      <Button disabled>Disabled</Button>
      <Button variant="destructive">Error action</Button>
      <Button disabled>
        <LoaderCircle aria-hidden="true" className="animate-spin" />
        Loading
      </Button>
      <Button variant="ghost">Quiet action</Button>
    </div>
  ),
};

/** What a person sees of a quiet button is its text or icon: that is what lines up with the edge. */
export const Flush: Story = {
  render: () => (
    <div className="bg-background w-96 space-y-3 rounded-xl p-8 text-sm" data-testid="edges">
      <p>The line the buttons line up with</p>
      <Button flush="start" variant="ghost">
        Back
      </Button>
      <div>
        <Button flush="start" size="sm" variant="ghost">
          Use the queue’s options
        </Button>
      </div>
      <div className="flex justify-end">
        <Button flush="end" size="sm" variant="ghost">
          Select all
        </Button>
      </div>
      <div className="flex justify-end">
        <Button aria-label="Close" flush="end" size="icon" variant="ghost">
          <X />
        </Button>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const edges = canvas.getByTestId('edges');
    const box = edges.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(edges).paddingLeft);
    const [left, right] = [box.left + padding, box.right - padding];
    const glyph = (button: HTMLElement): { left: number; right: number } => {
      const style = getComputedStyle(button);
      const own = button.getBoundingClientRect();
      return {
        left: own.left + parseFloat(style.paddingLeft),
        right: own.right - parseFloat(style.paddingRight),
      };
    };
    await expect(glyph(canvas.getByRole('button', { name: 'Back' })).left).toBeCloseTo(left, 1);
    await expect(
      glyph(canvas.getByRole('button', { name: 'Use the queue’s options' })).left,
    ).toBeCloseTo(left, 1);
    await expect(glyph(canvas.getByRole('button', { name: 'Select all' })).right).toBeCloseTo(
      right,
      1,
    );
    // An icon has no padding: the icon itself is what lines up.
    const icon = canvas.getByRole('button', { name: 'Close' }).querySelector('svg');
    await expect(icon?.getBoundingClientRect().right).toBeCloseTo(right, 1);
  },
};

/** A button that stays where it is when there is nothing to do, and is dimmed, not hidden. */
export const AriaDisabled: Story = {
  args: { 'aria-disabled': true, children: 'Reset to defaults', variant: 'ghost' },
};
