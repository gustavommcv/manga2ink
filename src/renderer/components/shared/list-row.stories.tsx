import type { Meta, StoryObj } from '@storybook/react-vite';
import { FileArchive, Folder, Layers, LoaderCircle, SlidersHorizontal, X } from 'lucide-react';
import { expect, within } from 'storybook/test';

import { Button } from '@/renderer/components/ui/button';

import { Badge } from './badge';
import { ListRow } from './list-row';

const icon = (label: string, Icon: typeof Layers): React.JSX.Element => (
  <Button aria-label={label} size="icon" variant="ghost">
    <Icon />
  </Button>
);

const meta = {
  title: 'Workflows/List row',
  component: ListRow,
  decorators: [
    (Story) => (
      <div className="bg-background text-foreground min-h-screen p-8">
        <ul aria-label="Items" className="mx-auto max-w-2xl space-y-0.5">
          <Story />
        </ul>
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: { detail: '3 chapters', icon: <Folder />, title: 'Chainsaw Man' },
} satisfies Meta<typeof ListRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/** What a row says, and the buttons it has, with the state before them. */
export const Default: Story = {
  args: {
    actions: [icon('Edit volumes', Layers), icon('Options', SlidersHorizontal), icon('Remove', X)],
    status: <Badge tone="accent">2 volumes</Badge>,
  },
};

/** More that is worth saying, under the line of detail. */
export const WithNotes: Story = {
  args: {
    ...Default.args,
    notes: 'No volumes yet. Open Edit volumes to group the chapters.',
    status: <Badge tone="warning">Needs volumes</Badge>,
    title: 'Random scans',
  },
};

/**
 * A list of rows that have not the same buttons: the state of every row ends in the same place, since
 * a button a row does not have leaves its place empty (ADR 0078).
 */
export const StatesInOneColumn: Story = {
  render: () => (
    <>
      <ListRow
        actions={[
          icon('Edit volumes', Layers),
          icon('Options', SlidersHorizontal),
          icon('Remove', X),
        ]}
        detail="Folder · 3 chapters"
        icon={<Folder />}
        status={<Badge tone="accent">2 volumes</Badge>}
        title="Chainsaw Man"
      />
      <ListRow
        actions={[undefined, icon('Options', SlidersHorizontal), icon('Remove', X)]}
        detail="CBZ · goes straight to the e-reader step"
        icon={<FileArchive />}
        status={<Badge>Ready</Badge>}
        title="Vagabond Vol.03.cbz"
      />
      <ListRow
        actions={[undefined, undefined, icon('Remove', X)]}
        detail="Folder · reading it"
        icon={<LoaderCircle className="animate-spin" />}
        status={<Badge>Checking…</Badge>}
        title="New download"
      />
      <ListRow
        actions={[undefined, undefined, icon('Remove', X)]}
        detail="CBZ"
        icon={<FileArchive />}
        notes="The file could not be read."
        status={<Badge tone="danger">Could not read</Badge>}
        title="Broken.cbz"
      />
    </>
  ),
  play: async ({ canvasElement }) => {
    const rows = within(canvasElement).getAllByRole('listitem');
    const edges = rows.map((row) => {
      const badge = [...row.querySelectorAll('span')].find((span) =>
        span.className.includes('rounded-full'),
      );
      return badge?.getBoundingClientRect().right ?? Number.NaN;
    });
    for (const edge of edges)
      await expect(Math.abs(edge - (edges[0] ?? 0))).toBeLessThanOrEqual(0.5);
    const buttons = rows.map(
      (row) =>
        row.querySelector('button[aria-label="Remove"]')?.getBoundingClientRect().right ??
        Number.NaN,
    );
    for (const edge of buttons)
      await expect(Math.abs(edge - (buttons[0] ?? 0))).toBeLessThanOrEqual(0.5);
  },
};
