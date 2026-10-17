import { describe, expect, it } from 'vitest';

import {
  endingOf,
  longQueueMs,
  nothingMade,
  type QueueRunSummary,
  shouldNotify,
  summarizeRun,
} from '@/domain/queue-run';
import type { RunOutcome } from '@/domain/run-report';

const summary = (overrides: Partial<QueueRunSummary> = {}): QueueRunSummary => ({
  books: 2,
  failures: 0,
  notes: 0,
  cancelled: false,
  ...overrides,
});

describe('when the end of a queue is told through the system', () => {
  const asked = { elapsedMs: longQueueMs + 1, windowInFront: false, enabled: true };

  it('is told once a queue has taken more than thirty seconds, with nobody looking, when it is asked for', () => {
    expect(longQueueMs).toBe(30_000);
    expect(shouldNotify(asked)).toBe(true);
  });

  it('is not told of a queue that took thirty seconds or less, which ends while the person is looking', () => {
    expect(shouldNotify({ ...asked, elapsedMs: longQueueMs })).toBe(false);
    expect(shouldNotify({ ...asked, elapsedMs: 0 })).toBe(false);
  });

  it('is not told while a window of the app is in front', () => {
    expect(shouldNotify({ ...asked, windowInFront: true })).toBe(false);
  });

  it('is not told when the person turned it off', () => {
    expect(shouldNotify({ ...asked, enabled: false })).toBe(false);
  });
});

describe('what a queue came to, as far as telling it goes', () => {
  it('is done when books were made and nothing was left out or failed', () => {
    expect(endingOf(summary())).toBe('done');
  });

  it('has notes when something was left out or came with a note, and nothing failed', () => {
    expect(endingOf(summary({ notes: 1 }))).toBe('notes');
  });

  it('is failures when anything failed, whatever else came of it', () => {
    expect(endingOf(summary({ failures: 1 }))).toBe('failures');
    expect(endingOf(summary({ failures: 1, notes: 3, books: 0 }))).toBe('failures');
  });

  it('is nothing to tell when the person stopped it, or when it did nothing at all', () => {
    expect(endingOf(summary({ cancelled: true, failures: 2 }))).toBeUndefined();
    expect(endingOf(nothingMade)).toBeUndefined();
    expect(Object.isFrozen(nothingMade)).toBe(true);
  });
});

describe('summing up the report of a run', () => {
  type Book = { readonly warnings?: readonly string[] };
  const outcome = (
    status: RunOutcome<Book>['status'],
    artifacts: readonly Book[] = [],
  ): RunOutcome<Book> => ({ rowId: 'row', name: 'Series', status, artifacts });

  it('counts the books made, the items that failed, and the items left out', () => {
    expect(
      summarizeRun([outcome('done', [{}, {}]), outcome('failed'), outcome('skipped')], false),
    ).toEqual({ books: 2, failures: 1, notes: 1, cancelled: false });
  });

  it('counts a book that came with a warning as a note, and one with none, or an empty list, as nothing', () => {
    expect(
      summarizeRun(
        [outcome('done', [{ warnings: ['a'] }, { warnings: [] }, {}, { warnings: ['b', 'c'] }])],
        false,
      ),
    ).toEqual({ books: 4, failures: 0, notes: 2, cancelled: false });
  });

  it('keeps the books of a title that failed after making some', () => {
    expect(summarizeRun([outcome('failed', [{}])], false)).toEqual({
      books: 1,
      failures: 1,
      notes: 0,
      cancelled: false,
    });
  });

  it('says whether the person stopped it, and is empty for an empty report', () => {
    expect(summarizeRun([], true)).toEqual({ books: 0, failures: 0, notes: 0, cancelled: true });
    expect(summarizeRun([], false)).toEqual(nothingMade);
  });
});
