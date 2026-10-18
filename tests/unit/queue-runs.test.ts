import { describe, expect, it, vi } from 'vitest';

import { type QueueChoices, QueueRuns } from '@/main/queue-runs';

const choices: QueueChoices = {
  keepAwake: true,
  notifyWhenDone: true,
  parallelConversions: 'automatic',
};

function registry(): { readonly runs: QueueRuns; readonly time: { now: number } } {
  const time = { now: 1_000 };
  let counter = 0;
  const runs = new QueueRuns({
    now: () => time.now,
    newToken: () => `queue-${String(++counter)}`,
  });
  return { runs, time };
}

describe('the queues that are running', () => {
  it('has none until one begins, and is running while one is', () => {
    const { runs } = registry();

    expect(runs.running).toBe(false);
    const token = runs.begin(1, choices);

    expect(token).toBe('queue-1');
    expect(runs.running).toBe(true);
  });

  it('keeps counting while any of several is running, each with its own token', () => {
    const { runs } = registry();
    const first = runs.begin(1, choices);
    const second = runs.begin(1, choices);

    expect(first).not.toBe(second);
    runs.end(first);
    expect(runs.running).toBe(true);
    runs.end(second);
    expect(runs.running).toBe(false);
  });

  it('says how long a queue ran and whether its end is to be told, as they were when it began', () => {
    const { runs, time } = registry();
    const token = runs.begin(1, {
      keepAwake: false,
      notifyWhenDone: false,
      parallelConversions: 'automatic',
    });
    time.now += 45_000;

    expect(runs.end(token)).toEqual({ elapsedMs: 45_000, notifyWhenDone: false });
  });

  it('says nothing of a token that is not a queue that is running, or has ended already', () => {
    const { runs } = registry();
    const token = runs.begin(1, choices);

    expect(runs.end('never-given')).toBeUndefined();
    expect(runs.end(token)).toBeDefined();
    expect(runs.end(token)).toBeUndefined();
  });
});

describe('keeping the computer awake for the queues', () => {
  it('is wanted while a queue that asked for it is running, whatever the others asked', () => {
    const { runs } = registry();
    expect(runs.keepsAwake).toBe(false);

    const quiet = runs.begin(1, {
      keepAwake: false,
      notifyWhenDone: true,
      parallelConversions: 'automatic',
    });
    expect(runs.keepsAwake).toBe(false);
    const awake = runs.begin(1, {
      keepAwake: true,
      notifyWhenDone: true,
      parallelConversions: 'automatic',
    });
    expect(runs.keepsAwake).toBe(true);

    runs.end(awake);
    expect(runs.keepsAwake).toBe(false);
    runs.end(quiet);
  });
});

describe('how many are converted at once, for the queues', () => {
  it('is what each queue began with, for as long as it runs', () => {
    const { runs } = registry();
    expect(runs.parallelChoices).toEqual([]);

    const first = runs.begin(1, { ...choices, parallelConversions: 2 });
    runs.begin(1, { ...choices, parallelConversions: 'automatic' });

    expect(runs.parallelChoices).toEqual([2, 'automatic']);
    runs.end(first);
    expect(runs.parallelChoices).toEqual(['automatic']);
  });

  it('is not changed by changing the choices object it was given', () => {
    const { runs } = registry();
    const given = { ...choices, parallelConversions: 1 as const };
    runs.begin(1, given);

    (given as { parallelConversions: unknown }).parallelConversions = 3;

    expect(runs.parallelChoices).toEqual([1]);
  });
});

describe('letting go of queues', () => {
  it('lets go of the queues of a window and no others', () => {
    const { runs } = registry();
    runs.begin(1, choices);
    runs.begin(1, choices);
    const other = runs.begin(2, choices);

    runs.releaseOwner(1);

    expect(runs.running).toBe(true);
    expect(runs.end(other)).toBeDefined();
    expect(runs.running).toBe(false);
  });

  it('does not change anything for a window that has no queue', () => {
    const { runs } = registry();
    const listener = vi.fn();
    runs.begin(1, choices);
    runs.onChange(listener);

    runs.releaseOwner(7);

    expect(listener).not.toHaveBeenCalled();
    expect(runs.running).toBe(true);
  });

  it('lets go of every queue when the app quits, and says nothing when there is none', () => {
    const { runs } = registry();
    const listener = vi.fn();
    runs.onChange(listener);

    runs.releaseAll();
    expect(listener).not.toHaveBeenCalled();

    runs.begin(1, choices);
    runs.begin(2, choices);
    listener.mockClear();
    runs.releaseAll();

    expect(runs.running).toBe(false);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('calls the ones that listen when a queue begins, ends or is let go of', () => {
    const { runs } = registry();
    const listener = vi.fn();
    runs.onChange(listener);

    const token = runs.begin(1, choices);
    runs.end(token);
    runs.begin(1, choices);
    runs.releaseOwner(1);

    expect(listener).toHaveBeenCalledTimes(4);
  });
});
