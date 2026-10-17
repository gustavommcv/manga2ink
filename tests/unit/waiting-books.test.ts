import { describe, expect, it } from 'vitest';

import type { PendingRun } from '@/adapters/library/fs-pending-runs';
import { waitingBooks } from '@/main/waiting-books';
import { idleDays } from '@/domain/pending-cleanup';
import { idleDaysCommandSchema } from '@/shared/pending-cleanup-contract';

const run = (id: string, sizes: readonly number[]): PendingRun => ({
  id,
  path: `/pending/${id}`,
  createdAt: 1,
  books: sizes.map((bytes, index) => ({
    entry: {
      relativePath: `${String(index)}.epub`,
      title: 'Book',
      author: 'A',
      format: 'epub',
      bytes,
      convertedAt: '2026-10-16T00:00:00.000Z',
    },
    path: `/pending/${id}/${String(index)}.epub`,
  })),
});

describe('what waits to be saved', () => {
  it('is nothing for no runs', () => {
    expect(waitingBooks([])).toEqual({ runs: 0, books: 0, bytes: 0 });
  });

  it('counts the conversions, the books in them and their bytes', () => {
    expect(waitingBooks([run('a', [10, 20]), run('b', [300])])).toEqual({
      runs: 2,
      books: 3,
      bytes: 330,
    });
  });
});

describe('the days a clean-up can be asked for', () => {
  it('is every one the window offers, and no other', () => {
    expect(idleDays).toEqual([7, 30, 90]);
  });

  it.each([7, 30, 90])('accepts %s', (days) => {
    expect(idleDaysCommandSchema.parse({ days })).toEqual({ days });
  });

  it.each([[0], [1], [31], [-30], ['30'], [null], [undefined]])('refuses %s', (days) => {
    expect(idleDaysCommandSchema.safeParse({ days }).success).toBe(false);
  });
});
