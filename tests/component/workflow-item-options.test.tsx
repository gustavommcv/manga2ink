import { render, screen, within } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/renderer/app';
import { type MangaboundBridge } from '@/shared/runtime-info';

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
