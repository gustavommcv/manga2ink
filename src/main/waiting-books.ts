import type { PendingRun } from '@/adapters/library/fs-pending-runs';
import type { WaitingBooks } from '@/domain/pending-cleanup';

/** What a set of pending runs holds: how many conversions, how many books, how many bytes. */
export function waitingBooks(runs: readonly PendingRun[]): WaitingBooks {
  return {
    runs: runs.length,
    books: runs.reduce((total, run) => total + run.books.length, 0),
    bytes: runs.reduce(
      (total, run) => total + run.books.reduce((sum, book) => sum + book.entry.bytes, 0),
      0,
    ),
  };
}
