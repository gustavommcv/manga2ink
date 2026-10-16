import { describe, expect, it } from 'vitest';

import { sizeOf } from '@/i18n/size';

const KB = 1024;
const GB = KB ** 3;

describe('how much room there is', () => {
  it('is written in the unit that keeps the number small', () => {
    expect(sizeOf('en', 0)).toBe('0 byte');
    expect(sizeOf('en', 900)).toBe('900 byte');
    expect(sizeOf('en', 3 * KB)).toBe('3 kB');
    expect(sizeOf('en', 50 * KB ** 2)).toBe('50 MB');
    expect(sizeOf('en', 38 * GB)).toBe('38 GB');
    expect(sizeOf('en', 2 * KB ** 4)).toBe('2 TB');
  });

  it('keeps a decimal place while the number is small, and drops it for a big one', () => {
    expect(sizeOf('en', 1.5 * GB)).toBe('1.5 GB');
    expect(sizeOf('en', 812.4 * GB)).toBe('812 GB');
  });

  it('writes the number as the language does', () => {
    expect(sizeOf('pt-BR', 1.5 * GB)).toBe('1,5 GB');
  });

  it('does not go past terabytes, and takes a negative number for none', () => {
    expect(sizeOf('en', 5000 * KB ** 4)).toMatch(/TB$/u);
    expect(sizeOf('en', -10)).toBe('0 byte');
  });
});
