import type { Language } from '@/domain/app-settings';

import { countOf } from './count';

/** What the native dialogs of the operating system are given to say: their titles and filters. */
export interface DialogMessages {
  readonly chooseCover: { readonly title: string; readonly images: string };
  readonly chooseCoversFolder: { readonly title: string };
  readonly chooseFolders: { readonly title: string };
  readonly chooseFiles: { readonly title: string; readonly archive: string };
  readonly chooseLibrary: { readonly title: string; readonly button: string };
  readonly chooseProcessingFolder: { readonly title: string; readonly button: string };
  readonly saveBook: { readonly title: string };
  readonly saveAll: { readonly title: string };
  /** Asked before the app is closed while a conversion runs (ADR 0059). */
  readonly leaveWhileConverting: {
    readonly message: string;
    readonly detail: string;
    readonly keep: string;
    readonly leave: string;
  };
  /** Said by a notification when a long queue ends, with the window out of sight (ADR 0065). */
  readonly queueEnded: {
    readonly done: {
      readonly title: string;
      readonly body: (books: number) => string;
    };
    readonly notes: {
      readonly title: string;
      readonly body: (books: number) => string;
    };
    readonly failures: {
      readonly title: string;
      readonly body: (books: number, failures: number) => string;
    };
  };
}

/** The main process writes these, in the language the window is in (ADR 0052). */
export const dialogMessages: Readonly<Record<Language, DialogMessages>> = {
  en: {
    chooseCover: { title: 'Choose a cover', images: 'Images' },
    chooseCoversFolder: { title: 'Choose a folder of covers' },
    chooseFolders: { title: 'Choose manga folders' },
    chooseFiles: { title: 'Choose comic files', archive: 'Comic book archive' },
    chooseLibrary: { title: 'Choose a library to share', button: 'Use this folder' },
    chooseProcessingFolder: {
      title: 'Choose the folder Mangabound works in',
      button: 'Use this folder',
    },
    saveBook: { title: 'Save book as' },
    saveAll: { title: 'Save all books to a folder' },
    leaveWhileConverting: {
      message: 'A conversion is still running.',
      detail: 'If you close Mangabound now, it will be lost.',
      keep: 'Keep converting',
      leave: 'Close anyway',
    },
    queueEnded: {
      done: {
        title: 'Your books are ready',
        body: (books) =>
          `${String(books)} ${countOf(books, 'book', 'books')} ready to save in Mangabound.`,
      },
      notes: {
        title: 'Your books are ready, with notes',
        body: (books) =>
          `${String(books)} ${countOf(books, 'book', 'books')} ready. Open Mangabound to see the notes.`,
      },
      failures: {
        title: 'Some conversions failed',
        body: (books, failures) =>
          books === 0
            ? 'Nothing was made. Open Mangabound to see why.'
            : `${String(books)} ${countOf(books, 'book', 'books')} ready, ${String(failures)} ${countOf(failures, 'failure', 'failures')}. Open Mangabound to see why.`,
      },
    },
  },
  'pt-BR': {
    chooseCover: { title: 'Escolher uma capa', images: 'Imagens' },
    chooseCoversFolder: { title: 'Escolher uma pasta de capas' },
    chooseFolders: { title: 'Escolher pastas de mangá' },
    chooseFiles: { title: 'Escolher arquivos de quadrinhos', archive: 'Arquivo de quadrinhos' },
    chooseLibrary: {
      title: 'Escolher uma biblioteca para compartilhar',
      button: 'Usar esta pasta',
    },
    chooseProcessingFolder: {
      title: 'Escolher a pasta em que o Mangabound trabalha',
      button: 'Usar esta pasta',
    },
    saveBook: { title: 'Salvar livro como' },
    saveAll: { title: 'Salvar todos os livros em uma pasta' },
    leaveWhileConverting: {
      message: 'Há uma conversão em andamento.',
      detail: 'Se você fechar o Mangabound agora, ela será perdida.',
      keep: 'Continuar convertendo',
      leave: 'Fechar mesmo',
    },
    queueEnded: {
      done: {
        title: 'Seus livros estão prontos',
        body: (books) =>
          `${String(books)} ${countOf(books, 'livro pronto', 'livros prontos')} para salvar no Mangabound.`,
      },
      notes: {
        title: 'Seus livros estão prontos, com observações',
        body: (books) =>
          `${String(books)} ${countOf(books, 'livro pronto', 'livros prontos')}. Abra o Mangabound para ver as observações.`,
      },
      failures: {
        title: 'Algumas conversões falharam',
        body: (books, failures) =>
          books === 0
            ? 'Nada foi feito. Abra o Mangabound para ver o motivo.'
            : `${String(books)} ${countOf(books, 'livro pronto', 'livros prontos')}, ${String(failures)} ${countOf(failures, 'falha', 'falhas')}. Abra o Mangabound para ver o motivo.`,
      },
    },
  },
};
