import type { Language } from '@/domain/app-settings';
import type { ModeMessageValues } from '@/domain/messages/mode';

import type { SaidFor } from './say';

/** Why a process cannot be chosen for an input, or changed, in every language (ADR 0053). */
export const modeSaid: Readonly<Record<Language, SaidFor<ModeMessageValues>>> = {
  en: {
    'mode.cbzIsOneVolume': () => 'A CBZ is already one volume, so there is nothing to join.',
    'mode.libraryGroupsFirst': () =>
      'A library is grouped title by title first, so it cannot skip joining volumes.',
    'mode.chaptersAreArchives': () =>
      'The chapters of this folder are CBZ files, so they have to be joined into volumes before they can be converted.',
  },
  'pt-BR': {
    'mode.cbzIsOneVolume': () => 'Um CBZ já é um volume só, então não há o que juntar.',
    'mode.libraryGroupsFirst': () =>
      'Uma biblioteca é agrupada título por título primeiro, então não dá para pular a junção dos volumes.',
    'mode.chaptersAreArchives': () =>
      'Os capítulos desta pasta são arquivos CBZ, então precisam ser juntados em volumes antes de serem convertidos.',
  },
  ja: {
    'mode.cbzIsOneVolume': () => 'CBZ はすでに 1 巻なので、まとめる対象がありません。',
    'mode.libraryGroupsFirst': () =>
      'ライブラリは、まずタイトルごとに各話が巻にまとめられるため、巻をまとめる手順を省略できません。',
    'mode.chaptersAreArchives': () =>
      'このフォルダーの各話は CBZ ファイルなので、変換する前に巻にまとめる必要があります。',
  },
};
