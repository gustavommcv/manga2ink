import type { Language } from '@/domain/app-settings';
import type { InputMessageValues } from '@/domain/messages/input';

import { countOf } from './count';
import type { SaidFor } from './say';

/** Why something given to the queue was not added, in every language (ADR 0053). */
export const inputSaid: Readonly<Record<Language, SaidFor<InputMessageValues>>> = {
  en: {
    'input.unreadable': () => 'That item could not be read.',
    'input.onlyFoldersAndCbz': () => 'Only folders and .cbz files can be added.',
    'input.overLimit': ({ left, limit }) =>
      `Only the first ${String(limit)} items are added at once; ${String(left)} ${countOf(left, 'was', 'were')} left out.`,
  },
  'pt-BR': {
    'input.unreadable': () => 'Não foi possível ler esse item.',
    'input.onlyFoldersAndCbz': () => 'Só é possível adicionar pastas e arquivos .cbz.',
    'input.overLimit': ({ left, limit }) =>
      `Só os primeiros ${String(limit)} itens são adicionados de uma vez; ${String(left)} ${countOf(left, 'ficou', 'ficaram')} de fora.`,
  },
};
