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
  /**
   * Said before the window opens, when Mangabound is still open the first time Manga2Ink starts and
   * its settings cannot move yet (ADR 0085).
   */
  readonly formerAppOpen: { readonly title: string; readonly text: string };
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
      title: 'Choose the folder Manga2Ink works in',
      button: 'Use this folder',
    },
    saveBook: { title: 'Save book as' },
    saveAll: { title: 'Save all books to a folder' },
    leaveWhileConverting: {
      message: 'A conversion is still running.',
      detail: 'If you close Manga2Ink now, it will be lost.',
      keep: 'Keep converting',
      leave: 'Close anyway',
    },
    formerAppOpen: {
      title: 'Close Mangabound first',
      text: 'Manga2Ink is the new name of Mangabound. The first time it opens, it takes Mangabound’s settings, which it cannot do while Mangabound is open. Close Mangabound, then open Manga2Ink again.',
    },
    queueEnded: {
      done: {
        title: 'Your books are ready',
        body: (books) =>
          `${String(books)} ${countOf(books, 'book', 'books')} ready to save in Manga2Ink.`,
      },
      notes: {
        title: 'Your books are ready, with notes',
        body: (books) =>
          `${String(books)} ${countOf(books, 'book', 'books')} ready. Open Manga2Ink to see the notes.`,
      },
      failures: {
        title: 'Some conversions failed',
        body: (books, failures) =>
          books === 0
            ? 'Nothing was made. Open Manga2Ink to see why.'
            : `${String(books)} ${countOf(books, 'book', 'books')} ready, ${String(failures)} ${countOf(failures, 'failure', 'failures')}. Open Manga2Ink to see why.`,
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
      title: 'Escolher a pasta em que o Manga2Ink trabalha',
      button: 'Usar esta pasta',
    },
    saveBook: { title: 'Salvar livro como' },
    saveAll: { title: 'Salvar todos os livros em uma pasta' },
    leaveWhileConverting: {
      message: 'Há uma conversão em andamento.',
      detail: 'Se você fechar o Manga2Ink agora, ela será perdida.',
      keep: 'Continuar convertendo',
      leave: 'Fechar mesmo',
    },
    formerAppOpen: {
      title: 'Feche o Mangabound primeiro',
      text: 'Manga2Ink é o novo nome do Mangabound. Na primeira vez que abre, ele traz as configurações do Mangabound, o que não consegue fazer enquanto o Mangabound está aberto. Feche o Mangabound e abra o Manga2Ink de novo.',
    },
    queueEnded: {
      done: {
        title: 'Seus livros estão prontos',
        body: (books) =>
          `${String(books)} ${countOf(books, 'livro pronto', 'livros prontos')} para salvar no Manga2Ink.`,
      },
      notes: {
        title: 'Seus livros estão prontos, com observações',
        body: (books) =>
          `${String(books)} ${countOf(books, 'livro pronto', 'livros prontos')}. Abra o Manga2Ink para ver as observações.`,
      },
      failures: {
        title: 'Algumas conversões falharam',
        body: (books, failures) =>
          books === 0
            ? 'Nada foi feito. Abra o Manga2Ink para ver o motivo.'
            : `${String(books)} ${countOf(books, 'livro pronto', 'livros prontos')}, ${String(failures)} ${countOf(failures, 'falha', 'falhas')}. Abra o Manga2Ink para ver o motivo.`,
      },
    },
  },
  ja: {
    chooseCover: { title: '表紙を選択', images: '画像' },
    chooseCoversFolder: { title: '表紙のフォルダーを選択' },
    chooseFolders: { title: 'マンガのフォルダーを選択' },
    chooseFiles: { title: 'コミックのファイルを選択', archive: 'コミックブックアーカイブ' },
    chooseLibrary: { title: '共有するライブラリを選択', button: 'このフォルダーを使う' },
    chooseProcessingFolder: {
      title: 'Manga2Ink が作業するフォルダーを選択',
      button: 'このフォルダーを使う',
    },
    saveBook: { title: '本に名前を付けて保存' },
    saveAll: { title: 'すべての本をフォルダーに保存' },
    leaveWhileConverting: {
      message: '変換がまだ実行中です。',
      detail: '今 Manga2Ink を閉じると、実行中の変換は失われます。',
      keep: '変換を続ける',
      leave: 'このまま閉じる',
    },
    formerAppOpen: {
      title: '先に Mangabound を閉じてください',
      text: 'Manga2Ink は Mangabound の新しい名前です。初めて起動するときに Mangabound の設定を引き継ぎますが、Mangabound が開いている間は引き継げません。Mangabound を閉じてから、もう一度 Manga2Ink を開いてください。',
    },
    queueEnded: {
      done: {
        title: '本の準備ができました',
        body: (books) => `${String(books)} 冊の本を、Manga2Ink で保存できます。`,
      },
      notes: {
        title: '本の準備ができました（お知らせあり）',
        body: (books) =>
          `${String(books)} 冊の準備ができました。Manga2Ink を開いて、お知らせを確認してください。`,
      },
      failures: {
        title: '失敗した変換があります',
        body: (books, failures) =>
          books === 0
            ? '何も作成されませんでした。Manga2Ink を開いて、理由を確認してください。'
            : `${String(books)} 冊の準備ができましたが、${String(failures)} 件が失敗しました。Manga2Ink を開いて、理由を確認してください。`,
      },
    },
  },
};
