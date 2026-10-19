import type { Meta, StoryObj } from '@storybook/react-vite';

import { expect } from 'storybook/test';

import { ProcessSteps } from './process-steps';

/** Where the middle of the title of a step is, and where its box is, as the page draws them (ADR 0071). */
function middles(id: string): { box: number; title: number; titleLeft: number; toolLeft: number } {
  const box = document.getElementById(id)?.getBoundingClientRect();
  const title = document.querySelector(`label[for="${id}"]`)?.getBoundingClientRect();
  const tool = document.getElementById(`${id}-tool`)?.getBoundingClientRect();
  if (box === undefined || title === undefined || tool === undefined) {
    throw new Error(`The step ${id} is not drawn.`);
  }
  return {
    box: box.top + box.height / 2,
    title: title.top + title.height / 2,
    titleLeft: title.left,
    toolLeft: tool.left,
  };
}

const meta = {
  title: 'Workflows/Process steps',
  component: ProcessSteps,
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
  args: { onMode: () => undefined },
} satisfies Meta<typeof ProcessSteps>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The box of each step is centered on its title, and the tool under it is in line with the title. */
export const FolderBothSteps: Story = {
  args: { input: 'folder', mode: 'bind-and-convert' },
  play: async () => {
    for (const id of ['step-group', 'step-convert']) {
      const { box, title, titleLeft, toolLeft } = middles(id);
      await expect(Math.abs(box - title)).toBeLessThanOrEqual(0.75);
      await expect(Math.abs(titleLeft - toolLeft)).toBeLessThanOrEqual(0.5);
    }
  },
};

/** A step that was turned off shows its reset button on the line of its title. */
export const JoinOnly: Story = {
  args: { input: 'folder', mode: 'bind-only' },
  play: async () => {
    const title = document.querySelector('label[for="step-convert"]');
    const button = [...document.querySelectorAll('button')].find((candidate) =>
      /Convert for e-reader/u.test(candidate.getAttribute('aria-label') ?? ''),
    );
    if (title === null || button === undefined)
      throw new Error('The reset of the step is not drawn.');
    const middle = (element: Element): number => {
      const { top, height } = element.getBoundingClientRect();
      return top + height / 2;
    };
    await expect(Math.abs(middle(button) - middle(title))).toBeLessThanOrEqual(1.5);
  },
};

export const ConvertOnly: Story = {
  args: { input: 'folder', mode: 'convert-only' },
};

/** The reason a box cannot be changed is under the tool, in line with the title, and does not move the box. */
export const CbzHasOneProcess: Story = {
  args: { input: 'cbz', mode: 'convert-only' },
  play: async () => {
    const { box, title, titleLeft } = middles('step-convert');
    await expect(Math.abs(box - title)).toBeLessThanOrEqual(0.75);
    const reason = document.getElementById('step-convert-reason');
    if (reason === null) throw new Error('The step says nothing of why it cannot be changed.');
    await expect(Math.abs(reason.getBoundingClientRect().left - titleLeft)).toBeLessThanOrEqual(
      0.5,
    );
    await expect(reason.getBoundingClientRect().top).toBeGreaterThan(
      document.getElementById('step-convert-tool')?.getBoundingClientRect().bottom ?? Infinity,
    );
  },
};

export const LibraryIsAlwaysGrouped: Story = {
  args: { input: 'library', mode: 'bind-and-convert' },
};

export const LockedWhileRunning: Story = {
  args: { input: 'library', mode: 'bind-only', disabled: true },
  play: async () => {
    for (const id of ['step-group', 'step-convert']) {
      const { box, title } = middles(id);
      await expect(Math.abs(box - title)).toBeLessThanOrEqual(0.75);
    }
  },
};
