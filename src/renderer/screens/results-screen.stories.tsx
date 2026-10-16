import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';

import { message, raw } from '@/domain/message';
import { messagesFor } from '@/i18n/messages';
import { SendToKoreader } from '@/renderer/components/sharing/send-to-koreader';
import { I18nContext } from '@/renderer/hooks/use-messages';

import { ResultsScreen, type ResultsScreenProps } from './results-screen';

const saved: ResultsScreenProps['outcomes'] = [
  {
    rowId: 'a',
    name: 'Chainsaw Man',
    status: 'done',
    artifacts: [
      { id: 'one', name: 'Chainsaw Man - Vol.01.epub', bytes: 18_400_000, format: 'epub' },
      { id: 'two', name: 'Chainsaw Man - Vol.02.epub', bytes: 17_900_000, format: 'epub' },
    ],
  },
  {
    rowId: 'c',
    name: 'Vagabond Vol.03.cbz',
    status: 'done',
    artifacts: [{ id: 'three', name: 'Vagabond Vol.03.epub', bytes: 22_100_000, format: 'epub' }],
  },
];

const skipped: ResultsScreenProps['outcomes'][number] = {
  rowId: 'b',
  name: 'Random scans',
  status: 'skipped',
  artifacts: [],
  message: [message('queue.note.noVolumesYet', {})],
  fixable: true,
};

const meta = {
  title: 'Workflows/Results',
  component: ResultsScreen,
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
  args: {
    onBack: () => undefined,
    onFix: () => undefined,
    onOpen: () => undefined,
    onShow: () => undefined,
    onSaveAs: () => undefined,
    onSaveAll: () => undefined,
    outcomes: saved,
    summary: message('summary.books', {
      device: 'Kobo Libra Colour',
      format: 'EPUB',
      ownOptions: 0,
    }),
  },
} satisfies Meta<typeof ResultsScreen>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saved: Story = {
  args: {
    aside: <SendToKoreader onOpen={() => undefined} status={{ active: false }} />,
  },
};

export const SavedAndSharing: Story = {
  args: {
    savedIds: new Set(['one', 'two', 'three']),
    aside: (
      <SendToKoreader
        onOpen={() => undefined}
        status={{
          active: true,
          url: 'http://192.168.1.24:8080',
          interfaceAddress: '192.168.1.24',
          port: 8080,
        }}
      />
    ),
  },
};

export const PartlySaved: Story = {
  args: { savedIds: new Set(['one']) },
};

export const SavedWithSomethingSkipped: Story = {
  args: { outcomes: [...saved, skipped] },
};

const smallPages = {
  code: 'images_smaller_than_device',
  message: 'Pages are smaller than the screen.',
};

/** Books made with something mangapress noticed: one notice per kind, naming the books. */
export const WithWarnings: Story = {
  args: {
    outcomes: [
      {
        rowId: 'a',
        name: 'Chainsaw Man',
        status: 'done',
        artifacts: [
          {
            id: 'one',
            name: 'Chainsaw Man - Vol.01.epub',
            bytes: 18_400_000,
            format: 'epub',
            warnings: [smallPages],
          },
          {
            id: 'two',
            name: 'Chainsaw Man - Vol.02.epub',
            bytes: 17_900_000,
            format: 'epub',
            warnings: [smallPages],
          },
        ],
      },
      {
        rowId: 'c',
        name: 'Vagabond Vol.03.cbz',
        status: 'done',
        artifacts: [
          {
            id: 'three',
            name: 'Vagabond Vol.03.epub',
            bytes: 22_100_000,
            format: 'epub',
            warnings: [
              smallPages,
              { code: 'source_already_converted', message: 'These pages look converted.' },
            ],
          },
        ],
      },
    ],
  },
};

const inPortuguese: Decorator = (Story) => (
  <I18nContext.Provider value={{ language: 'pt-BR', messages: messagesFor('pt-BR') }}>
    <Story />
  </I18nContext.Provider>
);

/**
 * The books of a run with warnings in Brazilian Portuguese: the sizes written with a decimal comma,
 * and each warning in the app's words with the books it is in (ADR 0053).
 */
export const InPortuguese: Story = {
  decorators: [inPortuguese],
  args: {
    ...WithWarnings.args,
    savedIds: new Set(['one']),
    summary: message('summary.books', {
      device: 'Kobo Libra Colour',
      format: 'EPUB',
      ownOptions: 0,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: '3 livros prontos' })).toBeVisible();
    await expect(canvas.getByRole('list', { name: 'Avisos sobre os livros' })).toBeVisible();
  },
};

export const NothingSaved: Story = {
  args: {
    outcomes: [
      skipped,
      {
        rowId: 'x',
        name: 'Late Bloomer',
        status: 'failed',
        artifacts: [],
        message: [raw('mangapress crashed while processing pages.')],
      },
    ],
  },
};
