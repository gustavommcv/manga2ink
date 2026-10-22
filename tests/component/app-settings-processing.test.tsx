import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Language } from '@/domain/app-settings';
import { type AnyMessage, message } from '@/domain/message';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { ProcessingTab } from '@/renderer/components/settings/processing-tab';
import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';
import type { Manga2InkBridge } from '@/shared/runtime-info';
import type { WorkflowResult } from '@/shared/workflow-contract';

import { inertBridge } from './support/bridge';
import { chosenProcessingStatus, defaultProcessingStatus } from './support/processing';
import { deferred } from './support/workflow';
import { defaultAppSettings } from '@/domain/app-settings';

const speaking =
  (language: Language): Manga2InkBridge['loadAppSettings'] =>
  () =>
    Promise.resolve({
      ok: true,
      value: { settings: { ...defaultAppSettings, language }, language, unreadable: false },
    });

const answering =
  (status: ProcessingFolderStatus): Manga2InkBridge['getProcessingFolder'] =>
  () =>
    Promise.resolve({ ok: true, value: status });

/** What the main process answers when it cannot do what was asked, as a code the window writes. */
const refusing = (code: string, said: AnyMessage): WorkflowResult<never> => ({
  ok: false,
  error: { code, said },
});
const busy = refusing('processing_busy', message('failure.processingBusy', {}));
const unusable = refusing(
  'processing_folder_unusable',
  message('failure.processingFolderUnusable', { folder: '/read-only' }),
);

async function renderTab(
  overrides: Partial<Manga2InkBridge> = {},
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
  it('says the folder is Manga2Ink’s own choice, and where volumes and books are, and the room', async () => {
    await renderTab({ getProcessingFolder: answering(defaultProcessingStatus) });

    expect(await screen.findByText('Chosen by Manga2Ink')).toBeVisible();
    expect(screen.getByText('/tmp')).toBeVisible();
    expect(screen.getByText('/home/reader/.local/share/manga2ink/pending')).toBeVisible();
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

    await screen.findByText('Chosen by Manga2Ink');
    expect(screen.queryByText('Free space')).not.toBeInTheDocument();
  });

  it('says what a choice does, and that the books already waiting stay where they are', async () => {
    await renderTab({ getProcessingFolder: answering(defaultProcessingStatus) });

    expect(await screen.findByText(/books already waiting stay where they are/u)).toBeVisible();
  });

  it('shows nothing about earlier folders while there are none', async () => {
    await renderTab({ getProcessingFolder: answering(defaultProcessingStatus) });

    await screen.findByText('Chosen by Manga2Ink');
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
          { folder: '/home/reader/.local/share/manga2ink/pending', books: 3 },
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
    const chooseProcessingFolder = vi.fn<Manga2InkBridge['chooseProcessingFolder']>(() =>
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
    expect(screen.getByText('Chosen by Manga2Ink')).toBeVisible();
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
    ['a conversion or a share is running', busy, /A conversion or a share is running/u],
    ['the folder cannot be used', unusable, /Manga2Ink cannot work in \/read-only/u],
  ])('says so when %s, in the words of the window', async (_name, answer, sentence) => {
    const user = userEvent.setup();
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      chooseProcessingFolder: () => Promise.resolve(answer),
    });

    await user.click(await screen.findByRole('button', { name: 'Choose a folder…' }));

    expect(await screen.findByText(sentence)).toBeVisible();
    expect(screen.getByText('Chosen by Manga2Ink')).toBeVisible();
  });

  it('says the same, in Portuguese, when the window is in Portuguese', async () => {
    const user = userEvent.setup();
    await renderTab(
      {
        getProcessingFolder: answering(defaultProcessingStatus),
        chooseProcessingFolder: () => Promise.resolve(busy),
      },
      'pt-BR',
    );

    await user.click(await screen.findByRole('button', { name: 'Escolher uma pasta…' }));

    expect(await screen.findByText(/Há uma conversão ou um compartilhamento/u)).toBeVisible();
  });

  it('says the same when the main process does not answer at all', async () => {
    const user = userEvent.setup();
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      chooseProcessingFolder: () => Promise.reject(new Error('The bridge is gone.')),
    });

    await user.click(await screen.findByRole('button', { name: 'Choose a folder…' }));

    expect(await screen.findByText('Manga2Ink could not complete that action.')).toBeVisible();
  });

  it('takes the message away when the next try is made', async () => {
    const user = userEvent.setup();
    const chooseProcessingFolder = vi
      .fn<Manga2InkBridge['chooseProcessingFolder']>()
      .mockResolvedValueOnce(busy)
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

describe('going back to the folder Manga2Ink picks', () => {
  it('asks for it, and shows its own places again', async () => {
    const user = userEvent.setup();
    const useDefaultProcessingFolder = vi.fn<Manga2InkBridge['useDefaultProcessingFolder']>(() =>
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

    expect(await screen.findByText('Chosen by Manga2Ink')).toBeVisible();
    expect(useDefaultProcessingFolder).toHaveBeenCalledOnce();
    expect(screen.getByText('2 books')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Use the default folder' })).toBeDisabled();
  });

  it('says so while a conversion is running, and stays where it is', async () => {
    const user = userEvent.setup();
    await renderTab({
      getProcessingFolder: answering(chosenProcessingStatus),
      useDefaultProcessingFolder: () => Promise.resolve(busy),
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

    expect(await screen.findByText('Reading where Manga2Ink works…')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Choose a folder…' })).not.toBeInTheDocument();
    answer.resolve({ ok: true, value: defaultProcessingStatus });
    expect(await screen.findByRole('button', { name: 'Choose a folder…' })).toBeVisible();
  });

  it('says it could not, and offers nothing to change, when the main process refuses', async () => {
    await renderTab({
      getProcessingFolder: () =>
        Promise.resolve(refusing('settings_load_failed', message('failure.settingsNotLoaded', {}))),
    });

    expect(await screen.findByText('The saved settings could not be loaded.')).toBeVisible();
    expect(screen.queryByText('Reading where Manga2Ink works…')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Choose a folder…' })).not.toBeInTheDocument();
  });

  it('says it could not when the main process does not answer', async () => {
    await renderTab({ getProcessingFolder: () => Promise.reject(new Error('gone')) });

    expect(await screen.findByText('Manga2Ink could not complete that action.')).toBeVisible();
  });

  it('takes no answer into account once the tab is gone', async () => {
    const answer = deferred<WorkflowResult<ProcessingFolderStatus>>();
    const view = render(
      <AppSettingsProvider bridge={inertBridge({ getProcessingFolder: () => answer.promise })}>
        <ProcessingTab />
      </AppSettingsProvider>,
    );
    await screen.findByText('Reading where Manga2Ink works…');

    view.unmount();
    answer.resolve({ ok: true, value: defaultProcessingStatus });

    await Promise.resolve();
    expect(screen.queryByText('Chosen by Manga2Ink')).not.toBeInTheDocument();
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

describe('what a queue does, chosen in the Processing tab', () => {
  const kept = (change: Partial<typeof defaultAppSettings>): Manga2InkBridge['loadAppSettings'] => {
    return () =>
      Promise.resolve({
        ok: true,
        value: {
          settings: { ...defaultAppSettings, language: 'en', ...change },
          language: 'en',
          unreadable: false,
        },
      });
  };
  const saving = (): ReturnType<typeof vi.fn<Manga2InkBridge['saveAppSettings']>> =>
    vi.fn<Manga2InkBridge['saveAppSettings']>(() =>
      Promise.resolve({ ok: true, value: { language: 'en' } }),
    );

  it('has both turned on to begin with, each said by what it does', async () => {
    await renderTab({ getProcessingFolder: answering(defaultProcessingStatus) });

    expect(screen.getByRole('heading', { name: 'While Manga2Ink converts' })).toBeVisible();
    const notify = screen.getByRole('checkbox', { name: 'Tell me when a long conversion ends' });
    const awake = screen.getByRole('checkbox', {
      name: 'Keep the computer awake while converting',
    });
    expect(notify).toBeChecked();
    expect(awake).toBeChecked();
    expect(notify).toHaveAccessibleDescription(
      'A system notification, only when the conversion took more than 30 seconds and no Manga2Ink window is in front. Clicking it brings the window back.',
    );
    expect(awake).toHaveAccessibleDescription(
      'The screen may still turn off, but the computer will not go to sleep and stop the conversion.',
    );
  });

  it('shows them as they were kept', async () => {
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      loadAppSettings: kept({ notifyWhenDone: false }),
    });

    expect(
      screen.getByRole('checkbox', { name: 'Tell me when a long conversion ends' }),
    ).not.toBeChecked();
    expect(
      screen.getByRole('checkbox', { name: 'Keep the computer awake while converting' }),
    ).toBeChecked();
  });

  it('keeps only the choice that was changed, and shows it changed once it is kept', async () => {
    const user = userEvent.setup();
    const saveAppSettings = saving();
    await renderTab({ getProcessingFolder: answering(defaultProcessingStatus), saveAppSettings });
    const notify = screen.getByRole('checkbox', { name: 'Tell me when a long conversion ends' });

    await user.click(notify);

    expect(saveAppSettings).toHaveBeenCalledExactlyOnceWith({ notifyWhenDone: false });
    await waitFor(() => {
      expect(notify).not.toBeChecked();
    });
    expect(
      screen.getByRole('checkbox', { name: 'Keep the computer awake while converting' }),
    ).toBeChecked();
  });

  it('keeps the other choice the same way, and can turn one back on', async () => {
    const user = userEvent.setup();
    const saveAppSettings = saving();
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      loadAppSettings: kept({ keepAwake: false }),
      saveAppSettings,
    });
    const awake = screen.getByRole('checkbox', {
      name: 'Keep the computer awake while converting',
    });
    expect(awake).not.toBeChecked();

    await user.click(awake);

    expect(saveAppSettings).toHaveBeenCalledExactlyOnceWith({ keepAwake: true });
    await waitFor(() => {
      expect(awake).toBeChecked();
    });
  });

  it('says the change could not be kept, and leaves the choice as it was; the message goes with the next one that is kept', async () => {
    const user = userEvent.setup();
    const saveAppSettings = vi
      .fn<Manga2InkBridge['saveAppSettings']>()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'settings_save_failed', said: message('failure.internal', {}) },
      })
      .mockResolvedValueOnce({ ok: true, value: { language: 'en' } });
    await renderTab({ getProcessingFolder: answering(defaultProcessingStatus), saveAppSettings });
    const notify = screen.getByRole('checkbox', { name: 'Tell me when a long conversion ends' });

    await user.click(notify);

    expect(await screen.findByText('The change could not be saved. Try again.')).toBeVisible();
    expect(notify).toBeChecked();
    await user.click(notify);
    await waitFor(() => {
      expect(
        screen.queryByText('The change could not be saved. Try again.'),
      ).not.toBeInTheDocument();
    });
    expect(notify).not.toBeChecked();
  });

  it('says it in Portuguese for a window in Portuguese', async () => {
    await renderTab({ getProcessingFolder: answering(defaultProcessingStatus) }, 'pt-BR');

    expect(screen.getByRole('heading', { name: 'Enquanto o Manga2Ink converte' })).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: 'Avisar quando uma conversão longa terminar' }),
    ).toHaveAccessibleDescription(
      'Uma notificação do sistema, só se a conversão levou mais de 30 segundos e nenhuma janela do Manga2Ink estiver em primeiro plano. Ao clicar nela, a janela volta.',
    );
    expect(
      screen.getByRole('checkbox', { name: 'Manter o computador acordado durante a conversão' }),
    ).toBeChecked();
  });
});

describe('how many conversions run at once, chosen in the Processing tab', () => {
  const kept = (change: Partial<typeof defaultAppSettings>): Manga2InkBridge['loadAppSettings'] => {
    return () =>
      Promise.resolve({
        ok: true,
        value: {
          settings: { ...defaultAppSettings, language: 'en', ...change },
          language: 'en',
          unreadable: false,
        },
      });
  };
  const saving = (): ReturnType<typeof vi.fn<Manga2InkBridge['saveAppSettings']>> =>
    vi.fn<Manga2InkBridge['saveAppSettings']>(() =>
      Promise.resolve({ ok: true, value: { language: 'en' } }),
    );
  /** What this computer says it can do: what automatic comes to, and the most that can be asked for. */
  const capacity = (automatic: number, most: number): Manga2InkBridge['getConversionCapacity'] => {
    return () => Promise.resolve({ ok: true, value: { automatic, most } });
  };
  /** The select, once the computer has said what it can do. */
  const parallelSelect = (name = 'Parallel conversions'): Promise<HTMLElement> =>
    screen.findByRole('combobox', { name });
  const optionsOf = (select: HTMLElement): (string | null)[] =>
    within(select)
      .getAllByRole('option')
      .map((option) => option.textContent);

  it('starts on the app’s own count, with the number it comes to here and the numbers up to what this computer can be asked for', async () => {
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      getConversionCapacity: capacity(3, 6),
    });

    const parallel = await parallelSelect();
    expect(parallel).toHaveValue('automatic');
    expect(optionsOf(parallel)).toEqual([
      'Automatic (3 on this computer)',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    expect(parallel).toHaveAccessibleDescription(
      'How many books of one title are converted at the same time. Automatic works it out from the processors and memory of this computer, and never comes to more than 3. The most you can choose depends on this computer too. More at once helps only on a computer with many processors, and uses more memory. It applies the next time you press Process.',
    );
  });

  it('offers fewer numbers on a smaller computer, and says what automatic comes to there', async () => {
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      getConversionCapacity: capacity(1, 2),
    });

    expect(optionsOf(await parallelSelect())).toEqual(['Automatic (1 on this computer)', '1', '2']);
  });

  it('shows the number that was kept', async () => {
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      getConversionCapacity: capacity(3, 6),
      loadAppSettings: kept({ parallelConversions: 2 }),
    });

    expect(await parallelSelect()).toHaveValue('2');
  });

  it('shows a number that was kept on a bigger computer as the most this one will do with it', async () => {
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      getConversionCapacity: capacity(1, 2),
      loadAppSettings: kept({ parallelConversions: 12 }),
    });

    expect(await parallelSelect()).toHaveValue('2');
  });

  it('keeps only the number that was chosen, as a number, and shows it once it is kept', async () => {
    const user = userEvent.setup();
    const saveAppSettings = saving();
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      getConversionCapacity: capacity(3, 6),
      saveAppSettings,
    });
    const parallel = await parallelSelect();

    await user.selectOptions(parallel, '5');

    expect(saveAppSettings).toHaveBeenCalledExactlyOnceWith({ parallelConversions: 5 });
    await waitFor(() => {
      expect(parallel).toHaveValue('5');
    });
    await user.selectOptions(parallel, 'automatic');
    expect(saveAppSettings).toHaveBeenLastCalledWith({ parallelConversions: 'automatic' });
  });

  it('says the change could not be kept, and leaves the number as it was', async () => {
    const user = userEvent.setup();
    const saveAppSettings = vi.fn<Manga2InkBridge['saveAppSettings']>().mockResolvedValue({
      ok: false,
      error: { code: 'settings_save_failed', said: message('failure.internal', {}) },
    });
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      getConversionCapacity: capacity(3, 6),
      saveAppSettings,
    });
    const parallel = await parallelSelect();

    await user.selectOptions(parallel, '2');

    expect(await screen.findByText('The change could not be saved. Try again.')).toBeVisible();
    expect(parallel).toHaveValue('automatic');
  });

  it('offers no number when the computer cannot say what it can do, and the app’s own count stays', async () => {
    await renderTab({
      getProcessingFolder: answering(defaultProcessingStatus),
      getConversionCapacity: () => Promise.reject(new Error('unreachable')),
    });

    // The rest of the tab is there, and the choice is not.
    expect(await screen.findByText('Chosen by Manga2Ink')).toBeVisible();
    expect(
      screen.getByRole('checkbox', { name: 'Keep the computer awake while converting' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('combobox', { name: 'Parallel conversions' }),
    ).not.toBeInTheDocument();
  });

  it('says it in Portuguese for a window in Portuguese', async () => {
    await renderTab(
      {
        getProcessingFolder: answering(defaultProcessingStatus),
        getConversionCapacity: capacity(3, 6),
      },
      'pt-BR',
    );

    const parallel = await parallelSelect('Conversões em paralelo');
    expect(optionsOf(parallel)[0]).toBe('Automático (3 neste computador)');
    expect(parallel).toHaveAccessibleDescription(
      'Quantos livros de um mesmo título são convertidos ao mesmo tempo. O Automático calcula pelos processadores e pela memória deste computador, e nunca passa de 3. O máximo que você pode escolher também depende deste computador. Mais ao mesmo tempo só ajuda em um computador com muitos processadores, e usa mais memória. Vale na próxima vez que você pressionar Processar.',
    );
  });
});
