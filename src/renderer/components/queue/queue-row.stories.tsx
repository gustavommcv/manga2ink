import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { createMappingDraft } from '@/domain/mapping';

import { QueueRowItem } from './queue-row';
import { raw } from '@/domain/message';

const chapters = [
  { id: 'c1', name: 'Chapter 1', path: '/m/1', pageCount: 24, chapter: 1 },
  { id: 'c2', name: 'Chapter 2', path: '/m/2', pageCount: 22, chapter: 2 },
];

const meta = {
  title: 'Workflows/Queue row',
  component: QueueRowItem,
  decorators: [
    (Story) => (
      <div className="bg-background text-foreground min-h-screen p-8">
        <ul className="border-border bg-surface mx-auto max-w-lg space-y-0.5 rounded-xl border p-2">
          <Story />
        </ul>
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: {
    mode: 'bind-and-convert',
    onEdit: () => undefined,
    onEditDetails: () => undefined,
    onEditOptions: () => undefined,
    onRemove: () => undefined,
  },
} satisfies Meta<typeof QueueRowItem>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A folder already grouped into volumes, ready to run. */
export const Grouped: Story = {
  args: {
    row: {
      id: 'a',
      kind: 'folder',
      displayName: 'Chainsaw Man',
      displayPath: 'D:\\Manga\\Chainsaw Man',
      state: 'inspected',
      sessionId: 'session-a',
      mapping: createMappingDraft({
        mangaTitle: 'Chainsaw Man',
        chapters,
        volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
      }),
      confirmed: false,
    },
  },
};

/** A chapter that two files claim: the row waits for a choice, and the button to make it is colored. */
export const NeedsVersions: Story = {
  args: {
    row: {
      id: 'v',
      kind: 'folder',
      displayName: 'Ubunchu!',
      displayPath: 'D:\\Manga\\Ubunchu!',
      state: 'inspected',
      sessionId: 'session-v',
      mapping: createMappingDraft({
        mangaTitle: 'Ubunchu!',
        chapters: [
          {
            id: 'c1',
            name: 'Ch.0001 (en)',
            path: '/m/1.cbz',
            pageCount: 12,
            chapter: 1,
            kind: 'cbz',
          },
          {
            id: 'c6',
            name: 'Ch.0006 (en) [A]',
            path: '/m/6a.cbz',
            pageCount: 12,
            chapter: 6,
            kind: 'cbz',
          },
        ],
        volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c6'] }],
        versions: [
          {
            token: '6',
            chapter: 6,
            candidates: [
              { id: 'c6', name: 'Ch.0006 (en) [A]', path: '/m/6a.cbz', kind: 'cbz', pageCount: 12 },
              {
                id: 'c6b',
                name: 'Ch.0006 (en) [B]',
                path: '/m/6b.cbz',
                kind: 'cbz',
                pageCount: 18,
              },
            ],
          },
        ],
      }),
      confirmed: false,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Choose versions')).toBeVisible();
    // The choice is made where the folder is grouped: the row has no button of its own for it, and
    // the one that groups is the one that asks.
    await expect(canvas.queryByRole('button', { name: /versions of chapters/u })).toBeNull();
    await expect(
      canvas.getByRole('button', { name: 'Edit books and volumes for Ubunchu!' }),
    ).toBeVisible();
  },
};

/** A folder with conversion options of its own: the options button is colored. */
export const WithOptions: Story = {
  args: {
    row: {
      id: 'a',
      kind: 'folder',
      displayName: 'Chainsaw Man',
      displayPath: 'D:\\Manga\\Chainsaw Man',
      state: 'inspected',
      sessionId: 'session-a',
      mapping: createMappingDraft({
        mangaTitle: 'Chainsaw Man',
        chapters,
        volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
      }),
      confirmed: false,
      options: { format: 'epub', settings: { deviceProfile: 'KoC', webtoon: true } },
    },
  },
};

/** A folder with a title and an author typed for it: the details button is colored. */
export const WithDetails: Story = {
  args: {
    row: {
      id: 'a',
      kind: 'folder',
      displayName: 'Chainsaw Man',
      displayPath: 'D:\\Manga\\Chainsaw Man',
      state: 'inspected',
      sessionId: 'session-a',
      mapping: createMappingDraft({
        mangaTitle: 'Chainsaw Man',
        chapters,
        volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
      }),
      confirmed: false,
      details: { title: 'Chainsaw Man', author: 'Fujimoto Tatsuki' },
    },
  },
};

/** Only joining volumes: mangaprep makes no book, so there are no details to edit. */
export const JoinOnly: Story = {
  args: {
    mode: 'bind-only',
    row: {
      id: 'a',
      kind: 'folder',
      displayName: 'Chainsaw Man',
      displayPath: 'D:\\Manga\\Chainsaw Man',
      state: 'inspected',
      sessionId: 'session-a',
      mapping: createMappingDraft({
        mangaTitle: 'Chainsaw Man',
        chapters,
        volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
      }),
      confirmed: false,
    },
  },
};

/** A folder mangabind could not group on its own: it needs a look in the editor. */
export const NeedsMapping: Story = {
  args: {
    row: {
      id: 'b',
      kind: 'folder',
      displayName: 'Random scans',
      displayPath: 'D:\\Manga\\Random scans',
      state: 'inspected',
      sessionId: 'session-b',
      mapping: createMappingDraft({ mangaTitle: 'Random scans', chapters }),
      confirmed: false,
    },
  },
};

/** A loose .cbz: already one complete volume, nothing to edit. */
export const Cbz: Story = {
  args: {
    row: {
      id: 'c',
      kind: 'cbz',
      displayName: 'Vagabond Vol.03.cbz',
      displayPath: 'D:\\Manga\\Vagabond Vol.03.cbz',
      state: 'inspected',
      sessionId: 'session-c',
      confirmed: false,
    },
  },
};

/** Just added: mangabind has not reported back on it yet. */
export const Inspecting: Story = {
  args: {
    row: {
      id: 'd',
      kind: 'folder',
      displayName: 'New download',
      displayPath: 'D:\\Manga\\New download',
      state: 'inspecting',
    },
  },
};

/** Could not be read at all: nothing about it can run. */
export const Unreadable: Story = {
  args: {
    row: {
      id: 'e',
      kind: 'cbz',
      displayName: 'Broken.cbz',
      displayPath: 'D:\\Manga\\Broken.cbz',
      state: 'unreadable',
      message: raw('The file could not be read.'),
    },
  },
};

/** Converting only: volumes are already made, so there is nothing here to edit. */
export const ConvertOnlyMode: Story = {
  args: { mode: 'convert-only', row: Grouped.args.row },
};

/** A folder with no volumes waits for them, or for one book of the whole series, where it is grouped (ADR 0094). */
export const NeedsVolumes: Story = {
  args: {
    row: {
      id: 'o',
      kind: 'folder',
      displayName: 'Ubunchu!',
      displayPath: 'D:\\Manga\\Ubunchu!',
      state: 'inspected',
      sessionId: 'session-o',
      mapping: createMappingDraft({ mangaTitle: 'Ubunchu!', chapters }),
      confirmed: false,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Needs volumes')).toBeVisible();
    await expect(
      canvas.getByRole('button', { name: 'Edit books and volumes for Ubunchu!' }),
    ).toBeVisible();
  },
};

/** The series made into one book says so on its row, and needs no volumes to run. */
export const WholeSeries: Story = {
  args: {
    row: {
      id: 'w',
      kind: 'folder',
      displayName: 'Ubunchu!',
      displayPath: 'D:\\Manga\\Ubunchu!',
      state: 'inspected',
      sessionId: 'session-w',
      mapping: createMappingDraft({ mangaTitle: 'Ubunchu!', chapters }),
      books: 'series',
      confirmed: false,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('Whole series')).toBeVisible();
  },
};
