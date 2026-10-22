import type { Language } from '@/domain/app-settings';
import type { BookFormat } from '@/domain/conversion';

import { countOf } from './count';

/**
 * The words of the queue screen and what it holds: the drop area, a row's buttons, the steps, the
 * panel of conversion options, the books waiting to be saved and the plan that was validated.
 *
 * What the domain says about a row (its status, its detail line, its notes) is not here: it is said
 * by code, and the sentences are in `queue-said.ts` (ADR 0053).
 */
export interface QueueMessages {
  readonly title: string;
  /** The name of the list of items. */
  readonly items: string;
  readonly files: string;
  readonly folder: string;
  readonly clear: string;
  readonly rejected: {
    /** Follows the name of the item: "<name> was not added. <reason>". */
    readonly wasNotAdded: string;
    readonly dismiss: string;
  };
  readonly drop: {
    readonly release: string;
    /** What the area says while the queue is empty. */
    readonly invitation: string;
    /** What the line under the items says. */
    readonly more: string;
    readonly chooseFiles: string;
    readonly chooseFolder: string;
    readonly note: string;
  };
  readonly row: {
    readonly editTitlesOf: (name: string) => string;
    readonly editVolumesFor: (name: string) => string;
    readonly editTitles: string;
    readonly editVolumes: string;
    readonly editDetailsOf: (name: string) => string;
    readonly editDetails: (set: boolean) => string;
    readonly editOptionsOf: (name: string) => string;
    readonly editOptions: (set: boolean) => string;
    readonly remove: (name: string) => string;
  };
  readonly steps: {
    readonly legend: string;
    readonly group: string;
    readonly convert: string;
    readonly keepOne: string;
  };
  readonly panel: {
    /** The name of the panel of conversion options beside the queue. */
    readonly label: string;
    readonly singleBook: {
      readonly label: string;
      readonly saved: string;
      readonly unavailable: string;
      /** What the one book is, by its format: an EPUB has a table of contents, a PDF bookmarks, a CBZ neither (ADR 0083). */
      readonly produces: Readonly<Record<BookFormat, string>>;
    };
    readonly device: string;
    readonly format: string;
    readonly advanced: string;
  };
  readonly run: {
    readonly process: (items: number) => string;
    readonly validate: string;
    readonly validating: string;
    readonly reading: (items: number) => string;
    readonly nothingRuns: string;
    readonly leftOut: (items: number) => string;
    /** Said before the run, when a drive the app works on has less room than the queue would take (ADR 0060). */
    readonly lowSpace: (free: string, needed: string) => string;
  };
  readonly plans: {
    readonly validated: string;
    readonly nothingWritten: string;
    readonly pages: (count: number) => string;
    /** The one book a whole series is bound into, named for the series. */
    readonly oneBookFor: (series: string) => string;
  };
  readonly pending: {
    readonly earlierBooks: string;
    readonly readyBooks: string;
    readonly earlierConversion: string;
    readonly andMore: (first: string, more: number) => string;
    readonly viewBooksFrom: (first: string) => string;
    readonly viewBooks: string;
    readonly deleteFrom: (first: string) => string;
    readonly delete: string;
    readonly confirmDeletion: (first: string) => string;
    readonly question: (books: number) => string;
    readonly deleting: string;
    readonly deleteBooks: string;
    readonly cancel: string;
  };
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const queueMessages: Readonly<Record<Language, QueueMessages>> = {
  en: {
    title: 'Queue',
    items: 'Queued items',
    files: 'Files',
    folder: 'Folder',
    clear: 'Clear',
    rejected: { wasNotAdded: 'was not added.', dismiss: 'Dismiss this message' },
    drop: {
      release: 'Release to add them',
      invitation: 'Drop manga folders, libraries or .cbz files here, or click to choose.',
      more: 'Drop files or folders here, or click to choose.',
      chooseFiles: 'Choose files',
      chooseFolder: 'Choose a folder',
      note: 'Folders group chapters into volumes automatically. A single CBZ becomes one volume; for separate chapter CBZs, add their folder.',
    },
    row: {
      editTitlesOf: (name) => `Edit titles of ${name}`,
      editVolumesFor: (name) => `Edit volumes for ${name}`,
      editTitles: 'Edit titles',
      editVolumes: 'Edit volumes',
      editDetailsOf: (name) => `Edit details of ${name}`,
      editDetails: (set) =>
        set ? 'Edit title, author and language (set)' : 'Edit title, author and language',
      editOptionsOf: (name) => `Edit conversion options of ${name}`,
      editOptions: (set) =>
        set
          ? 'Edit conversion options for this item (set)'
          : 'Edit conversion options for this item',
      remove: (name) => `Remove ${name}`,
    },
    steps: {
      legend: 'Steps',
      group: 'Group chapters into volumes',
      convert: 'Convert for e-reader',
      keepOne: 'Keep at least one step on.',
    },
    panel: {
      label: 'Conversion options',
      singleBook: {
        label: 'Create one book for the series',
        saved: 'Saved for manga folders. A standalone CBZ is already one book.',
        unavailable: 'Not available for standalone .cbz files.',
        produces: {
          epub: 'Produces a single EPUB with volumes and chapters in the table of contents.',
          cbz: 'Produces a single CBZ with the volumes and chapters as folders. It has no table of contents.',
          pdf: 'Produces a single PDF with the pages in order and bookmarks for the volumes and chapters.',
        },
      },
      device: 'Device',
      format: 'Format',
      advanced: 'Advanced conversion options',
    },
    run: {
      process: (items) =>
        items === 0 ? 'Process' : `Process ${String(items)} ${countOf(items, 'item', 'items')}`,
      validate: 'Validate plan',
      validating: 'Validating…',
      reading: (items) => `Reading ${String(items)} ${countOf(items, 'item', 'items')}…`,
      nothingRuns: 'Nothing here can run yet.',
      leftOut: (items) =>
        `${String(items)} ${countOf(items, 'item', 'items')} will be left out. Use the pencil on a row to fix it.`,
      lowSpace: (free, needed) =>
        `Only ${free} are free where Manga2Ink works, and this queue may take about ${needed}. Make room, or choose another working folder in App settings, under Processing.`,
    },
    plans: {
      validated: 'Plan validated',
      nothingWritten: 'No library files were written.',
      pages: (count) => `${String(count)} ${countOf(count, 'page', 'pages')}`,
      oneBookFor: (series) => `One book for ${series}`,
    },
    pending: {
      earlierBooks: 'Earlier books',
      readyBooks: 'Ready books',
      earlierConversion: 'Earlier conversion',
      andMore: (first, more) =>
        `${first} and ${String(more)} ${countOf(more, 'more book', 'more books')}`,
      viewBooksFrom: (first) => `View books from ${first}`,
      viewBooks: 'View books',
      deleteFrom: (first) => `Delete pending books from ${first}`,
      delete: 'Delete',
      confirmDeletion: (first) => `Confirm deletion of ${first}`,
      question: (books) =>
        `Permanently delete this conversion's ${String(books)} ${countOf(books, 'pending book', 'pending books')}? Books saved elsewhere will stay untouched.`,
      deleting: 'Deleting…',
      deleteBooks: 'Delete books',
      cancel: 'Cancel',
    },
  },
  'pt-BR': {
    title: 'Fila',
    items: 'Itens na fila',
    files: 'Arquivos',
    folder: 'Pasta',
    clear: 'Limpar',
    rejected: { wasNotAdded: 'não foi adicionado.', dismiss: 'Dispensar esta mensagem' },
    drop: {
      release: 'Solte para adicionar',
      invitation:
        'Solte aqui pastas de mangá, bibliotecas ou arquivos .cbz, ou clique para escolher.',
      more: 'Solte arquivos ou pastas aqui, ou clique para escolher.',
      chooseFiles: 'Escolher arquivos',
      chooseFolder: 'Escolher uma pasta',
      note: 'Pastas agrupam os capítulos em volumes automaticamente. Um CBZ avulso vira um volume; para CBZs de capítulos separados, adicione a pasta deles.',
    },
    row: {
      editTitlesOf: (name) => `Editar os títulos de ${name}`,
      editVolumesFor: (name) => `Editar os volumes de ${name}`,
      editTitles: 'Editar títulos',
      editVolumes: 'Editar volumes',
      editDetailsOf: (name) => `Editar os detalhes de ${name}`,
      editDetails: (set) =>
        set ? 'Editar título, autor e idioma (definidos)' : 'Editar título, autor e idioma',
      editOptionsOf: (name) => `Editar as opções de conversão de ${name}`,
      editOptions: (set) =>
        set
          ? 'Editar as opções de conversão deste item (definidas)'
          : 'Editar as opções de conversão deste item',
      remove: (name) => `Remover ${name}`,
    },
    steps: {
      legend: 'Etapas',
      group: 'Agrupar capítulos em volumes',
      convert: 'Converter para e-reader',
      keepOne: 'Mantenha pelo menos uma etapa ligada.',
    },
    panel: {
      label: 'Opções de conversão',
      singleBook: {
        label: 'Criar um livro para a série',
        saved: 'Guardado para pastas de mangá. Um CBZ avulso já é um livro só.',
        unavailable: 'Indisponível para arquivos .cbz avulsos.',
        produces: {
          epub: 'Gera um único EPUB com volumes e capítulos no sumário.',
          cbz: 'Gera um único CBZ com os volumes e capítulos em pastas. Não tem sumário.',
          pdf: 'Gera um único PDF com as páginas em ordem e marcadores para os volumes e capítulos.',
        },
      },
      device: 'Dispositivo',
      format: 'Formato',
      advanced: 'Opções avançadas de conversão',
    },
    run: {
      process: (items) =>
        items === 0 ? 'Processar' : `Processar ${String(items)} ${countOf(items, 'item', 'itens')}`,
      validate: 'Validar plano',
      validating: 'Validando…',
      reading: (items) => `Lendo ${String(items)} ${countOf(items, 'item', 'itens')}…`,
      nothingRuns: 'Nada aqui pode rodar ainda.',
      leftOut: (items) =>
        `${String(items)} ${countOf(items, 'item ficará', 'itens ficarão')} de fora. Use o lápis na linha para corrigir.`,
      lowSpace: (free, needed) =>
        `Só há ${free} livres onde o Manga2Ink trabalha, e esta fila pode ocupar cerca de ${needed}. Libere espaço ou escolha outra pasta de trabalho em Configurações do app, em Processamento.`,
    },
    plans: {
      validated: 'Plano validado',
      nothingWritten: 'Nenhum arquivo da biblioteca foi gravado.',
      pages: (count) => `${String(count)} ${countOf(count, 'página', 'páginas')}`,
      oneBookFor: (series) => `Um livro para ${series}`,
    },
    pending: {
      earlierBooks: 'Livros anteriores',
      readyBooks: 'Livros prontos',
      earlierConversion: 'Conversão anterior',
      andMore: (first, more) =>
        `${first} e mais ${String(more)} ${countOf(more, 'livro', 'livros')}`,
      viewBooksFrom: (first) => `Ver os livros de ${first}`,
      viewBooks: 'Ver livros',
      deleteFrom: (first) => `Apagar os livros pendentes de ${first}`,
      delete: 'Apagar',
      confirmDeletion: (first) => `Confirmar a exclusão de ${first}`,
      question: (books) =>
        `Apagar definitivamente ${countOf(books, 'o livro pendente', `os ${String(books)} livros pendentes`)} desta conversão? Livros salvos em outro lugar não serão alterados.`,
      deleting: 'Apagando…',
      deleteBooks: 'Apagar livros',
      cancel: 'Cancelar',
    },
  },
  ja: {
    title: 'キュー',
    items: 'キューの項目',
    files: 'ファイル',
    folder: 'フォルダー',
    clear: 'クリア',
    rejected: { wasNotAdded: 'は追加されませんでした。', dismiss: 'このメッセージを閉じる' },
    drop: {
      release: '離すと追加されます',
      invitation:
        'マンガのフォルダー、ライブラリ、.cbz ファイルをここにドロップするか、クリックして選択してください。',
      more: 'ファイルまたはフォルダーをここにドロップするか、クリックして選択してください。',
      chooseFiles: 'ファイルを選択',
      chooseFolder: 'フォルダーを選択',
      note: 'フォルダーは、各話が自動的に巻にまとめられます。単体の CBZ は 1 巻になります。各話が別々の CBZ になっている場合は、そのフォルダーを追加してください。',
    },
    row: {
      editTitlesOf: (name) => `「${name}」のタイトルを編集`,
      editVolumesFor: (name) => `「${name}」の巻を編集`,
      editTitles: 'タイトルを編集',
      editVolumes: '巻を編集',
      editDetailsOf: (name) => `「${name}」の詳細を編集`,
      editDetails: (set) =>
        set ? 'タイトル、著者、言語を編集（設定済み）' : 'タイトル、著者、言語を編集',
      editOptionsOf: (name) => `「${name}」の変換オプションを編集`,
      editOptions: (set) =>
        set ? 'この項目の変換オプションを編集（設定済み）' : 'この項目の変換オプションを編集',
      remove: (name) => `「${name}」をキューから外す`,
    },
    steps: {
      legend: '手順',
      group: '各話を巻にまとめる',
      convert: 'リーダー向けに変換',
      keepOne: '少なくとも 1 つの手順をオンにしてください。',
    },
    panel: {
      label: '変換オプション',
      singleBook: {
        label: 'シリーズを 1 冊の本にする',
        saved: 'マンガのフォルダー用に保存されます。単体の CBZ は、すでに 1 冊の本です。',
        unavailable: '単体の .cbz ファイルでは使えません。',
        produces: {
          epub: '各巻と各話が目次に入った、1 つの EPUB を作成します。',
          cbz: '各巻と各話をフォルダーにした、1 つの CBZ を作成します。目次はありません。',
          pdf: 'ページが順番に並び、各巻と各話のしおりが付いた、1 つの PDF を作成します。',
        },
      },
      device: '端末',
      format: '形式',
      advanced: '詳細な変換オプション',
    },
    run: {
      process: (items) => (items === 0 ? '処理' : `${String(items)} 個の項目を処理`),
      validate: '計画を検証',
      validating: '検証中…',
      reading: (items) => `${String(items)} 個の項目を読み込み中…`,
      nothingRuns: 'まだ実行できるものがありません。',
      leftOut: (items) =>
        `${String(items)} 個の項目が対象外になります。行の鉛筆アイコンから修正できます。`,
      lowSpace: (free, needed) =>
        `Manga2Ink の作業場所の空き容量は ${free} しかなく、このキューには約 ${needed} かかる可能性があります。空き容量を確保するか、アプリの設定の「処理」で別の作業フォルダーを選んでください。`,
    },
    plans: {
      validated: '計画を検証しました',
      nothingWritten: 'ライブラリのファイルは書き込まれていません。',
      pages: (count) => `${String(count)} ページ`,
      oneBookFor: (series) => `「${series}」全体で 1 冊`,
    },
    pending: {
      earlierBooks: '以前の本',
      readyBooks: '完成した本',
      earlierConversion: '以前の変換',
      andMore: (first, more) => `${first} ほか ${String(more)} 冊`,
      viewBooksFrom: (first) => `「${first}」の本を表示`,
      viewBooks: '本を表示',
      deleteFrom: (first) => `「${first}」の保留中の本を削除`,
      delete: '削除',
      confirmDeletion: (first) => `「${first}」の削除を確認`,
      question: (books) =>
        `この変換の保留中の本 ${String(books)} 冊を完全に削除しますか？ 別の場所に保存した本は、そのまま残ります。`,
      deleting: '削除中…',
      deleteBooks: '本を削除',
      cancel: 'キャンセル',
    },
  },
};
