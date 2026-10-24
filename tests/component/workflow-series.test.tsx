import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMappingDraft } from '@/domain/mapping';
import { message } from '@/domain/message';
import { App } from '@/renderer/app';
import type { Manga2InkBridge } from '@/shared/runtime-info';

import { addFolder, bridge, chapters, installBridge, runButton } from './support/workflow';

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

    await user.click(screen.getByRole('radio', { name: 'Whole series' }));

    expect(await screen.findByText('Whole series', { selector: 'span' })).toBeVisible();
    expect(screen.queryByText('Needs volumes')).not.toBeInTheDocument();
    expect(await runButton(1)).toBeEnabled();
  });

  it('is made into one book, handing the tool the mapping as it is', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<Manga2InkBridge['convert']>(bridge().convert);
    installBridge(withNoVolumes({ convert }));
    render(<App />);
    await addFolder(user);
    await user.click(screen.getByRole('radio', { name: 'Whole series' }));

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
    await user.click(screen.getByRole('radio', { name: 'Whole series' }));

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
