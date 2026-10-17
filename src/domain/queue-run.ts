import type { RunOutcome } from './run-report';

/**
 * How a queue ended, as the window tells the main process: numbers and a yes or no, never a name or
 * a path (ADR 0065). A queue is one press of Process, from the click to the last item.
 */
export interface QueueRunSummary {
  /** Books made. */
  readonly books: number;
  /** Items, or titles of a library, that could not be converted. */
  readonly failures: number;
  /** Items left out, and books that came with a note. */
  readonly notes: number;
  /** The person stopped the queue. */
  readonly cancelled: boolean;
}

/**
 * A queue that took longer than this is told of when it ends, if no window of the app is in front:
 * a shorter one ends while the person is still looking at it.
 */
export const longQueueMs = 30_000;

/** Whether the end of a queue is told through the system: it was long, nobody is looking, and it is asked for. */
export function shouldNotify(situation: {
  readonly elapsedMs: number;
  readonly windowInFront: boolean;
  readonly enabled: boolean;
}): boolean {
  return situation.enabled && !situation.windowInFront && situation.elapsedMs > longQueueMs;
}

/** What a queue came to, as far as telling it goes. */
export type QueueEnding = 'done' | 'notes' | 'failures';

/**
 * What a queue came to, or nothing when there is nothing to tell: the person stopped it themselves,
 * or it made, left out and failed nothing. A failure outweighs a note, and a note a clean finish.
 */
export function endingOf(summary: QueueRunSummary): QueueEnding | undefined {
  if (summary.cancelled) return undefined;
  if (summary.failures > 0) return 'failures';
  if (summary.notes > 0) return 'notes';
  return summary.books > 0 ? 'done' : undefined;
}

/** What the window tells the main process about a queue that has ended, out of its report. */
export function summarizeRun<Artifact extends { readonly warnings?: readonly unknown[] }>(
  outcomes: readonly RunOutcome<Artifact>[],
  cancelled: boolean,
): QueueRunSummary {
  let books = 0;
  let failures = 0;
  let notes = 0;
  for (const outcome of outcomes) {
    books += outcome.artifacts.length;
    if (outcome.status === 'failed') failures += 1;
    if (outcome.status === 'skipped') notes += 1;
    notes += outcome.artifacts.filter((artifact) => (artifact.warnings?.length ?? 0) > 0).length;
  }
  return { books, failures, notes, cancelled };
}

/** What a queue that did nothing at all tells: there is nothing in it to be told. */
export const nothingMade: QueueRunSummary = Object.freeze({
  books: 0,
  failures: 0,
  notes: 0,
  cancelled: false,
});
