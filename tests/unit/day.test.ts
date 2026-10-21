import { describe, expect, it } from 'vitest';

import { dayOf } from '@/i18n/day';

describe('the day of a release', () => {
  it('is written as the language writes dates', () => {
    expect(dayOf('en', '2026-10-20T10:00:00Z')).toBe('October 20, 2026');
    expect(dayOf('pt-BR', '2026-10-20T10:00:00Z')).toBe('20 de outubro de 2026');
    expect(dayOf('ja', '2026-10-20T10:00:00Z')).toBe('2026年10月20日');
  });

  it('is the day the release says, whatever time zone the computer is in', () => {
    // Midnight in UTC is still the evening before in much of the Americas.
    expect(dayOf('en', '2026-10-20T00:30:00Z')).toBe('October 20, 2026');
    expect(dayOf('en', '2026-10-20T23:30:00Z')).toBe('October 20, 2026');
  });

  it('is nothing when there is no date, or what there is is not one', () => {
    expect(dayOf('en', undefined)).toBeUndefined();
    expect(dayOf('pt-BR', 'sometime')).toBeUndefined();
    expect(dayOf('en', '')).toBeUndefined();
  });
});
