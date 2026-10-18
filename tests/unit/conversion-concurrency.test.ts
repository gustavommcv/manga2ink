import { describe, expect, it } from 'vitest';

import {
  conversionConcurrency,
  conversionsAtOnce,
} from '@/application/workflows/conversion-concurrency';

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

  it.each([1, 2, 3] as const)('is %i when that is what was asked for, on any machine', (asked) => {
    expect(conversionsAtOnce(asked, small)).toBe(asked);
    expect(conversionsAtOnce(asked, roomy)).toBe(asked);
  });
});
