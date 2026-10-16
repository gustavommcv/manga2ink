import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Language } from '@/domain/app-settings';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { ProcessingTab } from '@/renderer/components/settings/processing-tab';
import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';
import type { MangaboundBridge } from '@/shared/runtime-info';
import type { WorkflowResult } from '@/shared/workflow-contract';

import { inertBridge } from './support/bridge';
import { chosenProcessingStatus, defaultProcessingStatus } from './support/processing';
import { deferred } from './support/workflow';

const speaking =
  (language: Language): MangaboundBridge['loadAppSettings'] =>
  () =>
    Promise.resolve({ ok: true, value: { settings: { language }, language, unreadable: false } });

const answering =
  (status: ProcessingFolderStatus): MangaboundBridge['getProcessingFolder'] =>
  () =>
    Promise.resolve({ ok: true, value: status });

const refusing = (code: string): WorkflowResult<never> => ({
  ok: false,
  error: { code, message: 'English from the main process.' },
});

async function renderTab(
  overrides: Partial<MangaboundBridge> = {},
  language: Language = 'en',
): Promise<void> {
  render(
    <AppSettingsProvider
      bridge={inertBridge({ loadAppSettings: speaking(language), ...overrides })}
    >
      <ProcessingTab />
    </AppSettingsProvider>,
  );
  // The description is there as soon as the window has read its language, whatever is asked next.
  await screen.findByText(/ volumes /u);
}

describe('the Processing tab when the app works in its own places', () => {
  it('says the folder is Mangabound’s own choice, and where volumes and books are, and the room', async () => {
    await renderTab({ getProcessingFolder: answering(defaultProcessingStatus) });

    expect(await screen.findByText('Chosen by Mangabound')).toBeVisible();
    expect(screen.getByText('/tmp')).toBeVisible();
    expect(screen.getByText('/home/reader/.local/share/mangabound/pending')).toBeVisible();
    expect(screen.getByText('120 GB')).toBeVisible();
    expect(screen.getByText('Free space')).toBeVisible();
  });

  it('has nothing to go back to, so the button that does is off', async () => {
    await renderTab({ getProcessingFolder: answering(defaultProcessingStatus) });

    expect(await screen.findByRole('button', { name: 'Choose a folder…' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Use the default folder' })).toBeDisabled();
  });

  it('shows no line for the room when it cannot be said', async () => {
    await renderTab({
      getProcessingFolder: answering({ ...defaultProcessingStatus, freeBytes: null }),
    });

    await screen.findByText('Chosen by Mangabound');
    expect(screen.queryByText('Free space')).not.toBeInTheDocument();
  });

  it('says what a choice does, and that the books already waiting stay where they are', async () => {
    await renderTab({ getProcessingFolder: answering(defaultProcessingStatus) });

    expect(await screen.findByText(/books already waiting stay where they are/u)).toBeVisible();
  });

  it('shows nothing about earlier folders while there are none', async () => {
    await renderTab({ getProcessingFolder: answering(defaultProcessingStatus) });

    await screen.findByText('Chosen by Mangabound');
    expect(screen.queryByText('Still waiting in earlier folders')).not.toBeInTheDocument();
  });
});

describe('the Processing tab when a folder was chosen', () => {
  it('shows the folder, its two folders and the room on its drive', async () => {
    await renderTab({ getProcessingFolder: answering(chosenProcessingStatus) });

    expect(await screen.findByText('/mnt/books')).toBeVisible();
    expect(screen.getByText('/mnt/books/Scratch')).toBeVisible();
    expect(screen.getByText('/mnt/books/Pending')).toBeVisible();
    expect(screen.getByText('800 GB')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Use the default folder' })).toBeEnabled();
  });

  it('lists the folders books are still waiting in, with how many', async () => {
    await renderTab({
      getProcessingFolder: answering({
        ...chosenProcessingStatus,
        earlier: [
          { folder: '/home/reader/.local/share/mangabound/pending', books: 3 },
          { folder: '/old/Pending', books: 1 },
        ],
      }),
    });

    const heading = await screen.findByRole('heading', {
      name: 'Still waiting in earlier folders',
    });
    const section = heading.parentElement!;
    expect(within(section).getByText('3 books')).toBeVisible();
    expect(within(section).getByText('1 book')).toBeVisible();
    expect(within(section).getByText('/old/Pending')).toBeVisible();
  });

  it('says the folder is not there, as an alert, when its drive is not connected', async () => {
    await renderTab({
      getProcessingFolder: answering({ ...chosenProcessingStatus, available: false }),
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The working folder is not available.',
    );
  });

  it('has no alert while the folder is there', async () => {
    await renderTab({ getProcessingFolder: answering(chosenProcessingStatus) });

    await screen.findByText('/mnt/books');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('choosing a folder', () => {
  it('shows what the main process answers once the folder is chosen', async () => {
    const user = userEvent.setup();
    const chooseProcessingFolder = vi.fn<MangaboundBridge['chooseProcessingFolder']>(() =>
      Promise.resolve({ ok: true, value: chosenProcessingStatus }),
    );
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      chooseProcessingFolder,
    });

    await user.click(await screen.findByRole('button', { name: 'Choose a folder…' }));

    expect(await screen.findByText('/mnt/books/Pending')).toBeVisible();
    expect(chooseProcessingFolder).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Use the default folder' })).toBeEnabled();
  });

  it('changes nothing, and says nothing, when the dialog is cancelled', async () => {
    const user = userEvent.setup();
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      chooseProcessingFolder: () => Promise.resolve({ ok: true, value: null }),
    });

    await user.click(await screen.findByRole('button', { name: 'Choose a folder…' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Choose a folder…' })).toBeEnabled();
    });
    expect(screen.getByText('Chosen by Mangabound')).toBeVisible();
    expect(screen.queryByText(/could not be changed|cannot work|running/u)).not.toBeInTheDocument();
  });

  it('turns the buttons off while the main process works, so a second choice is not made on top', async () => {
    const user = userEvent.setup();
    const answer = deferred<WorkflowResult<ProcessingFolderStatus | null>>();
    await renderTab({
      getProcessingFolder: answering(chosenProcessingStatus),
      chooseProcessingFolder: () => answer.promise,
    });

    await user.click(await screen.findByRole('button', { name: 'Choose a folder…' }));

    expect(screen.getByRole('button', { name: 'Choose a folder…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Use the default folder' })).toBeDisabled();
    answer.resolve({ ok: true, value: null });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Choose a folder…' })).toBeEnabled();
    });
  });

  it.each([
    [
      'a conversion or a share is running',
      'processing_busy',
      /A conversion or a share is running/u,
    ],
    ['the folder cannot be used', 'processing_folder_unusable', /cannot work in that folder/u],
    ['something else went wrong', 'settings_save_failed', /could not be changed/u],
  ])('says so when %s, in the words of the window', async (_name, code, message) => {
    const user = userEvent.setup();
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      chooseProcessingFolder: () => Promise.resolve(refusing(code)),
    });

    await user.click(await screen.findByRole('button', { name: 'Choose a folder…' }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(screen.queryByText('English from the main process.')).not.toBeInTheDocument();
    expect(screen.getByText('Chosen by Mangabound')).toBeVisible();
  });

  it('says the same when the main process does not answer at all', async () => {
    const user = userEvent.setup();
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      chooseProcessingFolder: () => Promise.reject(new Error('The bridge is gone.')),
    });

    await user.click(await screen.findByRole('button', { name: 'Choose a folder…' }));

    expect(await screen.findByText(/could not be changed/u)).toBeVisible();
  });

  it('takes the message away when the next try is made', async () => {
    const user = userEvent.setup();
    const chooseProcessingFolder = vi
      .fn<MangaboundBridge['chooseProcessingFolder']>()
      .mockResolvedValueOnce(refusing('processing_busy'))
      .mockResolvedValueOnce({ ok: true, value: chosenProcessingStatus });
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      chooseProcessingFolder,
    });

    await user.click(await screen.findByRole('button', { name: 'Choose a folder…' }));
    await screen.findByText(/A conversion or a share is running/u);
    await user.click(screen.getByRole('button', { name: 'Choose a folder…' }));

    await waitFor(() => {
      expect(screen.queryByText(/A conversion or a share is running/u)).not.toBeInTheDocument();
    });
  });
});

describe('going back to the folder Mangabound picks', () => {
  it('asks for it, and shows its own places again', async () => {
    const user = userEvent.setup();
    const useDefaultProcessingFolder = vi.fn<MangaboundBridge['useDefaultProcessingFolder']>(() =>
      Promise.resolve({
        ok: true,
        value: {
          ...defaultProcessingStatus,
          earlier: [{ folder: '/mnt/books/Pending', books: 2 }],
        },
      }),
    );
    await renderTab({
      getProcessingFolder: answering(chosenProcessingStatus),
      useDefaultProcessingFolder,
    });

    await user.click(await screen.findByRole('button', { name: 'Use the default folder' }));

    expect(await screen.findByText('Chosen by Mangabound')).toBeVisible();
    expect(useDefaultProcessingFolder).toHaveBeenCalledOnce();
    expect(screen.getByText('2 books')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Use the default folder' })).toBeDisabled();
  });

  it('says so while a conversion is running, and stays where it is', async () => {
    const user = userEvent.setup();
    await renderTab({
      getProcessingFolder: answering(chosenProcessingStatus),
      useDefaultProcessingFolder: () => Promise.resolve(refusing('processing_busy')),
    });

    await user.click(await screen.findByRole('button', { name: 'Use the default folder' }));

    expect(await screen.findByText(/A conversion or a share is running/u)).toBeVisible();
    expect(screen.getByText('/mnt/books')).toBeVisible();
  });
});

describe('reading where the app works', () => {
  it('says it is reading until the main process answers', async () => {
    const answer = deferred<WorkflowResult<ProcessingFolderStatus>>();
    render(
      <AppSettingsProvider bridge={inertBridge({ getProcessingFolder: () => answer.promise })}>
        <ProcessingTab />
      </AppSettingsProvider>,
    );

    expect(await screen.findByText('Reading where Mangabound works…')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Choose a folder…' })).not.toBeInTheDocument();
    answer.resolve({ ok: true, value: defaultProcessingStatus });
    expect(await screen.findByRole('button', { name: 'Choose a folder…' })).toBeVisible();
  });

  it('says it could not, and offers nothing to change, when the main process refuses', async () => {
    await renderTab({ getProcessingFolder: () => Promise.resolve(refusing('x')) });

    expect(await screen.findByText(/could not be read/u)).toBeVisible();
    expect(screen.queryByText('Reading where Mangabound works…')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose a folder…' })).not.toBeInTheDocument();
  });

  it('says it could not when the main process does not answer', async () => {
    await renderTab({ getProcessingFolder: () => Promise.reject(new Error('gone')) });

    expect(await screen.findByText(/could not be read/u)).toBeVisible();
  });

  it('takes no answer into account once the tab is gone', async () => {
    const answer = deferred<WorkflowResult<ProcessingFolderStatus>>();
    const view = render(
      <AppSettingsProvider bridge={inertBridge({ getProcessingFolder: () => answer.promise })}>
        <ProcessingTab />
      </AppSettingsProvider>,
    );
    await screen.findByText('Reading where Mangabound works…');

    view.unmount();
    answer.resolve({ ok: true, value: defaultProcessingStatus });

    await Promise.resolve();
    expect(screen.queryByText('Chosen by Mangabound')).not.toBeInTheDocument();
  });
});

describe('the Processing tab in Portuguese', () => {
  it('speaks the language of the window, and writes the room as it writes numbers', async () => {
    await renderTab(
      {
        getProcessingFolder: answering({
          ...chosenProcessingStatus,
          freeBytes: 1.5 * 1024 ** 3,
          earlier: [{ folder: '/antiga/Pending', books: 1 }],
        }),
      },
      'pt-BR',
    );

    expect(await screen.findByText('Pasta de trabalho')).toBeVisible();
    expect(screen.getByText('1,5 GB')).toBeVisible();
    expect(screen.getByText('1 livro')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Escolher uma pasta…' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Usar a pasta padrão' })).toBeEnabled();
  });
});
