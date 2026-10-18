import type * as NodeOs from 'node:os';

import { describe, expect, it, vi } from 'vitest';

import { machineCapacity } from '@/main/machine';

const fake = vi.hoisted(() => ({ processors: 12, memory: 32 * 1024 ** 3 }));
vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof NodeOs>()),
  availableParallelism: () => fake.processors,
  totalmem: () => fake.memory,
}));

describe('what of this computer decides how many conversions it can run at once', () => {
  it('is the processor threads and the memory that the system says, asked each time', () => {
    expect(machineCapacity()).toEqual({ processors: 12, memoryBytes: 32 * 1024 ** 3 });

    fake.processors = 4;
    fake.memory = 8 * 1024 ** 3;

    expect(machineCapacity()).toEqual({ processors: 4, memoryBytes: 8 * 1024 ** 3 });
  });
});
