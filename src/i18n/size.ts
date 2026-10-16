import type { Language } from '@/domain/app-settings';

const units = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const;

/**
 * How much room there is, in the unit that keeps the number small, and as the language writes
 * numbers: "1.5 GB" and "1,5 GB". A kilobyte is 1024 bytes, as a file manager counts it.
 */
export function sizeOf(language: Language, bytes: number): string {
  let value = Math.max(0, bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return new Intl.NumberFormat(language, {
    style: 'unit',
    // The loop above never leaves the list.
    unit: units[unit] as (typeof units)[number],
    unitDisplay: 'short',
    maximumFractionDigits: value >= 100 || unit === 0 ? 0 : 1,
  }).format(value);
}
