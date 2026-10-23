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
    /** How many books of a title are converted at the same time (ADR 0068). */
    readonly parallel: {
      readonly label: string;
      /** The app's own count, with the number it comes to on this computer. The other choices are their numbers. */
      readonly automatic: (count: number) => string;
      readonly help: string;
    };
    /** Said when a choice could not be kept. */
    readonly saveFailed: string;
  };
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const processingMessages: Readonly<Record<Language, ProcessingMessages>> = {
  en: {
    description:
      'Where Manga2Ink builds volumes while it converts, and where finished books wait until you save them. A drive with plenty of room helps with long series.',
    folder: 'Working folder',
    automatic: 'Chosen by Manga2Ink',
    scratch: 'Volumes while converting',
    pending: 'Finished books, until saved',
    free: 'Free space',
    choose: 'Choose a folder…',
    useDefault: 'Use the default folder',
    help: 'Manga2Ink makes Pending and Scratch inside the folder you choose. The next conversions use it; books already waiting stay where they are and stay in the list.',
    unavailable:
      'The working folder is not available. Connect its drive again, or choose another folder: nothing can be converted until then.',
    loading: 'Reading where Manga2Ink works…',
    earlier: {
      title: 'Still waiting in earlier folders',
      help: 'Save or delete these books from the list on the queue page. Once none is left in a folder, Manga2Ink stops looking there.',
      books: (count) => `${String(count)} ${countOf(count, 'book', 'books')}`,
    },
    waiting: {
      title: 'Books waiting to be saved',
      none: 'No books are waiting.',
      summary: (books, runs, size) =>
        `${String(books)} ${countOf(books, 'book', 'books')} in ${String(runs)} ${countOf(runs, 'conversion', 'conversions')}, ${size}`,
      help: 'A conversion whose books are all saved is removed when Manga2Ink closes. The others stay until you save or delete them.',
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
      title: 'While Manga2Ink converts',
      notify: {
        label: 'Tell me when a long conversion ends',
        help: (seconds) =>
          `A system notification, only when the conversion took more than ${String(seconds)} seconds and no Manga2Ink window is in front. Clicking it brings the window back.`,
      },
      awake: {
        label: 'Keep the computer awake while converting',
        help: 'The screen may still turn off, but the computer will not go to sleep and stop the conversion.',
      },
      parallel: {
        label: 'Parallel conversions',
        automatic: (count) => `Automatic (${String(count)} on this computer)`,
        help: 'How many books of one title are converted at the same time. Automatic works it out from the processors and memory of this computer, and never comes to more than 3. The most you can choose depends on this computer too. More at once helps only on a computer with many processors, and uses more memory. It applies the next time you press Process.',
      },
      saveFailed: 'The change could not be saved. Try again.',
    },
  },
  'pt-BR': {
    description:
      'Onde o Manga2Ink monta os volumes enquanto converte e onde os livros prontos esperam até você salvá-los. Um disco com bastante espaço ajuda com séries longas.',
    folder: 'Pasta de trabalho',
    automatic: 'Escolhida pelo Manga2Ink',
    scratch: 'Volumes durante a conversão',
    pending: 'Livros prontos, até serem salvos',
    free: 'Espaço livre',
    choose: 'Escolher uma pasta…',
    useDefault: 'Usar a pasta padrão',
    help: 'O Manga2Ink cria Pending e Scratch dentro da pasta que você escolher. As próximas conversões a usam; os livros que já estão esperando ficam onde estão e continuam na lista.',
    unavailable:
      'A pasta de trabalho não está disponível. Conecte o disco dela de novo ou escolha outra pasta: nada pode ser convertido até lá.',
    loading: 'Lendo onde o Manga2Ink trabalha…',
    earlier: {
      title: 'Ainda esperando em pastas anteriores',
      help: 'Salve ou apague esses livros pela lista da página da fila. Quando não sobrar nenhum em uma pasta, o Manga2Ink deixa de procurar nela.',
      books: (count) => `${String(count)} ${countOf(count, 'livro', 'livros')}`,
    },
    waiting: {
      title: 'Livros esperando para serem salvos',
      none: 'Nenhum livro está esperando.',
      summary: (books, runs, size) =>
        `${String(books)} ${countOf(books, 'livro', 'livros')} em ${String(runs)} ${countOf(runs, 'conversão', 'conversões')}, ${size}`,
      help: 'Uma conversão cujos livros foram todos salvos é removida quando o Manga2Ink fecha. As outras ficam até você salvar ou apagar.',
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
      title: 'Enquanto o Manga2Ink converte',
      notify: {
        label: 'Avisar quando uma conversão longa terminar',
        help: (seconds) =>
          `Uma notificação do sistema, só se a conversão levou mais de ${String(seconds)} segundos e nenhuma janela do Manga2Ink estiver em primeiro plano. Ao clicar nela, a janela volta.`,
      },
      awake: {
        label: 'Manter o computador acordado durante a conversão',
        help: 'A tela ainda pode apagar, mas o computador não vai dormir e interromper a conversão.',
      },
      parallel: {
        label: 'Conversões em paralelo',
        automatic: (count) => `Automático (${String(count)} neste computador)`,
        help: 'Quantos livros de um mesmo título são convertidos ao mesmo tempo. O Automático calcula pelos processadores e pela memória deste computador, e nunca passa de 3. O máximo que você pode escolher também depende deste computador. Mais ao mesmo tempo só ajuda em um computador com muitos processadores, e usa mais memória. Vale na próxima vez que você pressionar Processar.',
      },
      saveFailed: 'Não foi possível salvar a mudança. Tente de novo.',
    },
  },
  ja: {
    description:
      'Manga2Ink が変換中に巻を作る場所と、完成した本が保存されるまで待機する場所です。長いシリーズを変換するときは、空き容量の大きなドライブが役に立ちます。',
    folder: '作業フォルダー',
    automatic: 'Manga2Ink が選択',
    scratch: '変換中の巻',
    pending: '保存前の完成した本',
    free: '空き容量',
    choose: 'フォルダーを選択…',
    useDefault: '初期設定のフォルダーを使う',
    help: '選んだフォルダーの中に、Pending と Scratch を作ります。以降の変換ではそのフォルダーを使います。すでに待機している本は元の場所に残り、一覧にも表示され続けます。',
    unavailable:
      '作業フォルダーを利用できません。ドライブを接続し直すか、別のフォルダーを選んでください。それまでは何も変換できません。',
    loading: 'Manga2Ink の作業場所を読み込んでいます…',
    earlier: {
      title: '以前のフォルダーで待機中',
      help: 'これらの本は、キューのページの一覧から保存または削除できます。フォルダーに本が残っていなければ、Manga2Ink はそこを調べなくなります。',
      books: (count) => `${String(count)} 冊`,
    },
    waiting: {
      title: '保存待ちの本',
      none: '待機中の本はありません。',
      summary: (books, runs, size) => `${String(books)} 冊（変換 ${String(runs)} 件、${size}）`,
      help: '本がすべて保存された変換は、Manga2Ink を閉じるときに削除されます。それ以外は、保存または削除するまで残ります。',
      cleanUp: '次の期間を超えて手つかずのまま待機しているものを削除',
      days: (days) => `${String(days)} 日`,
      delete: '削除…',
      nothingIdle: (days) => `${String(days)} 日を超えて待機しているものはありません。`,
      question: (runs, books, size, days) =>
        `${String(days)} 日を超えて操作されていない変換 ${String(runs)} 件（${String(books)} 冊、${size}）を削除しますか？ まだ保存されていない本は失われます。`,
      confirm: '削除',
      cancel: '残す',
      deleted: (runs, size) => `変換 ${String(runs)} 件（${size}）を削除しました。`,
      inUse: '見つかったものは保存中のため、何も削除しませんでした。',
    },
    queue: {
      title: 'Manga2Ink の変換中',
      notify: {
        label: '長い変換が終わったら知らせる',
        help: (seconds) =>
          `システムの通知です。変換に ${String(seconds)} 秒を超える時間がかかり、Manga2Ink のウィンドウが前面にないときだけ表示されます。通知をクリックするとウィンドウに戻ります。`,
      },
      awake: {
        label: '変換中はパソコンをスリープさせない',
        help: '画面は消えることがありますが、パソコンがスリープして変換が止まることはありません。',
      },
      parallel: {
        label: '並列変換',
        automatic: (count) => `自動（このパソコンでは ${String(count)}）`,
        help: '同じタイトルの本を、いくつ同時に変換するかを指定します。「自動」では、このパソコンのプロセッサーとメモリから決まり、3 を超えることはありません。選べる最大数も、このパソコンによって変わります。同時に変換する数を増やして効果があるのは、プロセッサーが多いパソコンだけで、そのぶんメモリも多く使います。次に「処理」を押したときから反映されます。',
      },
      saveFailed: '変更を保存できませんでした。もう一度お試しください。',
    },
  },
};
