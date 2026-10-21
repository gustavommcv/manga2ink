import type { Language } from '@/domain/app-settings';
import type { ModeMessageValues } from '@/domain/messages/mode';

import { queueMessages } from './queue-messages';
import type { SaidFor } from './say';

/** Why a process cannot be chosen for an input, or changed, in every language (ADR 0053). */
export const modeSaid: Readonly<Record<Language, SaidFor<ModeMessageValues>>> = {
  en: {
    'mode.cbzIsOneVolume': () => 'A CBZ is already one volume, so there is nothing to join.',
    'mode.libraryGroupsFirst': () =>
      'A library is grouped title by title first, so it cannot skip joining volumes.',
    'mode.singleBookLocked': () =>
      `Turn off “${queueMessages.en.panel.singleBook.label}” to change this.`,
  },
  'pt-BR': {
    'mode.cbzIsOneVolume': () => 'Um CBZ já é um volume só, então não há o que juntar.',
    'mode.libraryGroupsFirst': () =>
      'Uma biblioteca é agrupada título por título primeiro, então não dá para pular a junção dos volumes.',
    'mode.singleBookLocked': () =>
      `Desligue “${queueMessages['pt-BR'].panel.singleBook.label}” para mudar isto.`,
  },
  ja: {
    'mode.cbzIsOneVolume': () => 'CBZ はすでに 1 巻なので、まとめる対象がありません。',
    'mode.libraryGroupsFirst': () =>
      'ライブラリは、まずタイトルごとに各話が巻にまとめられるため、巻をまとめる手順を省略できません。',
    'mode.singleBookLocked': () =>
      `これを変更するには、「${queueMessages.ja.panel.singleBook.label}」をオフにしてください。`,
  },
};
