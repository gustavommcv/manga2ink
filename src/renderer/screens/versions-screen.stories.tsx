import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import type { VersionGroup } from '@/domain/chapter-versions';

import { VersionsScreen, type VersionsScreenProps } from './versions-screen';

/** A first page, drawn here so that the story needs no file: a tinted page with a few lines on it. */
function page(tint: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="240"><rect width="160" height="240" fill="${tint}"/><rect x="16" y="20" width="128" height="90" fill="none" stroke="#333" stroke-width="3"/><rect x="16" y="124" width="60" height="96" fill="none" stroke="#333" stroke-width="3"/><rect x="88" y="124" width="56" height="44" fill="none" stroke="#333" stroke-width="3"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const koala = (token: string, chapter: number): VersionGroup => ({
  token,
  chapter,
  candidates: [
    {
      id: `${token}-a`,
      name: `Ch.${token.padStart(4, '0')} - A Perfect Day for Koala (en) [prussian blue hedgehog scans]`,
      path: `/Ubunchu!/Ch.${token}-a.cbz`,
      kind: 'cbz',
      pageCount: 12,
      firstPage: '001.jpg',
    },
    {
      id: `${token}-b`,
      name: `Ch.${token.padStart(4, '0')} - A Perfect Day for Koala (en) [sirtetris]`,
      path: `/Ubunchu!/Ch.${token}-b.cbz`,
      kind: 'cbz',
      pageCount: 18,
      firstPage: '001.jpg',
    },
  ],
});

const previews = new Map([
  ['6-a', page('#e9dfc7')],
  ['6-b', page('#d3dde8')],
  ['15-a', page('#e8d3d3')],
  ['15-b', page('#d6e8d3')],
]);

/** Keeps the choices in the story, as the workflow keeps them with the row. */
function Stateful(props: VersionsScreenProps): React.JSX.Element {
  const [groups, setGroups] = useState(props.groups);
  return (
    <VersionsScreen
      {...props}
      groups={groups}
      onChoose={(token, use) => {
        setGroups((current) =>
          current.map((group) => {
            if (group.token !== token) return group;
            const { use: before, ...rest } = group;
            void before;
            return use === undefined ? rest : { ...rest, use };
          }),
        );
      }}
    />
  );
}

const meta = {
  title: 'Workflows/Versions of a chapter',
  component: VersionsScreen,
  render: (args) => <Stateful {...args} />,
  decorators: [
    (Story) => (
      <div className="bg-background text-foreground min-h-screen px-8 py-10">
        <div className="mx-auto max-w-4xl">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    backLabel: 'Queue',
    name: 'Ubunchu!',
    groups: [koala('6', 6), koala('15', 15)],
    onBack: () => undefined,
    onChoose: () => undefined,
    onDone: () => undefined,
    previews,
  },
} satisfies Meta<typeof VersionsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two chapters of a series with two files each, and nothing chosen for the person. */
export const Pending: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('status')).toHaveTextContent('0 of 2 chapters decided');
    await userEvent.click(canvas.getAllByRole('radio', { name: /sirtetris/u })[0]!);
    await expect(canvas.getByRole('status')).toHaveTextContent('1 of 2 chapters decided');
    await userEvent.click(canvas.getAllByRole('radio', { name: /Leave this chapter out/u })[0]!);
    await expect(canvas.getByRole('status')).toHaveTextContent('1 of 2 chapters decided');
    // The grouping that follows waits for every chapter.
    await expect(canvas.getByRole('button', { name: 'Done' })).toBeDisabled();
  },
};

/** Both chapters are decided: one version used, the other kept as alternatives. */
export const Decided: Story = {
  args: {
    groups: [
      { ...koala('6', 6), use: ['6-b'] },
      { ...koala('15', 15), use: ['15-a', '15-b'] },
    ],
  },
};

/** The folder was added before: a file came after the choice, another changed, and the choice is offered again. */
export const Flagged: Story = {
  args: {
    groups: [
      (() => {
        const group = koala('6', 6);
        return {
          ...group,
          candidates: [
            group.candidates[0]!,
            { ...group.candidates[1]!, attention: 'new' as const },
          ],
          remembered: ['6-a'],
        };
      })(),
      (() => {
        const group = koala('15', 15);
        return {
          ...group,
          candidates: [
            { ...group.candidates[0]!, attention: 'changed' as const },
            group.candidates[1]!,
          ],
          remembered: ['15-b'],
        };
      })(),
    ],
  },
};

/** The pages were not read yet, or could not be: each file is still told by its name and pages. */
export const WithoutPreviews: Story = {
  args: { previews: new Map() },
};
