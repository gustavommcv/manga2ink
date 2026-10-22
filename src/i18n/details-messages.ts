import type { Language } from '@/domain/app-settings';

/** The words of the page of the details of a book, its author lookup and its covers (ADR 0052). */
export interface DetailsMessages {
  readonly kicker: string;
  readonly intro: string;
  readonly titleField: {
    readonly series: string;
    readonly book: string;
    readonly full: string;
    readonly forSeries: string;
    readonly forBook: string;
  };
  readonly author: {
    readonly label: string;
    readonly placeholder: string;
    readonly find: string;
    readonly cbzNote: string;
  };
  readonly language: {
    readonly label: string;
    readonly invalid: string;
    readonly use: (tag: string) => string;
    readonly foldersSay: (language: string) => string;
    readonly foldersSayButOnlyEpub: (language: string) => string;
    readonly forEpub: string;
    readonly onlyEpub: string;
  };
  readonly titled: {
    readonly series: string;
    readonly book: string;
    readonly onceSet: string;
    readonly list: string;
    readonly more: (count: number) => string;
  };
  readonly lookup: {
    readonly noneDetail: string;
    readonly pick: string;
    readonly dataBy: string;
    readonly willSearch: (name: string, title: string) => string;
    readonly noAuthor: string;
    readonly useLabel: (authors: string, title: string) => string;
    readonly use: string;
  };
  readonly covers: {
    readonly title: string;
    readonly help: string;
    readonly pdf: string;
    readonly addFolder: string;
    readonly onceSet: string;
    readonly list: string;
    readonly firstPage: string;
    readonly fromFolder: (name: string) => string;
    readonly choose: (title: string) => string;
    readonly change: (title: string) => string;
    readonly chooseButton: string;
    readonly changeButton: string;
    readonly remove: (title: string) => string;
  };
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const detailsMessages: Readonly<Record<Language, DetailsMessages>> = {
  en: {
    kicker: 'Book details',
    intro: 'Every field is optional. What you leave empty uses its default.',
    titleField: {
      series: 'Series title',
      book: 'Book title',
      full: 'This is as long as the title of a book can be: its file is named after it.',
      forSeries: 'Each volume is titled with this and its number.',
      forBook: 'The title the book has in your reader.',
    },
    author: {
      label: 'Author',
      placeholder: 'Leave blank if unknown',
      find: 'Find author',
      cbzNote: 'CBZ files do not store an author. It is only kept in the catalog Manga2Ink shows.',
    },
    language: {
      label: 'Language',
      invalid: 'Use a language tag such as en-US or pt-BR. It is not used until it is valid.',
      use: (tag) => `Use ${tag}`,
      foldersSay: (language) => `The folder names say ${language}.`,
      foldersSayButOnlyEpub: (language) =>
        `The folder names say ${language}, but only EPUB files carry a language.`,
      forEpub: 'Used for EPUB output.',
      onlyEpub: 'Only EPUB files carry a language.',
    },
    titled: {
      series: 'Books will be titled',
      book: 'The book will be titled',
      onceSet: 'Once the volumes are set, each one is titled with this and its number.',
      list: 'Book titles',
      more: (count) => `…and ${String(count)} more, one for each remaining volume.`,
    },
    lookup: {
      noneDetail: 'Type the author yourself',
      pick: 'Pick a source to look up who wrote it. Nothing is sent anywhere until you search.',
      dataBy: 'Author data by',
      willSearch: (name, title) =>
        `Will search ${name} for “${title}”. Only author names and years are used, and nothing is downloaded from there.`,
      noAuthor: 'No author listed',
      useLabel: (authors, title) => `Use ${authors} from ${title}`,
      use: 'Use author',
    },
    covers: {
      title: 'Covers',
      help: 'A book without a cover of its own uses its first page. Drop an image on a book, or a folder on the list.',
      pdf: 'A PDF has no cover. What is set here is kept for the other formats.',
      addFolder: 'Add covers from a folder…',
      onceSet: 'Once the volumes are set, each one can take a cover.',
      list: 'Books and their covers',
      firstPage: 'First page',
      fromFolder: (name) => `${name} · from a folder`,
      choose: (title) => `Choose a cover for ${title}`,
      change: (title) => `Change the cover of ${title}`,
      chooseButton: 'Choose cover…',
      changeButton: 'Change…',
      remove: (title) => `Remove the cover of ${title}`,
    },
  },
  'pt-BR': {
    kicker: 'Detalhes do livro',
    intro: 'Todos os campos são opcionais. O que você deixar vazio usa o valor padrão.',
    titleField: {
      series: 'Título da série',
      book: 'Título do livro',
      full: 'Este é o tamanho máximo do título de um livro: o arquivo dele leva esse nome.',
      forSeries: 'Cada volume recebe este título e o seu número.',
      forBook: 'O título que o livro terá no seu leitor.',
    },
    author: {
      label: 'Autor',
      placeholder: 'Deixe em branco se não souber',
      find: 'Buscar autor',
      cbzNote: 'Arquivos CBZ não guardam o autor. Ele só fica no catálogo que o Manga2Ink mostra.',
    },
    language: {
      label: 'Idioma',
      invalid:
        'Use uma etiqueta de idioma como en-US ou pt-BR. Ela só passa a valer quando for válida.',
      use: (tag) => `Usar ${tag}`,
      foldersSay: (language) => `Os nomes das pastas indicam ${language}.`,
      foldersSayButOnlyEpub: (language) =>
        `Os nomes das pastas indicam ${language}, mas só os arquivos EPUB têm idioma.`,
      forEpub: 'Usado nos arquivos EPUB.',
      onlyEpub: 'Só os arquivos EPUB têm idioma.',
    },
    titled: {
      series: 'Os livros terão o título',
      book: 'O livro terá o título',
      onceSet: 'Quando os volumes forem definidos, cada um terá este título e o seu número.',
      list: 'Títulos dos livros',
      more: (count) => `…e mais ${String(count)}, um para cada volume restante.`,
    },
    lookup: {
      noneDetail: 'Digite o autor você mesmo',
      pick: 'Escolha uma fonte para consultar quem escreveu a obra. Nada é enviado a lugar nenhum até você buscar.',
      dataBy: 'Dados de autor de',
      willSearch: (name, title) =>
        `Vai buscar “${title}” em ${name}. Só nomes de autores e anos são usados, e nada é baixado de lá.`,
      noAuthor: 'Nenhum autor informado',
      useLabel: (authors, title) => `Usar ${authors} de ${title}`,
      use: 'Usar autor',
    },
    covers: {
      title: 'Capas',
      help: 'Um livro sem capa própria usa a primeira página. Solte uma imagem sobre um livro, ou uma pasta sobre a lista.',
      pdf: 'Um PDF não tem capa. O que for definido aqui fica guardado para os outros formatos.',
      addFolder: 'Adicionar capas de uma pasta…',
      onceSet: 'Quando os volumes forem definidos, cada um poderá ter uma capa.',
      list: 'Livros e suas capas',
      firstPage: 'Primeira página',
      fromFolder: (name) => `${name} · de uma pasta`,
      choose: (title) => `Escolher uma capa para ${title}`,
      change: (title) => `Trocar a capa de ${title}`,
      chooseButton: 'Escolher capa…',
      changeButton: 'Trocar…',
      remove: (title) => `Remover a capa de ${title}`,
    },
  },
  ja: {
    kicker: '本の詳細',
    intro: 'すべての項目は任意です。空欄のままにした項目には、初期設定が使われます。',
    titleField: {
      series: 'シリーズのタイトル',
      book: '本のタイトル',
      full: 'これがタイトルの最大の長さです。本のファイル名にも、このタイトルが使われます。',
      forSeries: '各巻のタイトルは、このタイトルと巻の番号になります。',
      forBook: 'お使いのリーダーに表示される、この本のタイトルです。',
    },
    author: {
      label: '著者',
      placeholder: '不明な場合は空欄のままにしてください',
      find: '著者を検索',
      cbzNote:
        'CBZ ファイルには著者を保存できません。Manga2Ink が表示するカタログの中にだけ保持されます。',
    },
    language: {
      label: '言語',
      invalid: 'en-US や pt-BR のような言語タグを入力してください。有効になるまでは使われません。',
      use: (tag) => `${tag} を使う`,
      foldersSay: (language) => `フォルダー名は ${language} を示しています。`,
      foldersSayButOnlyEpub: (language) =>
        `フォルダー名は ${language} を示していますが、言語を持てるのは EPUB ファイルだけです。`,
      forEpub: 'EPUB の出力に使われます。',
      onlyEpub: '言語を持てるのは EPUB ファイルだけです。',
    },
    titled: {
      series: '本には次のタイトルが付きます',
      book: 'この本には次のタイトルが付きます',
      onceSet: '巻を設定すると、各巻のタイトルは、このタイトルと巻の番号になります。',
      list: '本のタイトル',
      more: (count) => `…ほか ${String(count)} 巻分（残りの巻ごとに 1 つずつ）。`,
    },
    lookup: {
      noneDetail: '著者を自分で入力してください',
      pick: '情報源を選ぶと、著者を検索できます。検索するまでは、何も送信されません。',
      dataBy: '著者データの提供元',
      willSearch: (name, title) =>
        `${name} で「${title}」を検索します。使うのは著者の名前と年だけで、そこから何もダウンロードしません。`,
      noAuthor: '著者の記載なし',
      useLabel: (authors, title) => `「${title}」の著者（${authors}）を使う`,
      use: '著者を使う',
    },
    covers: {
      title: '表紙',
      help: '専用の表紙がない本は、最初のページを使います。画像を本にドロップするか、フォルダーを一覧にドロップしてください。',
      pdf: 'PDF には表紙がありません。ここで設定した内容は、ほかの形式のために保持されます。',
      addFolder: 'フォルダーから表紙を追加…',
      onceSet: '巻を設定すると、各巻に表紙を指定できます。',
      list: '本と表紙',
      firstPage: '最初のページ',
      fromFolder: (name) => `${name} · フォルダーから`,
      choose: (title) => `「${title}」の表紙を選択`,
      change: (title) => `「${title}」の表紙を変更`,
      chooseButton: '表紙を選択…',
      changeButton: '変更…',
      remove: (title) => `「${title}」の表紙を削除`,
    },
  },
};
