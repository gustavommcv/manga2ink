import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Language } from '@/domain/app-settings';
import { message } from '@/domain/message';
import type { WaitingBooks } from '@/domain/pending-cleanup';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { ProcessingTab } from '@/renderer/components/settings/processing-tab';
import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';
import type { Manga2InkBridge } from '@/shared/runtime-info';

import { inertBridge } from './support/bridge';
import { defaultProcessingStatus } from './support/processing';
import { deferred } from './support/workflow';
import { defaultAppSettings } from '@/domain/app-settings';

/** The choice of days of the clean-up: the tab has another select, so this one is asked for by name. */
const days = 'Delete what has waited, untouched, for more than';

const GiB = 1024 ** 3;
const MiB = 1024 ** 2;

const waitingStatus: ProcessingFolderStatus = {
  ...defaultProcessingStatus,
  waiting: { runs: 2, books: 5, bytes: 1.2 * GiB },
};
const found: WaitingBooks = { runs: 1, books: 3, bytes: 480 * MiB };

const speaking =
  (language: Language): Manga2InkBridge['loadAppSettings'] =>
  () =>
    Promise.resolve({
      ok: true,
      value: { settings: { ...defaultAppSettings, language }, language, unreadable: false },
    });

const reading =
  (...statuses: ProcessingFolderStatus[]): Manga2InkBridge['getProcessingFolder'] =>
  () =>
    Promise.resolve({ ok: true, value: statuses.shift() ?? waitingStatus });

const counting =
  (value: WaitingBooks): Manga2InkBridge['countIdlePending'] =>
  () =>
    Promise.resolve({ ok: true, value });

async function renderTab(
  overrides: Partial<Manga2InkBridge> = {},
  language: Language = 'en',
): Promise<void> {
  render(
    <AppSettingsProvider
      bridge={inertBridge({
        loadAppSettings: speaking(language),
        getProcessingFolder: reading(waitingStatus),
        ...overrides,
      })}
    >
      <ProcessingTab />
    </AppSettingsProvider>,
  );
  await screen.findByRole('heading', {
    name: language === 'en' ? 'Books waiting to be saved' : 'Livros esperando para serem salvos',
  });
}

describe('the books that wait, in the Processing tab', () => {
  it('says how many books wait, in how many conversions, and how much they take', async () => {
    await renderTab();

    expect(screen.getByText('5 books in 2 conversions, 1.2 GB')).toBeVisible();
    expect(screen.getByText(/removed when Manga2Ink closes/u)).toBeVisible();
    const days = screen.getByRole('combobox', { name: /Delete what has waited, untouched/u });
    expect(days).toHaveValue('30');
    expect(
      within(days)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['7 days', '30 days', '90 days']);
  });

  it('says in the singular when one book waits in one conversion', async () => {
    await renderTab({
      getProcessingFolder: reading({
        ...waitingStatus,
        waiting: { runs: 1, books: 1, bytes: 2 * MiB },
      }),
    });

    expect(screen.getByText('1 book in 1 conversion, 2 MB')).toBeVisible();
  });

  it('says that none waits, and offers no clean-up, when none does', async () => {
    await renderTab({ getProcessingFolder: reading(defaultProcessingStatus) });

    expect(screen.getByText('No books are waiting.')).toBeVisible();
    expect(screen.queryByRole('combobox', { name: days })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete…' })).not.toBeInTheDocument();
  });

  it('asks what the chosen number of days would delete, and deletes nothing yet', async () => {
    const user = userEvent.setup();
    const countIdlePending = vi.fn<Manga2InkBridge['countIdlePending']>(counting(found));
    const deleteIdlePending = vi.fn<Manga2InkBridge['deleteIdlePending']>();
    await renderTab({ countIdlePending, deleteIdlePending });

    await user.selectOptions(screen.getByRole('combobox', { name: days }), '7');
    await user.click(screen.getByRole('button', { name: 'Delete…' }));

    const question = await screen.findByRole('group');
    expect(question).toHaveTextContent(
      'Delete 1 conversion (3 books, 480 MB) that nothing has touched in more than 7 days? Books that were not saved yet will be lost.',
    );
    expect(question).toHaveFocus();
    expect(countIdlePending).toHaveBeenCalledExactlyOnceWith({ days: 7 });
    expect(deleteIdlePending).not.toHaveBeenCalled();
    expect(screen.getByRole('combobox', { name: days })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Delete…' })).toBeDisabled();
  });

  it('deletes only when told to, says what went, and reads the books that wait again', async () => {
    const user = userEvent.setup();
    const deleteIdlePending = vi.fn<Manga2InkBridge['deleteIdlePending']>(() =>
      Promise.resolve({ ok: true, value: found }),
    );
    await renderTab({
      countIdlePending: counting(found),
      deleteIdlePending,
      getProcessingFolder: reading(waitingStatus, {
        ...waitingStatus,
        waiting: { runs: 1, books: 2, bytes: 720 * MiB },
      }),
    });

    await user.click(screen.getByRole('button', { name: 'Delete…' }));
    await user.click(
      within(await screen.findByRole('group')).getByRole('button', { name: 'Delete' }),
    );

    expect(await screen.findByText('Deleted 1 conversion, 480 MB.')).toBeVisible();
    expect(deleteIdlePending).toHaveBeenCalledExactlyOnceWith({ days: 30 });
    expect(await screen.findByText('2 books in 1 conversion, 720 MB')).toBeVisible();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete…' })).toBeEnabled();
  });

  it('keeps the books when the question is answered with no, or with Escape, and gives the focus back', async () => {
    const user = userEvent.setup();
    const deleteIdlePending = vi.fn<Manga2InkBridge['deleteIdlePending']>();
    await renderTab({ countIdlePending: counting(found), deleteIdlePending });

    await user.click(screen.getByRole('button', { name: 'Delete…' }));
    await user.click(
      within(await screen.findByRole('group')).getByRole('button', { name: 'Keep them' }),
    );

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete…' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Delete…' }));
    await screen.findByRole('group');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete…' })).toHaveFocus();
    expect(deleteIdlePending).not.toHaveBeenCalled();
  });

  it('does not let the question be closed, or asked twice, while it is deleting', async () => {
    const user = userEvent.setup();
    const answer = deferred<Awaited<ReturnType<Manga2InkBridge['deleteIdlePending']>>>();
    await renderTab({
      countIdlePending: counting(found),
      deleteIdlePending: () => answer.promise,
    });

    await user.click(screen.getByRole('button', { name: 'Delete…' }));
    const question = await screen.findByRole('group');
    await user.click(within(question).getByRole('button', { name: 'Delete' }));

    expect(within(question).getByRole('button', { name: 'Delete' })).toBeDisabled();
    expect(within(question).getByRole('button', { name: 'Keep them' })).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('group')).toBeVisible();

    answer.resolve({ ok: true, value: found });
    await waitFor(() => {
      expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });
  });

  it('says that nothing has waited that long, and asks nothing, when nothing has', async () => {
    const user = userEvent.setup();
    await renderTab({ countIdlePending: counting({ runs: 0, books: 0, bytes: 0 }) });

    await user.selectOptions(screen.getByRole('combobox', { name: days }), '90');
    await user.click(screen.getByRole('button', { name: 'Delete…' }));

    expect(await screen.findByText('Nothing has waited for more than 90 days.')).toBeVisible();
    expect(screen.queryByRole('group')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete…' })).toBeEnabled();
  });

  it('takes what it said away when the next try is made', async () => {
    const user = userEvent.setup();
    await renderTab({ countIdlePending: counting({ runs: 0, books: 0, bytes: 0 }) });
    await user.click(screen.getByRole('button', { name: 'Delete…' }));
    await screen.findByText('Nothing has waited for more than 30 days.');

    await user.selectOptions(screen.getByRole('combobox', { name: days }), '7');
    await user.click(screen.getByRole('button', { name: 'Delete…' }));

    expect(await screen.findByText('Nothing has waited for more than 7 days.')).toBeVisible();
    expect(screen.queryByText('Nothing has waited for more than 30 days.')).not.toBeInTheDocument();
  });

  it('says why when the books that were found could not be looked at', async () => {
    const user = userEvent.setup();
    await renderTab({
      countIdlePending: () =>
        Promise.resolve({
          ok: false,
          error: {
            code: 'pending_delete_failed',
            said: message('failure.pendingDeleteFailed', {}),
          },
        }),
    });

    await user.click(screen.getByRole('button', { name: 'Delete…' }));

    expect(await screen.findByText(/could not be deleted/iu)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Delete…' })).toBeEnabled();
  });

  it('says when a conversion is in the way, and reads again since something may have gone', async () => {
    const user = userEvent.setup();
    const getProcessingFolder = vi.fn(reading(waitingStatus, waitingStatus));
    await renderTab({
      getProcessingFolder,
      countIdlePending: counting(found),
      deleteIdlePending: () =>
        Promise.resolve({
          ok: false,
          error: { code: 'pending_in_use', said: message('failure.waitForConversion', {}) },
        }),
    });

    await user.click(screen.getByRole('button', { name: 'Delete…' }));
    await user.click(
      within(await screen.findByRole('group')).getByRole('button', { name: 'Delete' }),
    );

    expect(
      await screen.findByText(/conversion/iu, { selector: 'p.text-status-failed' }),
    ).toBeVisible();
    await waitFor(() => {
      expect(getProcessingFolder).toHaveBeenCalledTimes(2);
    });
  });

  it('says that nothing was deleted when what it found was being saved', async () => {
    const user = userEvent.setup();
    await renderTab({
      countIdlePending: counting(found),
      deleteIdlePending: () =>
        Promise.resolve({ ok: true, value: { runs: 0, books: 0, bytes: 0 } }),
    });

    await user.click(screen.getByRole('button', { name: 'Delete…' }));
    await user.click(
      within(await screen.findByRole('group')).getByRole('button', { name: 'Delete' }),
    );

    expect(
      await screen.findByText('Nothing was deleted: what was found is being saved.'),
    ).toBeVisible();
  });

  it('says the same when the main process does not answer at all', async () => {
    const user = userEvent.setup();
    await renderTab({ countIdlePending: () => Promise.reject(new Error('The bridge is gone.')) });

    await user.click(screen.getByRole('button', { name: 'Delete…' }));

    expect(await screen.findByText('Manga2Ink could not complete that action.')).toBeVisible();
  });

  it('is written in Portuguese when the window is', async () => {
    const user = userEvent.setup();
    await renderTab(
      {
        countIdlePending: counting(found),
        deleteIdlePending: () => Promise.resolve({ ok: true, value: found }),
      },
      'pt-BR',
    );

    expect(screen.getByText('5 livros em 2 conversões, 1,2 GB')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Apagar…' }));
    expect(await screen.findByRole('group')).toHaveTextContent(
      'Apagar 1 conversão (3 livros, 480 MB) que ninguém tocou há mais de 30 dias? Os livros que ainda não foram salvos serão perdidos.',
    );
    await user.click(within(screen.getByRole('group')).getByRole('button', { name: 'Apagar' }));

    expect(await screen.findByText('1 conversão apagada, 480 MB.')).toBeVisible();
  });
});
