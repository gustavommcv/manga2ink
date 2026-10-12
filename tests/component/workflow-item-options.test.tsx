import { render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/renderer/app';
import { type MangaboundBridge } from '@/shared/runtime-info';

import { createMappingDraft } from '@/domain/mapping';

import { addFolder, bridge, folder, installBridge, runButton } from './support/workflow';
import { converted, goodTitle, libraryBridge, looseTitle } from './support/library';

afterEach(() => {
  Reflect.deleteProperty(window, 'mangabound');
});

const profiles: MangaboundBridge['getDeviceProfiles'] = () =>
  Promise.resolve({
    ok: true,
    value: [
      {
        code: 'KPW6',
        name: 'Kindle Paperwhite 6',
        width: 1272,
        height: 1696,
        grayLevels: 16,
        family: 'kindle' as const,
      },
      {
        code: 'K11',
        name: 'Kindle 11',
        width: 1072,
        height: 1448,
        grayLevels: 16,
        family: 'kindle' as const,
      },
    ],
  });

/** Two folders in the queue, so one can have options of its own while the other follows the queue. */
const twoFolders = (overrides: Partial<MangaboundBridge> = {}): MangaboundBridge =>
  bridge({
    getDeviceProfiles: profiles,
    chooseInputs: () =>
      Promise.resolve({
        ok: true,
        value: { inputs: [folder('First', 'first'), folder('Second', 'second')], rejected: [] },
      }),
    ...overrides,
  });

const openOptions = async (user: UserEvent, name: string): Promise<void> => {
  await user.click(
    await screen.findByRole('button', { name: `Edit conversion options of ${name}` }),
  );
  expect(await screen.findByRole('heading', { name: `Options for ${name}` })).toBeVisible();
};

describe('the conversion options of one item', () => {
  it('are the queue’s until set, and used for that item only', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<MangaboundBridge['convert']>(bridge().convert);
    installBridge(twoFolders({ convert }));
    render(<App />);
    await addFolder(user);

    await openOptions(user, 'First');
    expect(screen.getByLabelText('Device profile')).toHaveValue('KPW6');
    await user.selectOptions(screen.getByLabelText('Device profile'), 'K11');
    await user.selectOptions(screen.getByLabelText('Book format'), 'epub');
    await user.click(screen.getByRole('button', { name: 'Queue' }));

    await user.click(await runButton(2));
    expect(await screen.findByText(/2 books ready|1 book ready/u)).toBeVisible();
    const sent = convert.mock.calls.map(([command]) => [
      command.settings.deviceProfile,
      command.format,
    ]);
    expect(sent).toEqual([
      ['K11', 'epub'],
      ['KPW6', 'cbz'],
    ]);
    // The queue's own options were not touched by choosing for one item.
    expect(screen.getByText(/1 with options of their own/u)).toBeVisible();
  });

  it('keep following the queue for every option the item did not set', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<MangaboundBridge['convert']>(bridge().convert);
    installBridge(twoFolders({ convert }));
    render(<App />);
    await addFolder(user);

    await openOptions(user, 'First');
    await user.selectOptions(screen.getByLabelText('Content'), 'webtoon');
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    // The queue's device changes afterwards: the item did not set a device of its own.
    await user.selectOptions(screen.getByLabelText('Device'), 'K11');

    await user.click(await runButton(2));
    await screen.findByRole('heading', { name: /ready/u });
    const first = convert.mock.calls[0]?.[0];
    expect(first?.settings.webtoon).toBe(true);
    expect(first?.settings.deviceProfile).toBe('K11');
    expect(convert.mock.calls[1]?.[0].settings.webtoon).toBe(false);
  });

  it('show that an item has its own, and give them up for the queue’s again', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<MangaboundBridge['convert']>(bridge().convert);
    installBridge(twoFolders({ convert }));
    render(<App />);
    await addFolder(user);
    const button = (): HTMLElement =>
      screen.getByRole('button', { name: 'Edit conversion options of First' });
    expect(button()).toHaveAttribute('title', 'Edit conversion options for this item');

    await openOptions(user, 'First');
    expect(screen.getByText('This item uses the options of the queue.')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Device profile'), 'K11');
    expect(screen.getByText('This item has options of its own.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    expect(button()).toHaveAttribute('title', 'Edit conversion options for this item (set)');
    expect(button()).toHaveClass('text-override');

    await openOptions(user, 'First');
    await user.click(screen.getByRole('button', { name: /Use the queue’s options/u }));
    expect(screen.getByLabelText('Device profile')).toHaveValue('KPW6');
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    expect(button()).toHaveAttribute('title', 'Edit conversion options for this item');

    await user.click(await runButton(2));
    await screen.findByRole('heading', { name: /ready/u });
    expect(convert.mock.calls.map(([command]) => command.settings.deviceProfile)).toEqual([
      'KPW6',
      'KPW6',
    ]);
  });

  it('are not an option an item has when it only equals the queue’s', async () => {
    const user = userEvent.setup();
    installBridge(twoFolders());
    render(<App />);
    await addFolder(user);

    await openOptions(user, 'First');
    await user.selectOptions(screen.getByLabelText('Device profile'), 'K11');
    await user.selectOptions(screen.getByLabelText('Device profile'), 'KPW6');
    await user.click(screen.getByRole('button', { name: 'Queue' }));

    expect(
      screen.getByRole('button', { name: 'Edit conversion options of First' }),
    ).toHaveAttribute('title', 'Edit conversion options for this item');
  });

  it('are not offered when only joining, because mangapress is not run then', async () => {
    const user = userEvent.setup();
    installBridge(twoFolders());
    render(<App />);
    await addFolder(user);
    expect(screen.getByRole('button', { name: 'Edit conversion options of First' })).toBeVisible();

    await user.click(screen.getByRole('checkbox', { name: 'Convert for e-reader' }));

    expect(
      screen.queryByRole('button', { name: 'Edit conversion options of First' }),
    ).not.toBeInTheDocument();
  });

  it('differ from one item to the next, and are never kept as the queue’s own options', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<MangaboundBridge['convert']>(bridge().convert);
    const saveSettings = vi.fn<MangaboundBridge['saveSettings']>(() =>
      Promise.resolve({ ok: true, value: undefined }),
    );
    installBridge(
      bridge({
        getDeviceProfiles: profiles,
        saveSettings,
        convert,
        chooseInputs: () =>
          Promise.resolve({
            ok: true,
            value: {
              inputs: [
                folder('First', 'first'),
                folder('Second', 'second'),
                folder('Third', 'third'),
              ],
              rejected: [],
            },
          }),
      }),
    );
    render(<App />);
    await addFolder(user);

    await openOptions(user, 'First');
    await user.selectOptions(screen.getByLabelText('Device profile'), 'K11');
    await user.selectOptions(screen.getByLabelText('Book format'), 'epub');
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    await openOptions(user, 'Second');
    // Another item starts from the queue's options, not from what the first one chose.
    expect(screen.getByLabelText('Device profile')).toHaveValue('KPW6');
    expect(screen.getByLabelText('Book format')).toHaveValue('cbz');
    await user.selectOptions(screen.getByLabelText('Content'), 'webtoon');
    await user.selectOptions(screen.getByLabelText('Book format'), 'pdf');
    await user.click(screen.getByRole('button', { name: 'Queue' }));

    // The queue still shows its own device and format.
    expect(screen.getByLabelText('Device')).toHaveValue('KPW6');
    expect(screen.getByRole('radio', { name: 'CBZ' })).toBeChecked();
    for (const [command] of saveSettings.mock.calls) {
      expect(command.preferences.settings.deviceProfile).toBe('KPW6');
      expect(command.preferences.settings.webtoon).toBe(false);
      expect(command.preferences.format).toBe('cbz');
    }

    await user.click(await runButton(3));
    await screen.findByRole('heading', { name: /ready/u });
    expect(
      convert.mock.calls.map(([command]) => [
        command.settings.deviceProfile,
        command.settings.webtoon,
        command.format,
      ]),
    ).toEqual([
      ['K11', false, 'epub'],
      ['KPW6', true, 'pdf'],
      ['KPW6', false, 'cbz'],
    ]);
  });

  it('make a validated plan stale, so it is validated again before running', async () => {
    const user = userEvent.setup();
    installBridge(twoFolders());
    render(<App />);
    await addFolder(user);
    await user.click(screen.getByRole('button', { name: 'Validate plan' }));
    expect(await screen.findByText('Plan validated')).toBeVisible();

    await openOptions(user, 'First');
    await user.selectOptions(screen.getByLabelText('Device profile'), 'K11');
    await user.click(screen.getByRole('button', { name: 'Queue' }));

    expect(screen.queryByText('Plan validated')).not.toBeInTheDocument();
  });
});

describe('putting an option of one item back', () => {
  const useQueue = (field: string): RegExp => new RegExp(`Use the queue’s value for ${field}`, 'u');

  it('goes back to the queue’s value, not to the app’s default, and says so', async () => {
    const user = userEvent.setup();
    installBridge(twoFolders());
    render(<App />);
    await addFolder(user);
    // The queue is not at the app's defaults: Kindle 11, as an EPUB, with webtoon strips.
    await user.selectOptions(screen.getByLabelText('Device'), 'K11');
    await user.click(screen.getByRole('radio', { name: 'EPUB' }));

    await openOptions(user, 'First');
    // Nothing is in color, and so no option has an arrow, though none is the app's default.
    expect(screen.getByLabelText('Device profile')).toHaveValue('K11');
    expect(screen.getByLabelText('Book format')).toHaveValue('epub');
    expect(screen.queryByRole('button', { name: /Restore default for/u })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: useQueue('') })).not.toBeInTheDocument();

    // The app's default is a change here, the queue's own value is not.
    await user.selectOptions(screen.getByLabelText('Device profile'), 'KPW6');
    await user.selectOptions(screen.getByLabelText('Book format'), 'cbz');
    // What the item sets has a color of its own, not the accent that marks the queue's changes.
    expect(screen.getByText('Device profile')).toHaveClass('text-override');
    expect(screen.getByText('Device profile')).not.toHaveClass('text-accent');
    expect(screen.queryByRole('button', { name: /Restore default for/u })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: useQueue('Device profile') }));
    expect(screen.getByLabelText('Device profile')).toHaveValue('K11');
    expect(
      screen.queryByRole('button', { name: useQueue('Device profile') }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: useQueue('Book format') }));
    expect(screen.getByLabelText('Book format')).toHaveValue('epub');
    // The item is the queue's again, and has nothing of its own.
    expect(screen.getByText('This item uses the options of the queue.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    expect(
      screen.getByRole('button', { name: 'Edit conversion options of First' }),
    ).toHaveAttribute('title', 'Edit conversion options for this item');
  });

  it('is for each option on its own, whatever kind of control it is', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<MangaboundBridge['convert']>(bridge().convert);
    installBridge(twoFolders({ convert }));
    render(<App />);
    await addFolder(user);

    await openOptions(user, 'First');
    await user.selectOptions(screen.getByLabelText('Wide pages'), 'split');
    await user.selectOptions(screen.getByLabelText('Borders'), 'black');
    await user.selectOptions(screen.getByLabelText('Autocontrast'), 'off');
    await user.selectOptions(screen.getByLabelText('Page size'), 'stretch');
    for (const field of ['Wide pages', 'Borders', 'Autocontrast', 'Page size']) {
      expect(screen.getByRole('button', { name: useQueue(field) })).toBeVisible();
    }

    // One put back, the others stay as the item has them.
    await user.click(screen.getByRole('button', { name: useQueue('Borders') }));
    expect(screen.getByLabelText('Borders')).toHaveValue('automatic');
    expect(screen.getByLabelText('Autocontrast')).toHaveValue('off');
    await user.click(screen.getByRole('button', { name: useQueue('Autocontrast') }));
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    await user.click(await runButton(2));
    await screen.findByRole('heading', { name: /ready/u });

    const first = convert.mock.calls[0]?.[0].settings;
    expect(first).toMatchObject({
      splitter: 'split',
      blackBorders: false,
      noAutoContrast: false,
      stretch: true,
    });
    expect(convert.mock.calls[1]?.[0].settings.splitter).toBe('both');
  });

  it('is shown for a field that is the app’s default when the queue’s is not', async () => {
    const user = userEvent.setup();
    installBridge(twoFolders());
    render(<App />);
    await addFolder(user);
    await openOptions(user, 'First');
    await user.selectOptions(screen.getByLabelText('Content'), 'webtoon');
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    // The queue now has webtoon strips too, so the item has nothing of its own to put back.
    await user.click(screen.getByRole('button', { name: 'Advanced conversion options' }));
    await user.selectOptions(screen.getByLabelText('Content'), 'webtoon');
    await user.click(screen.getByRole('button', { name: 'Back' }));

    await openOptions(user, 'First');

    expect(screen.getByLabelText('Content')).toHaveValue('webtoon');
    expect(screen.queryByRole('button', { name: useQueue('Content') })).not.toBeInTheDocument();
    // Going to the app's default is the item's own choice now, and has an arrow to go back.
    await user.selectOptions(screen.getByLabelText('Content'), 'pages');
    expect(screen.getByRole('button', { name: useQueue('Content') })).toBeVisible();
  });
});

describe('the conversion options of a title in a library', () => {
  it('are set per title, and sent for the titles they were set for', async () => {
    const user = userEvent.setup();
    const convertLibrary = vi.fn<MangaboundBridge['convertLibrary']>(() =>
      Promise.resolve({ ok: true, value: [converted('Good Manga', 'good-1')] }),
    );
    installBridge(
      libraryBridge([goodTitle, looseTitle], { convertLibrary, getDeviceProfiles: profiles }),
    );
    render(<App />);
    await addFolder(user);
    await user.click(screen.getByRole('button', { name: 'Edit titles of Manga Library' }));

    await user.click(
      await screen.findByRole('button', { name: 'Edit conversion options of Good Manga' }),
    );
    expect(await screen.findByRole('heading', { name: 'Options for Good Manga' })).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Device profile'), 'K11');
    // Back goes to the library the title belongs to.
    await user.click(screen.getByRole('button', { name: 'Manga Library' }));
    const titles = await screen.findByRole('list', { name: 'Titles' });
    expect(
      within(titles).getByRole('button', { name: 'Edit conversion options of Good Manga' }),
    ).toHaveAttribute('title', 'Edit conversion options for this title (set)');
    await user.click(screen.getByRole('button', { name: 'Queue' }));

    await user.click(await runButton(1));

    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    const command = convertLibrary.mock.calls[0]?.[0];
    expect(command?.settings.deviceProfile).toBe('KPW6');
    expect(
      command?.titleOptions?.map((own) => [own.title, own.settings.deviceProfile, own.format]),
    ).toEqual([['Good Manga', 'K11', 'cbz']]);
  });

  it('send none for a library whose titles set none', async () => {
    const user = userEvent.setup();
    const convertLibrary = vi.fn<MangaboundBridge['convertLibrary']>(() =>
      Promise.resolve({ ok: true, value: [converted('Good Manga', 'good-1')] }),
    );
    installBridge(libraryBridge([goodTitle], { convertLibrary }));
    render(<App />);
    await addFolder(user);

    await user.click(await runButton(1));

    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    expect(convertLibrary.mock.calls[0]?.[0]).not.toHaveProperty('titleOptions');
  });

  it('are not offered for a library when only joining', async () => {
    const user = userEvent.setup();
    installBridge(libraryBridge([goodTitle]));
    render(<App />);
    await addFolder(user);
    await user.click(screen.getByRole('checkbox', { name: 'Convert for e-reader' }));
    await user.click(screen.getByRole('button', { name: 'Edit titles of Manga Library' }));

    expect(await screen.findByRole('list', { name: 'Titles' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Edit conversion options of Good Manga' }),
    ).not.toBeInTheDocument();
  });
});

describe('the conversion options of items in a large queue', () => {
  const pad = (index: number): string => String(index).padStart(3, '0');

  it('reach only the folders they were set for among thirty, in the order of the queue', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<MangaboundBridge['convert']>(bridge().convert);
    const names = Array.from({ length: 30 }, (_, index) => `Series ${pad(index)}`);
    installBridge(
      bridge({
        getDeviceProfiles: profiles,
        convert,
        chooseInputs: () =>
          Promise.resolve({
            ok: true,
            value: {
              inputs: names.map((name, index) => folder(name, `id-${pad(index)}`)),
              rejected: [],
            },
          }),
      }),
    );
    render(<App />);
    await addFolder(user);

    await openOptions(user, 'Series 004');
    await user.selectOptions(screen.getByLabelText('Device profile'), 'K11');
    await user.selectOptions(screen.getByLabelText('Book format'), 'epub');
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    await openOptions(user, 'Series 017');
    await user.selectOptions(screen.getByLabelText('Book format'), 'pdf');
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    await openOptions(user, 'Series 029');
    await user.selectOptions(screen.getByLabelText('Content'), 'webtoon');
    await user.click(screen.getByRole('button', { name: 'Queue' }));

    await user.click(await runButton(30));
    await screen.findByRole('heading', { name: /30 books ready/u });

    expect(convert).toHaveBeenCalledTimes(30);
    const sent = convert.mock.calls.map(([command]) => [
      command.settings.deviceProfile,
      command.settings.webtoon,
      command.format,
    ]);
    sent.forEach((entry, index) => {
      const expected =
        index === 4
          ? ['K11', false, 'epub']
          : index === 17
            ? ['KPW6', false, 'pdf']
            : index === 29
              ? ['KPW6', true, 'cbz']
              : ['KPW6', false, 'cbz'];
      expect(entry, `item ${String(index)}`).toEqual(expected);
    });
  }, 60_000);

  it('reach only the titles they were set for among a hundred in a library', async () => {
    const user = userEvent.setup();
    const titles = Array.from({ length: 100 }, (_, index) => {
      const name = `Manga ${pad(index)}`;
      return {
        title: name,
        draft: createMappingDraft({
          mangaTitle: name,
          chapters: [
            {
              id: `c${pad(index)}`,
              name: 'Chapter 1',
              path: `C:\\input\\${name}\\1`,
              pageCount: 2,
              chapter: 1,
            },
          ],
          volumes: [{ id: `v${pad(index)}`, number: '1', chapterIds: [`c${pad(index)}`] }],
        }),
        volumes: [{ name: `${name} - Vol.01.cbz`, pageCount: 2 }],
        issues: [],
      };
    });
    const convertLibrary = vi.fn<MangaboundBridge['convertLibrary']>(() =>
      Promise.resolve({
        ok: true,
        value: titles.map((entry, index) => converted(entry.title, `book-${pad(index)}`)),
      }),
    );
    installBridge(libraryBridge(titles, { convertLibrary, getDeviceProfiles: profiles }));
    render(<App />);
    await addFolder(user);
    await user.click(screen.getByRole('button', { name: 'Edit titles of Manga Library' }));
    const list = await screen.findByRole('list', { name: 'Titles' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(100);

    for (const [name, format] of [
      ['Manga 003', 'epub'],
      ['Manga 042', 'pdf'],
      ['Manga 099', 'epub'],
    ] as const) {
      // The library page is drawn again each time it is returned to.
      const current = await screen.findByRole('list', { name: 'Titles' });
      await user.click(
        within(current).getByRole('button', { name: `Edit conversion options of ${name}` }),
      );
      await screen.findByRole('heading', { name: `Options for ${name}` });
      await user.selectOptions(screen.getByLabelText('Book format'), format);
      await user.click(screen.getByRole('button', { name: 'Manga Library' }));
      await screen.findByRole('list', { name: 'Titles' });
    }
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    await user.click(await runButton(1));
    await screen.findByRole('heading', { name: /100 books ready/u });

    const command = convertLibrary.mock.calls[0]?.[0];
    expect(command?.format).toBe('cbz');
    expect(command?.titles).toHaveLength(100);
    expect(command?.titleOptions?.map((own) => [own.title, own.format])).toEqual([
      ['Manga 003', 'epub'],
      ['Manga 042', 'pdf'],
      ['Manga 099', 'epub'],
    ]);
  }, 60_000);
});

describe('the conversion options of an item that failed', () => {
  const artifactOf = (name: string, format: 'cbz' | 'epub' | 'pdf') => ({
    ok: true as const,
    value: [{ id: `${name}-book`, name: `${name}.${format}`, bytes: 2048, format }],
  });

  it('stay with a folder that failed, and are the ones it is run with again', async () => {
    const user = userEvent.setup();
    let secondWorks = false;
    const convert = vi.fn<MangaboundBridge['convert']>((command) => {
      if (command.sessionId === 'session-second' && !secondWorks) {
        return Promise.resolve({
          ok: false as const,
          error: { code: 'process_failed', message: 'mangapress crashed.' },
        });
      }
      return Promise.resolve(artifactOf(command.sessionId, command.format));
    });
    installBridge(
      bridge({
        getDeviceProfiles: profiles,
        convert,
        chooseInputs: () =>
          Promise.resolve({
            ok: true,
            value: {
              inputs: [
                folder('First', 'first'),
                folder('Second', 'second'),
                folder('Third', 'third'),
              ],
              rejected: [],
            },
          }),
      }),
    );
    render(<App />);
    await addFolder(user);
    for (const [name, format] of [
      ['First', 'epub'],
      ['Second', 'pdf'],
    ] as const) {
      await openOptions(user, name);
      await user.selectOptions(screen.getByLabelText('Book format'), format);
      await user.click(screen.getByRole('button', { name: 'Queue' }));
    }
    await openOptions(user, 'Third');
    await user.selectOptions(screen.getByLabelText('Content'), 'webtoon');
    await user.click(screen.getByRole('button', { name: 'Queue' }));

    await user.click(await runButton(3));
    expect(await screen.findByRole('heading', { name: '2 books ready' })).toBeVisible();
    expect(screen.getByText('Second could not be converted')).toBeVisible();
    // Only the items that made a book count as made with options of their own.
    expect(screen.getByText(/2 with options of their own/u)).toBeVisible();
    // The item after the failed one was made with its own options, not the failed one's.
    expect(
      convert.mock.calls.map(([command]) => [command.format, command.settings.webtoon]),
    ).toEqual([
      ['epub', false],
      ['pdf', false],
      ['cbz', true],
    ]);

    await user.click(screen.getByRole('button', { name: 'Convert more' }));
    const list = screen.getByRole('list', { name: 'Queued items' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(
      within(list).getByRole('button', { name: 'Edit conversion options of Second' }),
    ).toHaveAttribute('title', 'Edit conversion options for this item (set)');

    secondWorks = true;
    await user.click(await runButton(1));
    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    expect(convert).toHaveBeenCalledTimes(4);
    expect(convert.mock.calls[3]?.[0].format).toBe('pdf');
    expect(convert.mock.calls[3]?.[0].sessionId).toBe('session-second');
  });

  it('stay with a title of a library that failed, and only its own are sent when it runs again', async () => {
    const user = userEvent.setup();
    const secondTitle = { ...goodTitle, title: 'Second Manga' };
    const convertLibrary = vi
      .fn<MangaboundBridge['convertLibrary']>()
      .mockResolvedValueOnce({
        ok: true,
        value: [
          converted('Good Manga', 'good-1'),
          {
            title: 'Second Manga',
            status: 'failed',
            artifacts: [],
            failure: { code: 'process_failed', message: 'mangapress crashed.' },
          },
        ],
      })
      .mockResolvedValueOnce({ ok: true, value: [converted('Second Manga', 'second-1')] });
    installBridge(
      libraryBridge([goodTitle, secondTitle], { convertLibrary, getDeviceProfiles: profiles }),
    );
    render(<App />);
    await addFolder(user);
    await user.click(screen.getByRole('button', { name: 'Edit titles of Manga Library' }));
    for (const [name, format] of [
      ['Good Manga', 'epub'],
      ['Second Manga', 'pdf'],
    ] as const) {
      const titles = await screen.findByRole('list', { name: 'Titles' });
      await user.click(
        within(titles).getByRole('button', { name: `Edit conversion options of ${name}` }),
      );
      await screen.findByRole('heading', { name: `Options for ${name}` });
      await user.selectOptions(screen.getByLabelText('Book format'), format);
      await user.click(screen.getByRole('button', { name: 'Manga Library' }));
    }
    await user.click(screen.getByRole('button', { name: 'Queue' }));

    await user.click(await runButton(1));
    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    expect(screen.getByText(/1 with options of their own/u)).toBeVisible();
    expect(
      convertLibrary.mock.calls[0]?.[0].titleOptions?.map((own) => [own.title, own.format]),
    ).toEqual([
      ['Good Manga', 'epub'],
      ['Second Manga', 'pdf'],
    ]);

    await user.click(screen.getByRole('button', { name: 'Convert more' }));
    await user.click(screen.getByRole('button', { name: 'Edit titles of Manga Library' }));
    expect(
      await screen.findByRole('button', { name: 'Edit conversion options of Second Manga' }),
    ).toHaveAttribute('title', 'Edit conversion options for this title (set)');
    await user.click(screen.getByRole('button', { name: 'Queue' }));
    await user.click(await runButton(1));
    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();

    // The saved title is not sent again, and neither are its options.
    const again = convertLibrary.mock.calls[1]?.[0];
    expect(again?.titles).toEqual(['Second Manga']);
    expect(again?.titleOptions?.map((own) => [own.title, own.format])).toEqual([
      ['Second Manga', 'pdf'],
    ]);
  });
});
