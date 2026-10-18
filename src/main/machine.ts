import { availableParallelism, totalmem } from 'node:os';

import type { MachineCapacity } from '@/application/workflows/conversion-concurrency';

/**
 * What of this computer decides how many conversions it can run at once, as it is now (ADR 0068):
 * the processor threads it has and the memory it has. It is the one place that asks the system, so
 * what the workflow does and what the window is told are of the same computer.
 */
export function machineCapacity(): MachineCapacity {
  return { processors: availableParallelism(), memoryBytes: totalmem() };
}
