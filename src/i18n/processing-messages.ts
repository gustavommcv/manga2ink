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
  /** What waits to be saved, and the clean-up of what has waited long (ADR 0061). */
  readonly waiting: {
    readonly title: string;
    readonly none: string;
    /** What is waiting: books, conversions, and the size, written by the window as the language writes it. */
    readonly summary: (books: number, runs: number, size: string) => string;
    readonly help: string;
    /** The label of the choice of days, said before it. */
    readonly cleanUp: string;
    readonly days: (days: number) => string;
    readonly delete: string;
    readonly nothingIdle: (days: number) => string;
    /** The question before anything is deleted: what goes, and that unsaved books are lost. */
    readonly question: (runs: number, books: number, size: string, days: number) => string;
    readonly confirm: string;
    readonly cancel: string;
    readonly deleted: (runs: number, size: string) => string;
    /** Said when what was found could not be deleted because it was being saved. */
    readonly inUse: string;
  };
  /** What a person chooses about a queue while it runs and when it ends (ADR 0065). */
  readonly queue: {
    readonly title: string;
    readonly notify: {
      readonly label: string;
      /** Says when the notification comes: `seconds` is how long a queue has to take. */
      readonly help: (seconds: number) => string;
    };
    readonly awake: { readonly label: string; readonly help: string };
    /** Said when a choice could not be kept. */
    readonly saveFailed: string;
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
    waiting: {
      title: 'Books waiting to be saved',
      none: 'No books are waiting.',
      summary: (books, runs, size) =>
        `${String(books)} ${countOf(books, 'book', 'books')} in ${String(runs)} ${countOf(runs, 'conversion', 'conversions')}, ${size}`,
      help: 'A conversion whose books are all saved is removed when Mangabound closes. The others stay until you save or delete them.',
      cleanUp: 'Delete what has waited, untouched, for more than',
      days: (days) => `${String(days)} days`,
      delete: 'Delete…',
      nothingIdle: (days) => `Nothing has waited for more than ${String(days)} days.`,
      question: (runs, books, size, days) =>
        `Delete ${String(runs)} ${countOf(runs, 'conversion', 'conversions')} (${String(books)} ${countOf(books, 'book', 'books')}, ${size}) that nothing has touched in more than ${String(days)} days? Books that were not saved yet will be lost.`,
      confirm: 'Delete',
      cancel: 'Keep them',
      deleted: (runs, size) =>
        `Deleted ${String(runs)} ${countOf(runs, 'conversion', 'conversions')}, ${size}.`,
      inUse: 'Nothing was deleted: what was found is being saved.',
    },
    queue: {
      title: 'While Mangabound converts',
      notify: {
        label: 'Tell me when a long conversion ends',
        help: (seconds) =>
          `A system notification, only when the conversion took more than ${String(seconds)} seconds and no Mangabound window is in front. Clicking it brings the window back.`,
      },
      awake: {
        label: 'Keep the computer awake while converting',
        help: 'The screen may still turn off, but the computer will not go to sleep and stop the conversion.',
      },
      saveFailed: 'The change could not be saved. Try again.',
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
    waiting: {
      title: 'Livros esperando para serem salvos',
      none: 'Nenhum livro está esperando.',
      summary: (books, runs, size) =>
        `${String(books)} ${countOf(books, 'livro', 'livros')} em ${String(runs)} ${countOf(runs, 'conversão', 'conversões')}, ${size}`,
      help: 'Uma conversão cujos livros foram todos salvos é removida quando o Mangabound fecha. As outras ficam até você salvar ou apagar.',
      cleanUp: 'Apagar o que espera, sem ser tocado, há mais de',
      days: (days) => `${String(days)} dias`,
      delete: 'Apagar…',
      nothingIdle: (days) => `Nada espera há mais de ${String(days)} dias.`,
      question: (runs, books, size, days) =>
        `Apagar ${String(runs)} ${countOf(runs, 'conversão', 'conversões')} (${String(books)} ${countOf(books, 'livro', 'livros')}, ${size}) que ninguém tocou há mais de ${String(days)} dias? Os livros que ainda não foram salvos serão perdidos.`,
      confirm: 'Apagar',
      cancel: 'Manter',
      deleted: (runs, size) =>
        `${String(runs)} ${countOf(runs, 'conversão apagada', 'conversões apagadas')}, ${size}.`,
      inUse: 'Nada foi apagado: o que foi encontrado está sendo salvo.',
    },
    queue: {
      title: 'Enquanto o Mangabound converte',
      notify: {
        label: 'Avisar quando uma conversão longa terminar',
        help: (seconds) =>
          `Uma notificação do sistema, só se a conversão levou mais de ${String(seconds)} segundos e nenhuma janela do Mangabound estiver em primeiro plano. Ao clicar nela, a janela volta.`,
      },
      awake: {
        label: 'Manter o computador acordado durante a conversão',
        help: 'A tela ainda pode apagar, mas o computador não vai dormir e interromper a conversão.',
      },
      saveFailed: 'Não foi possível salvar a mudança. Tente de novo.',
    },
  },
};
