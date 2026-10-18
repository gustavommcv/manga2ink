import { describe, expect, it } from 'vitest';

import { conversionLimit, type ConversionLimitSources } from '@/main/conversion-limit';
import type { ParallelChoice } from '@/domain/parallel-conversions';

const gib = 1024 ** 3;
const roomy = { processors: 12, memoryBytes: 32 * gib };
const small = { processors: 4, memoryBytes: 4 * gib };

function limitWith(
  overrides: Partial<ConversionLimitSources> = {},
): ReturnType<typeof conversionLimit> {
  return conversionLimit({
    running: () => [],
    chosen: () => 'automatic',
    machine: () => roomy,
    ...overrides,
  });
}

describe('how many books of a title are converted at once', () => {
  it('is what the machine allows when the app’s own count is chosen and no queue runs', () => {
    expect(limitWith()()).toBe(3);
    expect(limitWith({ machine: () => small })()).toBe(1);
  });

  it.each([
    [1, 1],
    [3, 3],
    [6, 6],
    [8, 6],
    [12, 6],
  ] as const)(
    'is the %i that was chosen, lowered to what the machine can be asked for (6 here), when no queue runs',
    (chosen, expected) => {
      expect(limitWith({ chosen: () => chosen })()).toBe(expected);
    },
  );

  it.each([
    [1, 1],
    [2, 2],
    [3, 2],
    [12, 2],
  ] as const)('is the %i that was chosen, lowered to 2 on a small machine', (chosen, expected) => {
    expect(limitWith({ chosen: () => chosen, machine: () => small })()).toBe(expected);
  });

  it('is what the queue that runs began with, and not what is chosen since', () => {
    expect(limitWith({ running: () => [2], chosen: () => 3 })()).toBe(2);
    expect(limitWith({ running: () => [5], chosen: () => 1 })()).toBe(5);
    expect(limitWith({ running: () => ['automatic'], chosen: () => 1 })()).toBe(3);
  });

  it('is the fewest of the queues that run together, since the memory they take adds up', () => {
    const running: ParallelChoice[] = [3, 2, 'automatic'];

    expect(limitWith({ running: () => running })()).toBe(2);
    expect(limitWith({ running: () => running, machine: () => small })()).toBe(1);
  });

  it('is worked out again each time it is asked, from the queues and the machine as they are then', () => {
    let running: readonly ParallelChoice[] = [];
    let machine = small;
    const limit = limitWith({ running: () => running, machine: () => machine });

    expect(limit()).toBe(1);
    machine = roomy;
    expect(limit()).toBe(3);
    running = [1];
    expect(limit()).toBe(1);
  });
});
