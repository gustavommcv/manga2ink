import type { Language } from '@/domain/app-settings';

/**
 * The day of an ISO date and time as the language writes dates ("October 20, 2026" and "20 de outubro
 * de 2026"), in UTC so that it is the day the release says whatever the time zone of the computer is.
 * `undefined` when there is no date, or what there is is not one.
 */
export function dayOf(language: Language, isoDate: string | undefined): string | undefined {
  if (isoDate === undefined) return undefined;
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat(language, { dateStyle: 'long', timeZone: 'UTC' }).format(date);
}
