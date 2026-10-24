import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMappingDraft } from '@/domain/mapping';
import { defaultMangaprepSettings } from '@/domain/output-profile';
import { App } from '@/renderer/app';
import { type Manga2InkBridge } from '@/shared/runtime-info';

import {
  addFolder,
  bridge,
  cbz,
  chapters,
  chooseToAdd,
  deferred,
  expectNoOutputFolderPicker,
  folder,
  installBridge,
  mapping,
  runButton,
} from './support/workflow';
import { message, raw } from '@/domain/message';

afterEach(() => {
  Reflect.deleteProperty(window, 'manga2ink');
});

describe('process control in the queue', () => {
  it('joins the volumes only: mangaprep is not run, its controls lock, and only defaults are sent', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<Manga2InkBridge['convert']>(() =>
      Promise.resolve({
        ok: true,
        value: [{ id: 'a1', name: 'Offline Work - Vol.01.cbz', bytes: 4096, format: 'cbz' }],
      }),
    );
    installBridge(bridge({ convert }));
    render(<App />);
    await addFolder(user);
    await user.click(screen.getByRole('radio', { name: 'PDF' }));

    await user.click(screen.getByRole('checkbox', { name: 'Convert for e-reader' }));

    expect(screen.getByLabelText('Device')).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'PDF' })).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: /Advanced conversion options/u }),
    ).not.toBeInTheDocument();
    expectNoOutputFolderPicker();
    await user.click(await runButton(1));

    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    expect(screen.getByText('Joined volumes · CBZ')).toBeVisible();
    // The PDF choice was for mangaprep, which did not run.
    expect(convert.mock.calls[0]?.[0]).toMatchObject({
      sessionId: 'session',
      libraryId: 'pending-run',
      mode: 'bind-only',
      settings: defaultMangaprepSettings,
      format: 'cbz',
      mapping,
    });
  });

  it('sends a folder straight to mangaprep as one book, without its volumes', async () => {
    const user = userEvent.setup();
    const planConversion = vi.fn<Manga2InkBridge['planConversion']>(() =>
      Promise.resolve({
        ok: true,
        value: {
          tool: 'mangaprep',
          title: 'Offline Work',
          message: message('plan.mangaprep', {
            profile: 'KV',
            width: 1072,
            height: 1448,
            chaptersNotGrouped: true,
          }),
          books: [{ name: 'Offline Work.epub', pageCount: 4 }],
          issues: [],
        },
      }),
    );
    const convert = vi.fn<Manga2InkBridge['convert']>(() =>
      Promise.resolve({
        ok: true,
        value: [{ id: 'a1', name: 'Offline Work.epub', bytes: 2048, format: 'epub' }],
      }),
    );
    installBridge(bridge({ convert, planConversion }));
    render(<App />);
    await addFolder(user);

    await user.click(screen.getByRole('checkbox', { name: 'Group chapters into volumes' }));

    expect(screen.getByText('One book')).toBeVisible();
    expect(screen.getByText(/2 chapters · not grouped/u)).toBeVisible();
    // The books of the series are still chosen where its chapters are grouped, whatever the steps are.
    expect(screen.getByRole('button', { name: 'Edit volumes for Offline Work' })).toBeVisible();

    expectNoOutputFolderPicker();
    await user.click(screen.getByRole('button', { name: 'Validate plan' }));
    expect(await screen.findByRole('heading', { name: 'Plan validated' })).toBeVisible();
    expect(planConversion.mock.calls[0]?.[0]).toMatchObject({ mode: 'convert-only' });
    expect(planConversion.mock.calls[0]?.[0].mapping).toBeUndefined();

    await user.click(await runButton(1));
    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    expect(convert.mock.calls[0]?.[0]).toMatchObject({
      mode: 'convert-only',
      settings: defaultMangaprepSettings,
      format: 'cbz',
    });
    expect(convert.mock.calls[0]?.[0].mapping).toBeUndefined();
  });

  it('leaves a folder as it is from the editor, which converts that folder and changes no step', async () => {
    const user = userEvent.setup();
    installBridge(bridge());
    render(<App />);
    await addFolder(user);

    await user.click(screen.getByRole('button', { name: 'Edit volumes for Offline Work' }));
    await user.click(await screen.findByRole('radio', { name: /Convert the folder as it is/u }));
    await user.click(screen.getByRole('button', { name: /Queue/u }));

    expect(await screen.findByRole('heading', { name: 'Queue' })).toBeVisible();
    // The steps are the queue's, and what one folder is is not theirs to say.
    expect(screen.getByRole('checkbox', { name: 'Group chapters into volumes' })).toBeChecked();
    expect(screen.getByText('One book')).toBeVisible();
  });

  it('leaves a CBZ out of a join-only run and says so, with nothing to fix', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<Manga2InkBridge['convert']>(() =>
      Promise.resolve({
        ok: true,
        value: [{ id: 'a1', name: 'Offline Work - Vol.01.cbz', bytes: 4096, format: 'cbz' }],
      }),
    );
    installBridge(
      bridge({
        convert,
        chooseInputs: () =>
          Promise.resolve({ ok: true, value: { inputs: [folder(), cbz], rejected: [] } }),
      }),
    );
    render(<App />);
    await chooseToAdd(user, 'Folder');
    await waitFor(() => {
      expect(screen.queryByText('Checking…')).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole('checkbox', { name: 'Convert for e-reader' }));
    expect(screen.getByText('Nothing to join')).toBeVisible();
    expectNoOutputFolderPicker();
    expect(
      screen.getByText('1 item will be left out. Use the pencil on a row to fix it.'),
    ).toBeVisible();
    await user.click(await runButton(1));

    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    expect(convert).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Standalone.cbz was skipped')).toBeVisible();
    expect(
      screen.getByText('A CBZ is already one volume, so there is nothing to join.'),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Fix Standalone.cbz' })).not.toBeInTheDocument();
    // The CBZ stays in the queue: it was not processed.
    await user.click(screen.getByRole('button', { name: 'Convert more' }));
    expect(screen.getByText('Standalone.cbz')).toBeVisible();
    expect(screen.queryByText('Offline Work')).not.toBeInTheDocument();
  });

  it('runs the queue one item at a time and keeps the ones that failed for another try', async () => {
    const user = userEvent.setup();
    const convert = vi
      .fn<Manga2InkBridge['convert']>()
      .mockResolvedValueOnce({
        ok: true,
        value: [{ id: 'a1', name: 'First.epub', bytes: 2048, format: 'epub' }],
      })
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'process_failed', said: raw('mangaprep crashed.') },
      });
    installBridge(
      bridge({
        convert,
        chooseInputs: () =>
          Promise.resolve({
            ok: true,
            value: {
              inputs: [folder('First', 'first'), folder('Second', 'second')],
              rejected: [],
            },
          }),
      }),
    );
    render(<App />);
    await addFolder(user);
    expectNoOutputFolderPicker();

    await user.click(await runButton(2));

    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    expect(convert.mock.calls.map(([command]) => command.sessionId)).toEqual([
      'session-first',
      'session-second',
    ]);
    expect(screen.getByText('Second could not be converted')).toBeVisible();
    expect(screen.getByText('mangaprep crashed.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Convert more' }));
    const list = screen.getByRole('list', { name: 'Queued items' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(1);
    expect(within(list).getByText('Second')).toBeVisible();
  });

  it('stops the queue at the item that was cancelled', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<Manga2InkBridge['convert']>(() =>
      Promise.resolve({
        ok: false,
        error: { code: 'cancelled', said: raw('The conversion was cancelled.') },
      }),
    );
    installBridge(
      bridge({
        convert,
        chooseInputs: () =>
          Promise.resolve({
            ok: true,
            value: {
              inputs: [folder('First', 'first'), folder('Second', 'second')],
              rejected: [],
            },
          }),
      }),
    );
    render(<App />);
    await addFolder(user);
    expectNoOutputFolderPicker();

    await user.click(await runButton(2));

    expect(await screen.findByRole('heading', { name: 'No books were produced' })).toBeVisible();
    expect(convert).toHaveBeenCalledOnce();
    expect(screen.getByText('First could not be converted')).toBeVisible();
  });

  it('keeps a user cancellation requested while the active input finishes successfully', async () => {
    const user = userEvent.setup();
    const completion = deferred<Awaited<ReturnType<Manga2InkBridge['convert']>>>();
    const convert = vi.fn<Manga2InkBridge['convert']>(() => completion.promise);
    const releaseInput = vi.fn<Manga2InkBridge['releaseInput']>(() =>
      Promise.resolve({ ok: true, value: undefined }),
    );
    installBridge(
      bridge({
        convert,
        releaseInput,
        chooseInputs: () =>
          Promise.resolve({
            ok: true,
            value: { inputs: [folder('First', 'first'), folder('Second', 'second')], rejected: [] },
          }),
      }),
    );
    render(<App />);
    await addFolder(user);
    await user.click(await runButton(2));
    await user.click(await screen.findByRole('button', { name: 'Cancel conversion' }));
    await act(async () => {
      completion.resolve({
        ok: true,
        value: [{ id: 'first-book', name: 'First.epub', bytes: 2048, format: 'epub' }],
      });
      await completion.promise;
    });

    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    expect(convert).toHaveBeenCalledOnce();
    expect(screen.queryByText('Second was skipped')).not.toBeInTheDocument();
    expect(releaseInput).toHaveBeenCalledExactlyOnceWith('session-first');
    await user.click(screen.getByRole('button', { name: 'Convert more' }));
    const queue = screen.getByRole('list', { name: 'Queued items' });
    expect(within(queue).getByText('Second')).toBeVisible();
    expect(within(queue).queryByText('First')).not.toBeInTheDocument();
  });

  it('cancels the item that is running when Cancel is pressed the instant the next one starts', async () => {
    const user = userEvent.setup();
    const first = deferred<Awaited<ReturnType<Manga2InkBridge['convert']>>>();
    const second = deferred<Awaited<ReturnType<Manga2InkBridge['convert']>>>();
    const cancelConversion = vi.fn<Manga2InkBridge['cancelConversion']>(() =>
      Promise.resolve({ ok: true, value: undefined }),
    );
    const convert = vi.fn<Manga2InkBridge['convert']>(() => {
      if (convert.mock.calls.length === 2) {
        // The screen has not been drawn again for this item yet, so the button is still the one
        // of the item before it: Cancel is pressed in the instant between the two.
        screen.getByRole('button', { name: 'Cancel conversion' }).click();
        return second.promise;
      }
      return first.promise;
    });
    installBridge(
      bridge({
        convert,
        cancelConversion,
        chooseInputs: () =>
          Promise.resolve({
            ok: true,
            value: { inputs: [folder('First', 'first'), folder('Second', 'second')], rejected: [] },
          }),
      }),
    );
    render(<App />);
    await addFolder(user);
    await user.click(await runButton(2));
    await screen.findByRole('button', { name: 'Cancel conversion' });

    await act(async () => {
      first.resolve({
        ok: true,
        value: [{ id: 'first-book', name: 'First.epub', bytes: 2048, format: 'epub' }],
      });
      await first.promise;
    });

    await waitFor(() => {
      expect(convert).toHaveBeenCalledTimes(2);
    });
    // It is the second item that is told to stop, not the first, which has finished.
    expect(cancelConversion).toHaveBeenCalledExactlyOnceWith(convert.mock.calls[1]![0].jobId);
    expect(convert.mock.calls[1]![0].jobId).not.toBe(convert.mock.calls[0]![0].jobId);
    second.resolve({ ok: true, value: [] });
  });

  it('offers to fix a folder that was left out, and opens its volumes', async () => {
    const user = userEvent.setup();
    installBridge(
      bridge({
        chooseInputs: () =>
          Promise.resolve({
            ok: true,
            value: {
              inputs: [folder('Good', 'good'), folder('Loose', 'loose')],
              rejected: [],
            },
          }),
        inspectInput: (id) =>
          Promise.resolve({
            ok: true,
            value: {
              sessionId: `session-${id}`,
              displayName: id,
              kind: 'folder',
              mapping:
                id === 'loose' ? createMappingDraft({ mangaTitle: 'Loose', chapters }) : mapping,
              issues: [],
            },
          }),
      }),
    );
    render(<App />);
    await addFolder(user);
    expectNoOutputFolderPicker();
    expect(
      screen.getByText('1 item will be left out. Use the pencil on a row to fix it.'),
    ).toBeVisible();

    await user.click(await runButton(1));

    expect(await screen.findByText('Loose was skipped')).toBeVisible();
    expect(
      screen.getByText(
        'No volumes yet. Open Edit volumes to group the chapters, or make one book of the whole series.',
      ),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Fix Loose' }));
    expect(await screen.findByRole('button', { name: 'Confirm mapping' })).toBeVisible();
  });

  it('keeps a queue of only CBZ files on its one process', async () => {
    const user = userEvent.setup();
    installBridge(
      bridge({
        chooseInputs: () => Promise.resolve({ ok: true, value: { inputs: [cbz], rejected: [] } }),
      }),
    );
    render(<App />);
    await chooseToAdd(user, 'Files');
    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeVisible();
    });

    // Neither step can change: one is meaningless for a CBZ and the other is the only one left.
    expect(screen.getByRole('checkbox', { name: 'Group chapters into volumes' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Convert for e-reader' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Convert for e-reader' })).toBeChecked();
    expect(screen.getByText('Keep at least one step on.')).toBeVisible();
  });

  it('never locks the steps for a series made into one book: the choice is the series’, and the steps are the queue’s', async () => {
    const user = userEvent.setup();
    installBridge(bridge());
    render(<App />);
    await addFolder(user);

    await user.click(screen.getByRole('button', { name: 'Edit volumes for Offline Work' }));
    await user.click(await screen.findByRole('radio', { name: /One book for the whole series/u }));
    await user.click(screen.getByRole('button', { name: /Queue/u }));

    expect(await screen.findByText('Whole series', { selector: 'span' })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: 'Group chapters into volumes' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Convert for e-reader' })).toBeEnabled();
    for (const format of ['CBZ', 'EPUB', 'PDF']) {
      expect(screen.getByRole('radio', { name: format })).toBeEnabled();
    }
    expect(screen.queryByText(/to change this/u)).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Books' })).not.toBeInTheDocument();
  });

  it('says what the one book is in the format it will be made in, where it is chosen', async () => {
    const user = userEvent.setup();
    installBridge(bridge());
    render(<App />);
    await addFolder(user);

    const notes = {
      CBZ: 'One CBZ for the whole series, with the chapters (and the volumes) as folders. It has no table of contents.',
      EPUB: 'One EPUB for the whole series, with its chapters (and its volumes, if it has them) in the table of contents. It needs no volumes.',
      PDF: 'One PDF for the whole series, with the pages in order and bookmarks for the chapters (and the volumes).',
    };
    for (const [format, note] of Object.entries(notes)) {
      await user.click(screen.getByRole('radio', { name: format }));
      await user.click(screen.getByRole('button', { name: 'Edit volumes for Offline Work' }));
      expect(await screen.findByText(note)).toBeVisible();
      await user.click(screen.getByRole('button', { name: /Queue/u }));
      await screen.findByRole('heading', { name: 'Queue' });
    }
  });

  it('has no choice of books for a comic file, which is one book already', async () => {
    const user = userEvent.setup();
    installBridge(
      bridge({
        chooseInputs: () => Promise.resolve({ ok: true, value: { inputs: [cbz], rejected: [] } }),
      }),
    );
    render(<App />);
    await chooseToAdd(user, 'Files');
    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeVisible();
    });

    expect(screen.queryByRole('button', { name: /Edit volumes/u })).not.toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: 'Books' })).not.toBeInTheDocument();
  });

  it('makes one book of a folder next to a comic file, which is converted as it is', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<Manga2InkBridge['convert']>(bridge().convert);
    installBridge(
      bridge({
        convert,
        chooseInputs: () =>
          Promise.resolve({ ok: true, value: { inputs: [folder(), cbz], rejected: [] } }),
      }),
    );
    render(<App />);
    await chooseToAdd(user, 'Files');
    await waitFor(() => {
      expect(screen.getByText('Ready')).toBeVisible();
    });
    await user.click(screen.getByRole('button', { name: 'Edit volumes for Offline Work' }));
    await user.click(await screen.findByRole('radio', { name: /One book for the whole series/u }));
    await user.click(screen.getByRole('button', { name: /Queue/u }));

    await user.click(await runButton(2));
    await screen.findByRole('heading', { name: /books? ready/u });

    const sent = new Map(convert.mock.calls.map(([command]) => [command.sessionId, command]));
    expect(sent.get('session')?.singleBook).toBe(true);
    expect(sent.get('cbz-session')?.singleBook).toBe(false);
  });
});
