import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  conversionCapacity,
  conversionConcurrency,
  conversionsAtOnce,
  mostConversions,
} from '@/application/workflows/conversion-concurrency';
import { parallelChoices } from '@/domain/parallel-conversions';

describe('conversion concurrency', () => {
  it('keeps small machines at one worker', () => {
    expect(conversionConcurrency(4, 4 * 1024 ** 3)).toBe(1);
    expect(conversionConcurrency(2, 32 * 1024 ** 3)).toBe(1);
    expect(conversionConcurrency(12, 2 * 1024 ** 3)).toBe(1);
  });

  it('uses at most three workers when processors and memory allow it', () => {
    expect(conversionConcurrency(8, 8 * 1024 ** 3)).toBe(2);
    expect(conversionConcurrency(12, 32 * 1024 ** 3)).toBe(3);
    expect(conversionConcurrency(64, 128 * 1024 ** 3)).toBe(3);
  });
});

describe('conversions at once for what a person chose', () => {
  const small = { processors: 4, memoryBytes: 4 * 1024 ** 3 };
  const roomy = { processors: 12, memoryBytes: 32 * 1024 ** 3 };

  it('is what the machine allows for the app’s own count', () => {
    expect(conversionsAtOnce('automatic', small)).toBe(1);
    expect(conversionsAtOnce('automatic', { processors: 8, memoryBytes: 8 * 1024 ** 3 })).toBe(2);
    expect(conversionsAtOnce('automatic', roomy)).toBe(3);
  });

  it('is the number that was asked for, as far as this computer can be asked', () => {
    expect(conversionsAtOnce(2, roomy)).toBe(2);
    expect(conversionsAtOnce(6, roomy)).toBe(6);
    expect(conversionsAtOnce(1, small)).toBe(1);
    expect(conversionsAtOnce(2, small)).toBe(2);
  });

  it('is lowered to the most the computer can be asked for, as a number kept on a bigger one is', () => {
    // Twelve threads and 32 GiB: six is the most.
    expect(conversionsAtOnce(8, roomy)).toBe(6);
    expect(conversionsAtOnce(12, roomy)).toBe(6);
    // Four threads and 4 GiB: two is the most.
    expect(conversionsAtOnce(3, small)).toBe(2);
    expect(conversionsAtOnce(12, small)).toBe(2);
  });
});

describe('the most a computer can be asked to convert at once', () => {
  const gib = 1024 ** 3;

  it.each([
    // [processor threads, GiB of memory, the most]
    [1, 1, 1],
    [2, 1, 1],
    [3, 32, 1],
    [4, 4, 2],
    [8, 16, 4],
    [12, 32, 6],
    [12, 8, 4],
    [12, 2, 1],
    [24, 64, 12],
    [64, 128, 12],
    [128, 4, 2],
  ])(
    'is one conversion for each two threads and each two GiB: %i threads, %i GiB, at most %i',
    (processors, memory, most) => {
      expect(mostConversions({ processors, memoryBytes: memory * gib })).toBe(most);
    },
  );

  it('says what automatic comes to and the most, for the window', () => {
    expect(conversionCapacity({ processors: 12, memoryBytes: 32 * gib })).toEqual({
      automatic: 3,
      most: 6,
    });
    expect(conversionCapacity({ processors: 4, memoryBytes: 4 * gib })).toEqual({
      automatic: 1,
      most: 2,
    });
  });

  it('never has automatic come to more than the most, and never has a choice come to more than it or less than one', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 512 }),
        fc.integer({ min: 0, max: 1024 * 1024 }),
        (processors, mebibytes) => {
          const machine = { processors, memoryBytes: mebibytes * 1024 ** 2 };
          const { automatic, most } = conversionCapacity(machine);
          expect(most).toBeGreaterThanOrEqual(1);
          expect(automatic).toBeLessThanOrEqual(most);
          for (const choice of parallelChoices) {
            const done = conversionsAtOnce(choice, machine);
            expect(done).toBeGreaterThanOrEqual(1);
            expect(done).toBeLessThanOrEqual(most);
          }
        },
      ),
    );
  });
});
