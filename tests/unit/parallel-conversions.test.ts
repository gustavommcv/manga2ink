import { describe, expect, it } from 'vitest';

import {
  defaultParallelChoice,
  isParallelChoice,
  mostAutomaticConversions,
  mostParallelConversions,
  parallelChoiceNamed,
  parallelChoices,
} from '@/domain/parallel-conversions';

describe('how many conversions run at once, as a person chooses it', () => {
  it('is the app’s own count or a number up to twelve, and starts on the app’s own count', () => {
    expect(parallelChoices).toEqual(['automatic', 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(defaultParallelChoice).toBe('automatic');
  });

  it('ends at the most there ever is, which is more than the app’s own count ever comes to', () => {
    expect(mostParallelConversions).toBe(12);
    expect(Math.max(...parallelChoices.filter((choice) => choice !== 'automatic'))).toBe(
      mostParallelConversions,
    );
    expect(mostAutomaticConversions).toBe(3);
    expect(mostAutomaticConversions).toBeLessThan(mostParallelConversions);
  });

  it.each(parallelChoices)('knows %s as a choice', (value) => {
    expect(isParallelChoice(value)).toBe(true);
  });

  it.each([0, 13, 100, -1, 1.5, '2', 'Automatic', null, undefined, {}])(
    'does not know %j',
    (value) => {
      expect(isParallelChoice(value)).toBe(false);
    },
  );

  it('finds the choice that a text names, as the values of a list of options are texts', () => {
    expect(parallelChoices.map((choice) => parallelChoiceNamed(String(choice)))).toEqual([
      ...parallelChoices,
    ]);
    expect(parallelChoiceNamed('13')).toBeUndefined();
    expect(parallelChoiceNamed('')).toBeUndefined();
  });
});
