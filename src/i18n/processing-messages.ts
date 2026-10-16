import type { Language } from '@/domain/app-settings';

import { countOf } from './count';

/** The words of the Processing tab of the app settings (ADR 0056). */
export interface ProcessingMessages {
  /** What the folder is for, under the name of the tab. */
  readonly description: string;
  readonly folder: string;
  /** What the folder is while nobody has chosen one. */
  readonly automatic: string;
  /** Where volumes are built while converting. */
  readonly scratch: string;
  /** Where finished books wait until they are saved. */
  readonly pending: string;
  readonly free: string;
  readonly choose: string;
  readonly useDefault: string;
  /** What is said under the buttons about what a change does. */
  readonly help: string;
  /** Said when the folder that was chosen is not there. */
  readonly unavailable: string;
  readonly loading: string;
  readonly earlier: {
    readonly title: string;
    /** Said under the list of folders that books are still waiting in. */
    readonly help: string;
    readonly books: (count: number) => string;
  };
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const processingMessages: Readonly<Record<Language, ProcessingMessages>> = {
  en: {
    description:
      'Where Mangabound builds volumes while it converts, and where finished books wait until you save them. A drive with plenty of room helps with long series.',
    folder: 'Working folder',
    automatic: 'Chosen by Mangabound',
    scratch: 'Volumes while converting',
    pending: 'Finished books, until saved',
    free: 'Free space',
    choose: 'Choose a folder…',
    useDefault: 'Use the default folder',
    help: 'Mangabound makes Pending and Scratch inside the folder you choose. The next conversions use it; books already waiting stay where they are and stay in the list.',
    unavailable:
      'The working folder is not available. Connect its drive again, or choose another folder: nothing can be converted until then.',
    loading: 'Reading where Mangabound works…',
    earlier: {
      title: 'Still waiting in earlier folders',
      help: 'Save or delete these books from the list on the queue page. Once none is left in a folder, Mangabound stops looking there.',
      books: (count) => `${String(count)} ${countOf(count, 'book', 'books')}`,
    },
  },
  'pt-BR': {
    description:
      'Onde o Mangabound monta os volumes enquanto converte e onde os livros prontos esperam até você salvá-los. Um disco com bastante espaço ajuda com séries longas.',
    folder: 'Pasta de trabalho',
    automatic: 'Escolhida pelo Mangabound',
    scratch: 'Volumes durante a conversão',
    pending: 'Livros prontos, até serem salvos',
    free: 'Espaço livre',
    choose: 'Escolher uma pasta…',
    useDefault: 'Usar a pasta padrão',
    help: 'O Mangabound cria Pending e Scratch dentro da pasta que você escolher. As próximas conversões a usam; os livros que já estão esperando ficam onde estão e continuam na lista.',
    unavailable:
      'A pasta de trabalho não está disponível. Conecte o disco dela de novo ou escolha outra pasta: nada pode ser convertido até lá.',
    loading: 'Lendo onde o Mangabound trabalha…',
    earlier: {
      title: 'Ainda esperando em pastas anteriores',
      help: 'Salve ou apague esses livros pela lista da página da fila. Quando não sobrar nenhum em uma pasta, o Mangabound deixa de procurar nela.',
      books: (count) => `${String(count)} ${countOf(count, 'livro', 'livros')}`,
    },
  },
};
