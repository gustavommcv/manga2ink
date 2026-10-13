import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '@/renderer/app';
import { type MangaboundBridge } from '@/shared/runtime-info';
import { type PendingRunSummary, type WorkflowResult } from '@/shared/workflow-contract';

import { addFolder, bridge, installBridge, runButton } from './support/workflow';

afterEach(() => {
  Reflect.deleteProperty(window, 'mangabound');
});

const refusal = (code: string, message: string): WorkflowResult<never> => ({
  ok: false,
  error: { code, message },
});

const recovered: readonly PendingRunSummary[] = [
  {
    libraryId: 'recovered-run',
    createdAt: 1_000,
    artifacts: [
      { id: 'first-book', name: 'First.epub', bytes: 1024, format: 'epub', saved: false },
      { id: 'second-book', name: 'Second.epub', bytes: 2048, format: 'epub', saved: false },
    ],
  },
];

describe('what the person is told when the main process refuses', () => {
  it('says why a run could not start, and starts no conversion', async () => {
    const user = userEvent.setup();
    const convert = vi.fn<MangaboundBridge['convert']>();
    installBridge(
      bridge({
        convert,
        createPendingRun: () =>
          Promise.resolve(
            refusal('pending_unavailable', 'The folder for ready books cannot be written.'),
          ),
      }),
    );
    render(<App />);
    await addFolder(user);

    await user.click(await runButton(1));

    expect(await screen.findByText('The folder for ready books cannot be written.')).toBeVisible();
    expect(convert).not.toHaveBeenCalled();
    // Nothing was lost: the queue is still there, to be run again.
    expect(screen.getByRole('button', { name: 'Remove Offline Work' })).toBeVisible();
  });

  it('says why a book could not be saved, and leaves it unsaved', async () => {
    const user = userEvent.setup();
    const saveArtifactAs = vi.fn<MangaboundBridge['saveArtifactAs']>(() =>
      Promise.resolve(refusal('save_failed', 'There is no room left on that disk.')),
    );
    installBridge(
      bridge({
        saveArtifactAs,
        listPendingRuns: () => Promise.resolve({ ok: true, value: recovered }),
      }),
    );
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'View books from First.epub' }));

    await user.click(screen.getByRole('button', { name: 'Save First.epub as' }));

    expect(await screen.findByText('There is no room left on that disk.')).toBeVisible();
    expect(saveArtifactAs).toHaveBeenCalledExactlyOnceWith('first-book');
    expect(screen.getAllByText(/ · Not saved yet$/u)).toHaveLength(2);
  });

  it('says why the books could not be saved together, and leaves every one unsaved', async () => {
    const user = userEvent.setup();
    const saveAllArtifacts = vi.fn<MangaboundBridge['saveAllArtifacts']>(() =>
      Promise.resolve(refusal('save_failed', 'The folder cannot be written to.')),
    );
    installBridge(
      bridge({
        saveAllArtifacts,
        listPendingRuns: () => Promise.resolve({ ok: true, value: recovered }),
      }),
    );
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'View books from First.epub' }));

    await user.click(screen.getByRole('button', { name: 'Save all to folder…' }));

    expect(await screen.findByText('The folder cannot be written to.')).toBeVisible();
    expect(saveAllArtifacts).toHaveBeenCalledExactlyOnceWith(['first-book', 'second-book']);
    expect(screen.getAllByText(/ · Not saved yet$/u)).toHaveLength(2);
  });
});
