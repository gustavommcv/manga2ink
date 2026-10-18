import { describe, expect, it } from 'vitest';

import {
  defaultParallelChoice,
  isParallelChoice,
  mostAutomaticConversions,
  parallelChoiceNamed,
  parallelChoices,
} from '@/domain/parallel-conversions';

describe('how many conversions run at once, as a person chooses it', () => {
  it('is the app’s own count or a number up to eight, and starts on the app’s own count', () => {
    expect(parallelChoices).toEqual(['automatic', 1, 2, 3, 4, 6, 8]);
    expect(defaultParallelChoice).toBe('automatic');
  });

  it('lets a person name more than the app’s own count ever comes to', () => {
    expect(mostAutomaticConversions).toBe(3);
    expect(Math.max(...parallelChoices.filter((choice) => choice !== 'automatic'))).toBeGreaterThan(
      mostAutomaticConversions,
    );
  });

  it.each(['automatic', 1, 2, 3, 4, 6, 8])('knows %s as a choice', (value) => {
    expect(isParallelChoice(value)).toBe(true);
  });

  it.each([0, 5, 7, 9, -1, 1.5, '2', 'Automatic', null, undefined, {}])(
    'does not know %j',
    (value) => {
      expect(isParallelChoice(value)).toBe(false);
    },
  );

  it('finds the choice that a text names, as the values of a list of options are texts', () => {
    expect(parallelChoices.map((choice) => parallelChoiceNamed(String(choice)))).toEqual([
      ...parallelChoices,
    ]);
    expect(parallelChoiceNamed('5')).toBeUndefined();
    expect(parallelChoiceNamed('')).toBeUndefined();
  });
});
