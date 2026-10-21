import type { Language } from '@/domain/app-settings';
import type { TextMessageValues } from '@/domain/messages/text';

import type { SaidFor } from './say';

/** Text someone else wrote is said as it is, in every language (ADR 0053). */
export const textSaid: Readonly<Record<Language, SaidFor<TextMessageValues>>> = {
  en: { 'text.raw': ({ text }) => text },
  'pt-BR': { 'text.raw': ({ text }) => text },
  ja: { 'text.raw': ({ text }) => text },
};
