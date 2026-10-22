import { describe, expect, it, vi } from 'vitest';

import type { QueueRunSummary } from '@/domain/queue-run';
import { beginQueue, endQueue } from '@/renderer/lib/queue-signal';
import type { Manga2InkBridge } from '@/shared/runtime-info';

type QueueBridge = Pick<Manga2InkBridge, 'beginQueue' | 'endQueue'>;

const summary: QueueRunSummary = { books: 2, failures: 1, notes: 0, cancelled: false };

describe('telling the main process that a queue has begun', () => {
  it('gives the token the main process answers with', async () => {
    const bridge: QueueBridge = {
      beginQueue: () => Promise.resolve({ ok: true, value: 'queue-1' }),
      endQueue: vi.fn(),
    };

    expect(await beginQueue(bridge)).toBe('queue-1');
  });

  it('goes on without one when the main process refuses, since the queue is converted all the same', async () => {
    const bridge: QueueBridge = {
      beginQueue: () =>
        Promise.resolve({ ok: false, error: { code: 'untrusted_sender', said: {} as never } }),
      endQueue: vi.fn(),
    };

    expect(await beginQueue(bridge)).toBeUndefined();
  });

  it('goes on without one when the call does not arrive', async () => {
    const bridge: QueueBridge = {
      beginQueue: () => Promise.reject(new Error('the bridge is gone')),
      endQueue: vi.fn(),
    };

    expect(await beginQueue(bridge)).toBeUndefined();
  });
});

describe('telling it that the queue has ended', () => {
  it('sends the token and how it went, and nothing else', async () => {
    const endQueueCall = vi.fn<QueueBridge['endQueue']>(() =>
      Promise.resolve({ ok: true, value: undefined }),
    );

    await endQueue({ beginQueue: vi.fn(), endQueue: endQueueCall }, 'queue-1', summary);

    expect(endQueueCall).toHaveBeenCalledExactlyOnceWith({ token: 'queue-1', summary });
  });

  it('tells nothing of a queue it never had a token for', async () => {
    const endQueueCall = vi.fn<QueueBridge['endQueue']>();

    await endQueue({ beginQueue: vi.fn(), endQueue: endQueueCall }, undefined, summary);

    expect(endQueueCall).not.toHaveBeenCalled();
  });

  it('is not a failure when the call does not arrive: the main process lets go of a window that is going', async () => {
    const bridge: QueueBridge = {
      beginQueue: vi.fn(),
      endQueue: () => Promise.reject(new Error('the bridge is gone')),
    };

    await expect(endQueue(bridge, 'queue-1', summary)).resolves.toBeUndefined();
  });
});
