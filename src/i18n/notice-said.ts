import type { Language } from '@/domain/app-settings';
import type { NoticeMessageValues } from '@/domain/messages/notice';

import { optionFieldsMessages } from './option-fields-messages';
import type { SaidFor } from './say';

/** What the person is told at the start about what could not be restored, in every language (ADR 0053). */
export const noticeSaid: Readonly<Record<Language, SaidFor<NoticeMessageValues>>> = {
  en: {
    'notice.settingsUnreadable': () =>
      'The saved settings could not be read, so the defaults are in use.',
    'notice.optionsReset': ({ options }) =>
      `Some saved options could not be used and are back to their defaults: ${options
        .map((option) => optionFieldsMessages.en.names[option])
        .join(', ')}.`,
    'notice.deviceFallback': ({ profile, name }) =>
      `The device profile ${profile} is not available, so ${name} is selected.`,
  },
  'pt-BR': {
    'notice.settingsUnreadable': () =>
      'Não foi possível ler as configurações salvas, então os padrões estão em uso.',
    'notice.optionsReset': ({ options }) =>
      `Algumas opções salvas não puderam ser usadas e voltaram aos padrões: ${options
        .map((option) => optionFieldsMessages['pt-BR'].names[option])
        .join(', ')}.`,
    'notice.deviceFallback': ({ profile, name }) =>
      `O perfil de dispositivo ${profile} não está disponível, então ${name} foi selecionado.`,
  },
};
