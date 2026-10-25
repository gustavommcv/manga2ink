import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';

import type { QueueRow } from '@/domain/input-queue';
import { createMappingDraft } from '@/domain/mapping';
import { defaultMangaprepSettings } from '@/domain/output-profile';
import { I18nContext } from '@/renderer/hooks/use-messages';
import { messagesFor } from '@/i18n/messages';

import { QueueScreen, type QueueScreenProps } from './queue-screen';
import { message, raw } from '@/domain/message';

const chapters = [
  { id: 'c1', name: 'Chapter 1', path: '/m/1', pageCount: 24, chapter: 1 },
  { id: 'c2', name: 'Chapter 2', path: '/m/2', pageCount: 22, chapter: 2 },
  { id: 'c3', name: 'Chapter 3', path: '/m/3', pageCount: 26, chapter: 3 },
] as const;

const grouped = createMappingDraft({
  mangaTitle: 'Chainsaw Man',
  chapters,
  volumes: [
    { id: 'v1', number: '1', chapterIds: ['c1', 'c2'] },
    { id: 'v2', number: '2', chapterIds: ['c3'] },
  ],
});

const rows: readonly QueueRow[] = [
  {
    id: 'a',
    kind: 'folder',
    displayName: 'Chainsaw Man',
    displayPath: 'D:\\Manga\\Chainsaw Man',
    state: 'inspected',
    sessionId: 'session-a',
    mapping: grouped,
    proposedSignature: JSON.stringify({
      title: 'Chainsaw Man',
      source: null,
      volumes: [
        { number: '1', chapterIds: ['c1', 'c2'] },
        { number: '2', chapterIds: ['c3'] },
      ],
    }),
    confirmed: false,
  },
  {
    id: 'b',
    kind: 'folder',
    displayName: 'Random scans',
    displayPath: 'D:\\Manga\\Random scans',
    state: 'inspected',
    sessionId: 'session-b',
    mapping: createMappingDraft({ mangaTitle: 'Random scans', chapters }),
    confirmed: false,
  },
  {
    id: 'c',
    kind: 'cbz',
    displayName: 'Vagabond Vol.03.cbz',
    displayPath: 'D:\\Manga\\Vagabond Vol.03.cbz',
    state: 'inspected',
    sessionId: 'session-c',
    confirmed: false,
  },
  {
    id: 'd',
    kind: 'folder',
    displayName: 'New download',
    displayPath: 'D:\\Manga\\New download',
    state: 'inspecting',
  },
  {
    id: 'e',
    kind: 'cbz',
    displayName: 'Broken.cbz',
    displayPath: 'D:\\Manga\\Broken.cbz',
    state: 'unreadable',
    message: raw('The file could not be read.'),
  },
];

const libraryTitles = [
  {
    title: 'Chainsaw Man',
    draft: grouped,
    volumes: [
      { name: 'Chainsaw Man - Vol.01.cbz', pageCount: 46 },
      { name: 'Chainsaw Man - Vol.02.cbz', pageCount: 26 },
    ],
  },
  {
    title: 'Vagabond',
    draft: grouped,
    volumes: [{ name: 'Vagabond - Vol.01.cbz', pageCount: 72 }],
  },
  {
    title: 'Random scans',
    draft: createMappingDraft({ mangaTitle: 'Random scans', chapters }),
    volumes: [],
  },
] as const;

const libraryRow: QueueRow = {
  id: 'lib',
  kind: 'library',
  displayName: 'Manga Library',
  displayPath: 'D:\\Manga\\Manga Library',
  state: 'inspected',
  sessionId: 'session-lib',
  confirmed: false,
  titles: libraryTitles,
};

const base: QueueScreenProps = {
  disabled: false,
  format: 'cbz',
  mode: 'bind-and-convert',
  onAddFiles: () => undefined,
  onAddFolders: () => undefined,
  onClear: () => undefined,
  onConvert: () => undefined,
  onDeviceProfile: () => undefined,
  onDismissRejected: () => undefined,
  onDropFiles: () => undefined,
  onEdit: () => undefined,
  onEditDetails: () => undefined,
  onEditOptions: () => undefined,
  onFormat: () => undefined,
  onMode: () => undefined,
  onOpenOptions: () => undefined,
  onRemove: () => undefined,
  onReset: () => undefined,
  onValidate: () => undefined,
  space: null,
  profiles: [
    {
      code: 'KPW6',
      name: 'Kindle Paperwhite 6',
      width: 1272,
      height: 1696,
      grayLevels: 16,
      family: 'kindle',
    },
    {
      code: 'KoAO',
      name: 'Kobo Aura ONE',
      width: 1404,
      height: 1872,
      grayLevels: 16,
      family: 'kobo',
    },
  ],
  rejected: [],
  rows: [],
  settings: defaultMangaprepSettings,
  validating: false,
};

const meta = {
  title: 'Workflows/Queue',
  component: QueueScreen,
  decorators: [
    (Story) => (
      <div className="bg-background text-foreground min-h-screen px-8 py-10">
        <div className="mx-auto max-w-6xl">
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: { layout: 'fullscreen' },
  args: base,
} satisfies Meta<typeof QueueScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

/** A click on the empty area opens a menu of the two choices, files or a folder. */
export const EmptyChoosing: Story = {
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTestId('drop-target'));
    // The menu is drawn at the end of the page, not inside the story's own root.
    const menu = await within(document.body).findByRole('menu');
    await expect(within(menu).getByRole('menuitem', { name: 'Choose a folder' })).toBeVisible();
  },
};

export const WithItems: Story = {
  args: { rows },
};

/** Less is free where the app works than the queue may take: said above the button, which still works. */
export const LowSpace: Story = {
  args: {
    rows: rows.slice(0, 1),
    space: {
      scratchFreeBytes: 600 * 1024 ** 2,
      pendingFreeBytes: 600 * 1024 ** 2,
      sameDrive: true,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/free where Manga2Ink works/u)).toBeVisible();
    await expect(canvas.getByRole('button', { name: /^Process/u })).toBeEnabled();
  },
};

export const WithLibrary: Story = {
  args: { rows: [libraryRow, ...rows.slice(2, 3)] },
};

/** The guide illustrates the three supported inputs without pending or failed rows. */
export const TutorialInputs: Story = {
  args: { rows: [...rows.slice(0, 1), libraryRow, ...rows.slice(2, 3)] },
};

export const ReadyBooks: Story = {
  args: {
    pendingRuns: [
      {
        libraryId: 'run-one',
        createdAt: Date.UTC(2026, 8, 28, 18, 30),
        artifacts: [
          { id: 'book-one', name: 'Vol.01.epub', bytes: 18_400_000, format: 'epub', saved: false },
        ],
      },
    ],
    onOpenPending: () => undefined,
    onDeletePending: () => Promise.resolve(true),
  },
};

export const ReadyBooksConfirmDelete: Story = {
  ...ReadyBooks,
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: 'Delete pending books from Vol.01.epub' }),
    );
    await expect(
      within(canvasElement).getByRole('group', { name: 'Confirm deletion of Vol.01.epub' }),
    ).toBeVisible();
  },
};

export const LibraryNeedsVolumes: Story = {
  args: { rows: [{ ...libraryRow, titles: libraryTitles.slice(2) }] },
};

/** Every manga of the folder is a link, which mangabind does not follow: it says so, by name. */
export const FolderOfLinks: Story = {
  args: {
    rows: [
      {
        id: 'links',
        kind: 'folder',
        displayName: 'Manga Library',
        displayPath: 'D:\\Manga\\Manga Library',
        state: 'inspected',
        sessionId: 'session-links',
        mapping: createMappingDraft({ mangaTitle: 'Manga Library', chapters: [] }),
        confirmed: false,
        skippedLinks: ['Berserk', 'Vagabond', 'Monster', 'Vinland Saga'],
      },
    ],
  },
};

export const LibraryWhenNotGrouping: Story = {
  args: { rows: [libraryRow], mode: 'convert-only' },
};

export const JoinOnly: Story = {
  args: { rows, mode: 'bind-only' },
};

export const ConvertOnly: Story = {
  args: { rows, mode: 'convert-only' },
};

/** Options that were changed, and kept: the button that puts them back is live. */
export const OptionsChanged: Story = {
  args: {
    rows,
    format: 'pdf',
    settings: { ...defaultMangaprepSettings, deviceProfile: 'KoAO', upscale: false },
  },
};

export const OnlyComicFiles: Story = {
  args: { rows: rows.slice(2, 3) },
};

export const SomeItemsNotAdded: Story = {
  args: {
    rows: rows.slice(0, 1),
    rejected: [
      { name: 'notes.txt', reason: message('input.onlyFoldersAndCbz', {}) },
      { name: 'Backups', reason: message('input.unreadable', {}) },
    ],
  },
};

export const PlanValidated: Story = {
  args: {
    rows: rows.slice(0, 1),
    plans: [
      {
        name: 'Chainsaw Man',
        plan: {
          tool: 'mangabind',
          title: 'Chainsaw Man',
          message: message('plan.mangabind', { volumes: 2, shape: 'books' }),
          books: [
            { name: 'Chainsaw Man - Vol.01.cbz', pageCount: 46 },
            { name: 'Chainsaw Man - Vol.02.cbz', pageCount: 26 },
          ],
          issues: [],
        },
      },
    ],
  },
};

export const ToolsNotReady: Story = {
  args: { disabled: true },
};

/**
 * How the books of a series are made is the choice of each series, not of the queue: the panel has
 * none, the books are chosen where the folder is grouped, and the steps are never locked.
 */
export const OneBookOfASeries: Story = {
  args: { rows: rows.slice(0, 2) },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('radiogroup', { name: 'Books' })).toBeNull();
    await expect(
      canvas.getByRole('checkbox', { name: /Group chapters into volumes/u }),
    ).toBeEnabled();
    await expect(
      canvas.getByRole('button', { name: 'Edit books and volumes for Random scans' }),
    ).toBeVisible();
  },
};

const inPortuguese: Decorator = (Story) => (
  <I18nContext.Provider value={{ language: 'pt-BR', messages: messagesFor('pt-BR') }}>
    <Story />
  </I18nContext.Provider>
);

/** The screen in Brazilian Portuguese, while the queue is empty. */
export const EmptyInPortuguese: Story = {
  decorators: [inPortuguese],
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Fila' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Processar' })).toBeDisabled();
  },
};

/**
 * The screen in Brazilian Portuguese with items, a message about what was not added, books that are
 * ready and a plan that was validated: the longer words of the language still fit where the English
 * ones did. What the queue says about each row (its status, its line and its notes) and why an item
 * was not added are messages the window writes in the language too, and so is what a plan says
 * (ADR 0053).
 */
export const InPortuguese: Story = {
  decorators: [inPortuguese],
  args: {
    rows: rows.slice(0, 3),
    rejected: [{ name: 'notes.txt', reason: message('input.onlyFoldersAndCbz', {}) }],
    pendingRuns: [
      {
        libraryId: 'run-one',
        createdAt: Date.UTC(2026, 8, 28, 18, 30),
        artifacts: [
          { id: 'book-one', name: 'Vol.01.epub', bytes: 18_400_000, format: 'epub', saved: false },
          { id: 'book-two', name: 'Vol.02.epub', bytes: 17_900_000, format: 'epub', saved: false },
        ],
      },
    ],
    onOpenPending: () => undefined,
    onDeletePending: () => Promise.resolve(true),
    plans: [
      {
        name: 'Chainsaw Man',
        plan: {
          tool: 'mangabind',
          title: 'Chainsaw Man',
          message: message('plan.mangabind', { volumes: 2, shape: 'books' }),
          books: [
            { name: 'Chainsaw Man - Vol.01.cbz', pageCount: 46 },
            { name: 'Chainsaw Man - Vol.02.cbz', pageCount: 26 },
          ],
          issues: [],
        },
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Plano validado' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: 'Processar 2 itens' })).toBeVisible();
  },
};

/** The screen in Japanese, while the queue is empty. */
export const EmptyInJapanese: Story = {
  globals: { language: 'ja' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'キュー' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '処理' })).toBeDisabled();
  },
};

/**
 * The screen in Japanese with items, a message about what was not added, books that are ready and a
 * plan that was validated: the words of a language with no spaces between them still fit where the
 * English ones did, and what the queue says about each row is written in Japanese too (ADR 0053, ADR 0084).
 */
export const InJapanese: Story = {
  globals: { language: 'ja' },
  args: InPortuguese.args ?? {},
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: '計画を検証しました' })).toBeVisible();
    await expect(canvas.getByRole('button', { name: '2 個の項目を処理' })).toBeVisible();
  },
};
