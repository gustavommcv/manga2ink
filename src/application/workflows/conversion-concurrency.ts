import {
  type ConversionCapacity,
  mostAutomaticConversions,
  mostParallelConversions,
  type ParallelChoice,
} from '@/domain/parallel-conversions';

/** What of a computer decides how many conversions it can run side by side. */
export interface MachineCapacity {
  readonly processors: number;
  readonly memoryBytes: number;
}

const gibibyte = 1024 ** 3;

/** A conservative limit for independent mangapress processes, each of which uses its own threads. */
export function conversionConcurrency(processors: number, memoryBytes: number): number {
  const perCpu = Math.max(1, Math.floor(processors / 4));
  const perMemory = Math.max(1, Math.floor(memoryBytes / (4 * gibibyte)));
  return Math.min(mostAutomaticConversions, perCpu, perMemory);
}

/**
 * The most that can be asked for on a computer (ADR 0068): one conversion for every two processor
 * threads, since one alone keeps more than two busy at every size that was measured and more than
 * that would only be fighting for them, and one for every two GiB of memory, which is several times
 * what one conversion took in the same measurement. Never more than `mostParallelConversions`, and
 * always at least one.
 */
export function mostConversions(machine: MachineCapacity): number {
  const perCpu = Math.max(1, Math.floor(machine.processors / 2));
  const perMemory = Math.max(1, Math.floor(machine.memoryBytes / (2 * gibibyte)));
  return Math.min(mostParallelConversions, perCpu, perMemory);
}

/** What the window is told of this computer: what "automatic" comes to, and the most it can be asked for. */
export function conversionCapacity(machine: MachineCapacity): ConversionCapacity {
  return {
    automatic: conversionConcurrency(machine.processors, machine.memoryBytes),
    most: mostConversions(machine),
  };
}

/**
 * How many books of a title are converted at once for what a person chose (ADR 0068): the count
 * above for "automatic", which is what the app did before there was a choice, or the number they
 * named, which may be more than "automatic" ever comes to but never more than this computer can be
 * asked for. A number that was kept on a bigger computer is lowered to this one's.
 */
export function conversionsAtOnce(choice: ParallelChoice, machine: MachineCapacity): number {
  return choice === 'automatic'
    ? conversionConcurrency(machine.processors, machine.memoryBytes)
    : Math.min(choice, mostConversions(machine));
}
