import { describe, expect, it } from 'vitest';

import type { ConversionProgress } from '@/domain/conversion';
import { isPageEvent, milestone } from '@/renderer/lib/announcements';
import { raw } from '@/domain/message';

const page: ConversionProgress = {
  stage: 'processing',
  message: raw('Processed page 3 of 50.'),
  page: 3,
  completed: 3,
  total: 50,
};

describe('isPageEvent', () => {
  it('is a message about one page, with a percentage to go with it', () => {
    expect(isPageEvent(page, 6)).toBe(true);
  });

  it('is not a message about a stage or a volume, which has no page', () => {
    expect(
      isPageEvent({ ...page, page: undefined, message: raw('1 of 3 volumes converted.') }, 33),
    ).toBe(false);
  });

  it('is not one when there is no percentage to tell instead', () => {
    expect(isPageEvent(page, undefined)).toBe(false);
  });

  it('is not one before anything was reported', () => {
    expect(isPageEvent(undefined, undefined)).toBe(false);
    expect(isPageEvent(undefined, 50)).toBe(false);
  });
});

describe('milestone', () => {
  it.each([
    [0, 0],
    [9, 0],
    [10, 10],
    [59, 50],
    [99, 90],
    [100, 100],
  ])('tells %i%% as the tenth %i%% it has reached', (percentage, told) => {
    expect(milestone(percentage)).toBe(told);
  });
});
