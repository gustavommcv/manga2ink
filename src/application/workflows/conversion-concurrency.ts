import { mostParallelConversions, type ParallelChoice } from '@/domain/parallel-conversions';

/** What of a computer decides how many conversions it can run side by side. */
export interface MachineCapacity {
  readonly processors: number;
  readonly memoryBytes: number;
}

/** A conservative limit for independent mangapress processes, each of which uses its own threads. */
export function conversionConcurrency(processors: number, memoryBytes: number): number {
  const perCpu = Math.max(1, Math.floor(processors / 4));
  const perMemory = Math.max(1, Math.floor(memoryBytes / (4 * 1024 ** 3)));
  return Math.min(mostParallelConversions, perCpu, perMemory);
}

/**
 * How many books of a title are converted at once for what a person chose (ADR 0068): the number
 * they named, which is theirs to ask for whatever the computer is, or the count above for
 * "automatic", which is what the app did before there was a choice.
 */
export function conversionsAtOnce(choice: ParallelChoice, machine: MachineCapacity): number {
  return choice === 'automatic'
    ? conversionConcurrency(machine.processors, machine.memoryBytes)
    : choice;
}
