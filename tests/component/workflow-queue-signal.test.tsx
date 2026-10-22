import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { message } from '@/domain/message';
import { App } from '@/renderer/app';
import type { Manga2InkBridge } from '@/shared/runtime-info';

import { addFolder, bridge, installBridge, runButton } from './support/workflow';

afterEach(() => {
  Reflect.deleteProperty(window, 'manga2ink');
});

/** Everything the window tells the main process about the queue and the run, in the order it did. */
function recorded(overrides: Partial<Manga2InkBridge> = {}): {
  readonly calls: string[];
  readonly endQueue: ReturnType<typeof vi.fn<Manga2InkBridge['endQueue']>>;
  readonly bridge: Manga2InkBridge;
} {
  const calls: string[] = [];
  const endQueue = vi.fn<Manga2InkBridge['endQueue']>(() => {
    calls.push('end');
    return Promise.resolve({ ok: true, value: undefined });
  });
  return {
    calls,
    endQueue,
    bridge: bridge({
      beginQueue: () => {
        calls.push('begin');
        return Promise.resolve({ ok: true, value: 'queue-1' });
      },
      createPendingRun: () => {
        calls.push('pending folder');
        return Promise.resolve({ ok: true, value: 'pending-run' });
      },
      convert: () => {
        calls.push('convert');
        return Promise.resolve({
          ok: true,
          value: [{ id: 'a1', name: 'Offline Work.epub', bytes: 2048, format: 'epub' }],
        });
      },
      endQueue,
      ...overrides,
    }),
  };
}

describe('the queue the main process is told of', () => {
  it('begins at the click, before the pending folder is made, and ends once the books are there', async () => {
    const user = userEvent.setup();
    const { bridge: window_, calls, endQueue } = recorded();
    installBridge(window_);
    render(<App />);
    await addFolder(user);

    await user.click(await runButton(1));

    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    await waitFor(() => {
      expect(endQueue).toHaveBeenCalledOnce();
    });
    expect(calls).toEqual(['begin', 'pending folder', 'convert', 'end']);
    // How it went, in numbers: no name of a book and no path.
    expect(endQueue).toHaveBeenCalledExactlyOnceWith({
      token: 'queue-1',
      summary: { books: 1, failures: 0, notes: 0, cancelled: false },
    });
  });

  it('counts the item that could not be converted, and still ends', async () => {
    const user = userEvent.setup();
    const { bridge: window_, endQueue } = recorded({
      convert: () =>
        Promise.resolve({
          ok: false,
          error: { code: 'tool_failed', said: message('failure.internal', {}) },
        }),
    });
    installBridge(window_);
    render(<App />);
    await addFolder(user);

    await user.click(await runButton(1));

    await waitFor(() => {
      expect(endQueue).toHaveBeenCalledOnce();
    });
    expect(endQueue).toHaveBeenCalledWith({
      token: 'queue-1',
      summary: { books: 0, failures: 1, notes: 0, cancelled: false },
    });
  });

  it('says it was stopped when the person cancelled it, which is not told through the system', async () => {
    const user = userEvent.setup();
    const { bridge: window_, endQueue } = recorded({
      convert: () =>
        Promise.resolve({
          ok: false,
          error: { code: 'cancelled', said: message('failure.internal', {}) },
        }),
    });
    installBridge(window_);
    render(<App />);
    await addFolder(user);

    await user.click(await runButton(1));

    await waitFor(() => {
      expect(endQueue).toHaveBeenCalledOnce();
    });
    expect(endQueue.mock.calls[0]?.[0].summary.cancelled).toBe(true);
  });

  it('ends a queue that did nothing, without anything to tell, when the pending folder could not be made', async () => {
    const user = userEvent.setup();
    const {
      bridge: window_,
      endQueue,
      calls,
    } = recorded({
      createPendingRun: () =>
        Promise.resolve({
          ok: false,
          error: { code: 'no_room', said: message('failure.internal', {}) },
        }),
    });
    installBridge(window_);
    render(<App />);
    await addFolder(user);

    await user.click(await runButton(1));

    await waitFor(() => {
      expect(endQueue).toHaveBeenCalledOnce();
    });
    expect(calls).not.toContain('convert');
    expect(endQueue).toHaveBeenCalledWith({
      token: 'queue-1',
      summary: { books: 0, failures: 0, notes: 0, cancelled: false },
    });
  });

  it('converts all the same when the main process cannot be told, and has no end to tell', async () => {
    const user = userEvent.setup();
    const { bridge: window_, endQueue } = recorded({
      beginQueue: () => Promise.reject(new Error('the bridge is gone')),
    });
    installBridge(window_);
    render(<App />);
    await addFolder(user);

    await user.click(await runButton(1));

    expect(await screen.findByRole('heading', { name: '1 book ready' })).toBeVisible();
    expect(endQueue).not.toHaveBeenCalled();
  });
});
