import type { Language } from '@/domain/app-settings';
import type { NoticeMessageValues } from '@/domain/messages/notice';

import type { SaidFor } from './say';

/** What the person is told at the start about what could not be restored, in every language (ADR 0053). */
export const noticeSaid: Readonly<Record<Language, SaidFor<NoticeMessageValues>>> = {
  en: {
    'notice.settingsUnreadable': () =>
      'The saved settings could not be read, so the defaults are in use.',
    'notice.optionsReset': ({ options }) =>
      `Some saved options could not be used and are back to their defaults: ${options.join(', ')}.`,
  },
  'pt-BR': {
    'notice.settingsUnreadable': () =>
      'Não foi possível ler as configurações salvas, então os padrões estão em uso.',
    'notice.optionsReset': ({ options }) =>
      `Algumas opções salvas não puderam ser usadas e voltaram aos padrões: ${options.join(', ')}.`,
  },
};
