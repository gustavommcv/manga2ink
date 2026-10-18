import { describe, expect, it } from 'vitest';

import {
  defaultParallelChoice,
  isParallelChoice,
  mostParallelConversions,
  parallelChoiceNamed,
  parallelChoices,
} from '@/domain/parallel-conversions';

describe('how many conversions run at once, as a person chooses it', () => {
  it('is the app’s own count or one, two or three, and starts on the app’s own count', () => {
    expect(parallelChoices).toEqual(['automatic', 1, 2, 3]);
    expect(defaultParallelChoice).toBe('automatic');
  });

  it('never goes past the most the app allows, which the numbers on offer end at', () => {
    expect(mostParallelConversions).toBe(3);
    expect(Math.max(...parallelChoices.filter((choice) => choice !== 'automatic'))).toBe(
      mostParallelConversions,
    );
  });

  it.each(['automatic', 1, 2, 3])('knows %s as a choice', (value) => {
    expect(isParallelChoice(value)).toBe(true);
  });

  it.each([0, 4, -1, 1.5, '2', 'Automatic', null, undefined, {}])('does not know %j', (value) => {
    expect(isParallelChoice(value)).toBe(false);
  });

  it('finds the choice that a text names, as the values of a list of options are texts', () => {
    expect(parallelChoices.map((choice) => parallelChoiceNamed(String(choice)))).toEqual([
      ...parallelChoices,
    ]);
    expect(parallelChoiceNamed('4')).toBeUndefined();
    expect(parallelChoiceNamed('')).toBeUndefined();
  });
});
