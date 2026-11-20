import { describe, expect, it } from 'vitest';

import { deviceName } from '@/i18n/device-names';

describe('device names', () => {
  it.each([
    ['en', 'Kindle 11th generation (2024)'],
    ['pt-BR', 'Kindle 11ª geração (2024)'],
    ['ja', 'Kindle 第11世代（2024）'],
  ] as const)('identifies the basic Kindle in %s', (language, label) => {
    expect(
      deviceName({ code: 'K11-2024', name: 'Kindle', year: 2024, generation: 11 }, language),
    ).toBe(label);
  });

  it.each([
    ['en', 'Kindle Paperwhite (2024, 12th generation)'],
    ['pt-BR', 'Kindle Paperwhite (2024, 12ª geração)'],
    ['ja', 'Kindle Paperwhite（2024、第12世代）'],
  ] as const)('keeps the commercial model name in %s', (language, label) => {
    expect(
      deviceName({ code: 'KPW6', name: 'Kindle Paperwhite', year: 2024, generation: 12 }, language),
    ).toBe(label);
  });

  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
  ] as const)('writes generation %s as %s in English', (generation, ordinal) => {
    expect(deviceName({ code: 'test', name: 'Kindle', year: 2024, generation }, 'en')).toBe(
      `Kindle ${ordinal} generation (2024)`,
    );
  });

  it.each([
    ['en', 'Kobo Clara BW (2024)'],
    ['pt-BR', 'Kobo Clara BW (2024)'],
    ['ja', 'Kobo Clara BW（2024）'],
  ] as const)('does not invent a generation in %s', (language, label) => {
    expect(deviceName({ code: 'KoC-bw', name: 'Kobo Clara BW', year: 2024 }, language)).toBe(label);
  });

  it.each([
    ['en', 'Kindle Scribe without Front Light (2026, 3rd generation)'],
    ['pt-BR', 'Kindle Scribe sem iluminação frontal (2026, 3ª geração)'],
    ['ja', 'Kindle Scribe フロントライトなし（2026、第3世代）'],
  ] as const)('translates the Scribe lighting variant in %s', (language, label) => {
    expect(
      deviceName(
        {
          code: 'KS3-no-front-light',
          name: 'Kindle Scribe without Front Light',
          year: 2026,
          generation: 3,
        },
        language,
      ),
    ).toBe(label);
  });

  it('keeps unknown or custom device names unchanged', () => {
    expect(deviceName({ code: 'OTHER', name: 'Other' }, 'en')).toBe('Other');
  });
});
