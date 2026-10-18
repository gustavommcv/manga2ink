import {
  conversionsAtOnce,
  type MachineCapacity,
} from '@/application/workflows/conversion-concurrency';
import type { ParallelChoice } from '@/domain/parallel-conversions';

/** What the limit is worked out from, so it can be tried without a computer or an app. */
export interface ConversionLimitSources {
  /** What each queue that is running asked for when it began. */
  readonly running: () => readonly ParallelChoice[];
  /** What is chosen now: for a conversion that no queue asked for. */
  readonly chosen: () => ParallelChoice;
  readonly machine: () => MachineCapacity;
}

/**
 * How many books of a title the workflow converts at once, asked every time it starts a title (ADR
 * 0068). It is what the queue that is running began with, so a change made meanwhile is for the next
 * queue and does not reach one that is already converting. Should more than one run, the fewest of
 * them is used, since the memory they take is added up. A conversion that no queue asked for uses
 * what is chosen now.
 */
export function conversionLimit(sources: ConversionLimitSources): () => number {
  return () => {
    const running = sources.running();
    const choices = running.length > 0 ? running : [sources.chosen()];
    const machine = sources.machine();
    return Math.min(...choices.map((choice) => conversionsAtOnce(choice, machine)));
  };
}
