import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMappingDraft } from '@/domain/mapping';
import { message } from '@/domain/message';
import { App } from '@/renderer/app';
import type { Manga2InkBridge } from '@/shared/runtime-info';

import { addFolder, bridge, chapters, folder, installBridge, runButton } from './support/workflow';

afterEach(() => {
  Reflect.deleteProperty(window, 'manga2ink');
});

// A series of CBZ chapters named only by their numbers: no volume anywhere.
const noVolumes = createMappingDraft({
  mangaTitle: 'Offline Work',
  chapters: chapters.map((chapter) => ({ ...chapter, kind: 'cbz' as const })),
});

const withNoVolumes = (overrides: Partial<Manga2InkBridge> = {}): Manga2InkBridge =>
  bridge({
    inspectInput: () =>
      Promise.resolve({
        ok: true,
        value: {
          sessionId: 'session',
          displayName: 'Offline Work',
          kind: 'folder',
          mapping: noVolumes,
          issues: [],
        },
      }),
    ...overrides,
  });

describe('a series with no volumes, in the window', () => {
  it('needs volumes for books of volumes, and not for one book of the whole series', async () => {
    const user = userEvent.setup();
    installBridge(withNoVolumes());
    render(<App />);
    await addFolder(user);

    // The line under the name does not say it was grouped, since it has no volume.
    expect(await screen.findByText('Needs volumes')).toBeVisible();
    expect(screen.getByText('Folder · 2 chapters')).toBeVisible();
    expect(screen.getByRole('button', { name: /^Process/u })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Make one book of Offline Work' }));

    expect(await screen.findByText('Whole series', { selector: 'span' })).toBeVisible();
    expect(screen.queryByRole('button', { name: /Make one book/u })).not.toBeInTheDocument();
    expect(screen.queryByText('Needs volumes')).not.toBeInTheDocument();
    expect(await runButton(1)).toBeEnabled();
  });

  it('is made into one book, handing the tool the mapping as it is', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<Manga2InkBridge['convert']>(bridge().convert);
    installBridge(withNoVolumes({ convert }));
    render(<App />);
    await addFolder(user);
    await user.click(screen.getByRole('button', { name: 'Make one book of Offline Work' }));

    await user.click(await runButton(1));

    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    const sent = convert.mock.calls[0]![0];
    expect(sent.singleBook).toBe(true);
    expect(sent.mapping?.volumes).toEqual([]);
  });

  it('shows what the book will be before it is made: its file, its chapters, and what was set aside', async () => {
    const user = userEvent.setup();
    installBridge(
      withNoVolumes({
        planConversion: () =>
          Promise.resolve({
            ok: true,
            value: {
              tool: 'mangabind',
              title: 'Offline Work',
              message: message('plan.series', { volumes: 0, chapters: 3 }),
              books: [
                {
                  name: 'Offline Work',
                  pageCount: 6,
                  wholeSeries: true as const,
                  file: 'Offline Work.epub',
                  chapters: [
                    { label: 'Ch.1', pageCount: 2 },
                    { label: 'Ch.2 (version 1 of 2)', pageCount: 2 },
                    { label: 'Ch.2 (version 2 of 2)', pageCount: 2 },
                  ],
                },
              ],
              issues: [],
              leftOut: ['Ch.0003 [B]'],
            },
          }),
      }),
    );
    render(<App />);
    await addFolder(user);
    await user.click(screen.getByRole('button', { name: 'Make one book of Offline Work' }));

    await user.click(screen.getByRole('button', { name: 'Validate plan' }));

    const plan = await screen.findByRole('region', { name: 'Plan validated' });
    expect(
      within(plan).getByText(
        'mangabind validated 3 chapters · one book for the whole series · no library files written',
      ),
    ).toBeVisible();
    expect(within(plan).getByText('One book for Offline Work')).toBeVisible();
    expect(within(plan).getByText('File: Offline Work.epub')).toBeVisible();
    expect(within(plan).getByText('3 chapters in the book')).toBeVisible();
    expect(within(plan).getByText('Ch.2 (version 2 of 2)')).toBeInTheDocument();
    expect(
      within(plan).getByText('1 file left out because another version was chosen'),
    ).toBeVisible();
    expect(within(plan).getByText('Ch.0003 [B]')).toBeInTheDocument();
  });
});

describe('the books of each series, in the window', () => {
  const grouped = createMappingDraft({
    mangaTitle: 'Grouped Work',
    chapters,
    volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
  });
  const twoSeries = (overrides: Partial<Manga2InkBridge> = {}): Manga2InkBridge =>
    bridge({
      chooseInputs: () =>
        Promise.resolve({
          ok: true,
          value: {
            inputs: [folder('Series', 'first'), folder('Grouped', 'second')],
            rejected: [],
          },
        }),
      inspectInput: (id) =>
        Promise.resolve({
          ok: true,
          value: {
            sessionId: `session-${id}`,
            displayName: id === 'first' ? 'Series' : 'Grouped',
            kind: 'folder',
            mapping: id === 'first' ? noVolumes : grouped,
            issues: [],
          },
        }),
      ...overrides,
    });

  it('are chosen for one series without touching the others of the queue', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<Manga2InkBridge['convert']>(bridge().convert);
    installBridge(twoSeries({ convert }));
    render(<App />);
    await addFolder(user);

    // The panel has no choice of books: it is not the queue's to make.
    expect(screen.queryByRole('radiogroup', { name: 'Books' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Make one book of Series' }));
    expect(screen.queryByRole('button', { name: /Make one book/u })).not.toBeInTheDocument();
    await user.click(await runButton(2));

    expect(await screen.findByRole('heading', { name: /books? ready/u })).toBeVisible();
    const sent = new Map(convert.mock.calls.map(([command]) => [command.sessionId, command]));
    expect(sent.get('session-first')?.singleBook).toBe(true);
    expect(sent.get('session-second')?.singleBook).toBe(false);
    expect(sent.get('session-second')?.mapping?.volumes).toHaveLength(1);
  });

  it('are chosen where the chapters are grouped, and one for each volume is chosen back there', async () => {
    const user = userEvent.setup();
    installBridge(withNoVolumes());
    render(<App />);
    await addFolder(user);

    await user.click(
      screen.getByRole('button', { name: 'Edit books and volumes for Offline Work' }),
    );
    expect(await screen.findByRole('radio', { name: /One book per volume/u })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /One book for the whole series/u }));
    expect(screen.getByText(/This series needs no volumes/u)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(await screen.findByText('Whole series', { selector: 'span' })).toBeVisible();
    expect(await runButton(1)).toBeEnabled();

    await user.click(
      screen.getByRole('button', { name: 'Edit books and volumes for Offline Work' }),
    );
    await user.click(await screen.findByRole('radio', { name: /One book per volume/u }));
    await user.click(screen.getByRole('button', { name: /Offline Work|Queue/u }));
    expect(await screen.findByText('Needs volumes')).toBeVisible();
  });

  it('leave a folder as it is from the same place, and it is converted whole', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<Manga2InkBridge['convert']>(bridge().convert);
    installBridge(bridge({ convert }));
    render(<App />);
    await addFolder(user);

    await user.click(
      screen.getByRole('button', { name: 'Edit books and volumes for Offline Work' }),
    );
    await user.click(await screen.findByRole('radio', { name: /Convert the folder as it is/u }));
    await user.click(screen.getByRole('button', { name: /Queue/u }));

    expect(await screen.findByText('One book', { selector: 'span' })).toBeVisible();
    await user.click(await runButton(1));
    await screen.findByRole('heading', { name: '1 book ready' });
    const sent = convert.mock.calls[0]![0];
    expect(sent.mode).toBe('convert-only');
    expect(sent.mapping).toBeUndefined();
  });
});
