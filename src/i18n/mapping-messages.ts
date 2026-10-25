import type { Language } from '@/domain/app-settings';
import type { BookFormat } from '@/domain/conversion';

import { countOf } from './count';

/** The words of the editor of the chapter-to-volume mapping and of what it is made of (ADR 0052). */
export interface MappingMessages {
  readonly editor: {
    readonly kicker: string;
    readonly origin: {
      readonly suggestedBy: (source: string) => string;
      readonly groupedByMangabind: string;
      readonly manual: string;
    };
    /** "Organize … into books"; a title that is empty is said as an untitled manga. */
    readonly title: (manga: string) => string;
    readonly introEditing: string;
    readonly introReviewing: string;
    readonly showSummary: string;
    readonly history: {
      readonly label: string;
      readonly undo: string;
      readonly redo: string;
      readonly reset: string;
    };
    readonly leftOut: string;
    /** Where the choice among the files of a chapter can be seen again, for a folder that has some (ADR 0093). */
    readonly versions: {
      readonly text: (count: number) => string;
      readonly open: string;
      /** Why the choice cannot be opened now: what was changed here would be lost. */
      readonly edited: string;
    };
    /** How the books of the series are made (ADR 0094): the choice that opens the editor of a folder. */
    readonly books: {
      readonly legend: string;
      readonly perVolume: { readonly label: string; readonly help: string };
      readonly series: {
        readonly label: string;
        /** What the one book is when the format is not known. */
        readonly help: string;
        /** What the one book is, by its format: an EPUB has a table of contents, a PDF bookmarks, a CBZ neither (ADR 0083). */
        readonly produces: Readonly<Record<BookFormat, string>>;
      };
      readonly asIs: { readonly label: string; readonly help: string };
      /** Said in place of the volumes of a series that is one book and has none, and need not. */
      readonly noVolumes: {
        readonly text: string;
        readonly done: string;
        /** Opens the volumes for a series that has none, to give the book a first level. */
        readonly group: string;
      };
      /** Said over the editor of a title of a library whose titles are one book each. */
      readonly inLibrary: { readonly title: string; readonly text: string };
    };
    readonly start: {
      readonly text: string;
      readonly createFirst: string;
      readonly createVolume: (number: string) => string;
    };
    readonly confirmed: string;
    readonly editFailed: string;
    readonly saveFailed: string;
    readonly chapters: {
      readonly title: string;
      readonly selected: (selected: number, total: number) => string;
      readonly clearAll: string;
      readonly selectAll: string;
      readonly select: (name: string) => string;
      readonly pages: (count: number) => string;
      readonly unassigned: string;
      readonly volume: (number: string) => string;
      readonly moveTo: string;
      readonly createFirst: string;
      readonly assignSelected: string;
      readonly unassign: string;
      readonly range: {
        readonly legend: string;
        readonly note: string;
        readonly from: string;
        readonly through: string;
        readonly volume: string;
        readonly assign: string;
      };
    };
    readonly volumes: {
      readonly title: string;
      readonly created: (count: number) => string;
      readonly newNumber: string;
      readonly addLabel: string;
      readonly add: string;
      readonly help: string;
      readonly none: string;
      readonly number: string;
      readonly numberFor: (number: string) => string;
      readonly remove: (number: string) => string;
      readonly chapterCount: (count: number) => string;
      readonly splitBefore: string;
      readonly splitLabel: (number: string) => string;
      readonly split: string;
      readonly splitHelp: string;
      readonly mergeInto: (number: string) => string;
    };
    readonly check: {
      readonly title: string;
      readonly ready: string;
      readonly errorsLabel: string;
      readonly fixFirst: string;
      readonly warningsLabel: string;
      readonly checkThese: string;
      readonly confirm: string;
    };
  };
  readonly summary: {
    readonly title: string;
    readonly counts: (volumes: number, assigned: number, chapters: number) => string;
    readonly edit: string;
    readonly volumeLine: (chapters: number, first: string, last: string) => string;
    readonly review: string;
    readonly confirm: string;
  };
  readonly chaptersFrom: {
    readonly title: string;
    readonly tabs: { readonly names: string; readonly online: string; readonly manual: string };
    readonly names: {
      readonly none: (onlineAvailable: boolean) => string;
      readonly read: (volumes: number, chapters: number) => string;
      readonly startOver: string;
    };
    readonly manual: {
      readonly noVolumesTitle: string;
      readonly buildHere: string;
      readonly buildOrTry: (online: string) => string;
      readonly text: string;
    };
    readonly online: {
      readonly pick: string;
      readonly dataBy: string;
      readonly open: (name: string) => string;
      readonly search: (name: string) => string;
      readonly placeholder: string;
      readonly searchButton: string;
      readonly privacy: (name: string) => string;
      readonly language: (language: string) => string;
      readonly searching: string;
      readonly matches: string;
      readonly applying: string;
      readonly use: string;
      /** The source has the series, but puts none of its chapters in a volume. */
      readonly noVolumes: (name: string) => string;
      /** The source has volumes, but none holds a chapter of the folder. */
      readonly noMatch: (name: string) => string;
    };
  };
  readonly providers: {
    readonly label: string;
    readonly noneDetail: string;
    readonly none: string;
    readonly select: string;
  };
  readonly noMatches: {
    readonly label: string;
    readonly text: (query: string, fix: 'search' | 'title') => string;
  };
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const mappingMessages: Readonly<Record<Language, MappingMessages>> = {
  en: {
    editor: {
      kicker: 'Chapter mapping',
      origin: {
        suggestedBy: (source) => `Suggested by ${source}`,
        groupedByMangabind: 'Grouped by mangabind · Offline',
        manual: 'Manual mapping · Offline',
      },
      title: (manga) => `Organize ${manga === '' ? 'untitled manga' : manga} into books`,
      introEditing:
        'Select chapters, assign them to a volume, and fix any conflicts before continuing. Assigning an already placed chapter moves it.',
      introReviewing:
        'Review the proposed volumes below, or open the editor to change chapter assignments.',
      showSummary: 'Show mapping summary',
      history: {
        label: 'Edit history',
        undo: 'Undo last mapping edit',
        redo: 'Redo last mapping edit',
        reset: 'Reset all mapping edits',
      },
      leftOut: 'Folders left out',
      versions: {
        text: (count) =>
          `${String(count)} ${countOf(count, 'chapter of this folder comes', 'chapters of this folder come')} in more than one version, and you chose which to use.`,
        open: 'Review the versions',
        edited: 'Undo or confirm your changes to the volumes first: they would be lost.',
      },
      books: {
        legend: 'Books',
        perVolume: {
          label: 'One book per volume',
          help: 'Needs volumes: from the names, an online source, or made by hand.',
        },
        series: {
          label: 'One book for the whole series',
          help: 'Needs no volumes: the chapters are its table of contents. Volumes, if you add them, are its first level.',
          produces: {
            epub: 'One EPUB for the whole series, with its chapters (and its volumes, if it has them) in the table of contents. It needs no volumes.',
            cbz: 'One CBZ for the whole series, with the chapters (and the volumes) as folders. It has no table of contents.',
            pdf: 'One PDF for the whole series, with the pages in order and bookmarks for the chapters (and the volumes).',
          },
        },
        asIs: {
          label: 'Convert the folder as it is',
          help: 'Nothing is grouped: the folder goes to mangaprep as one book.',
        },
        noVolumes: {
          text: 'This series needs no volumes: its chapters are the table of contents of the book. Group them into volumes only if you want the volumes as its first level.',
          done: 'Done',
          group: 'Group into volumes',
        },
        inLibrary: {
          title: 'One book for each title',
          text: 'The mapped volumes become the top level of the title’s book, with their chapters under them: in the table of contents of an EPUB, in the bookmarks of a PDF, as folders in a CBZ.',
        },
      },
      start: {
        text: 'Start by creating a volume, then assign chapters to it.',
        createFirst: 'Create first volume',
        createVolume: (number) => `Create volume ${number}`,
      },
      confirmed: 'Mapping confirmed.',
      editFailed: 'That edit could not be applied. Nothing was changed.',
      saveFailed: 'The mapping could not be saved.',
      chapters: {
        title: 'Chapters',
        selected: (selected, total) => `${String(selected)} of ${String(total)} selected`,
        clearAll: 'Clear all',
        selectAll: 'Select all',
        select: (name) => `Select ${name}`,
        pages: (count) => `${String(count)} pages`,
        unassigned: 'Unassigned',
        volume: (number) => `Volume ${number}`,
        moveTo: 'Move selected chapters to',
        createFirst: 'Create a volume first',
        assignSelected: 'Assign selected',
        unassign: 'Unassign',
        range: {
          legend: 'Assign a chapter range',
          note: 'The first and last chapter are both included.',
          from: 'From',
          through: 'Through',
          volume: 'Volume',
          assign: 'Assign range',
        },
      },
      volumes: {
        title: 'Volumes',
        created: (count) => `${String(count)} created`,
        newNumber: 'New volume number',
        addLabel: 'Add volume',
        add: 'Add',
        help: 'Add creates a volume using this number. The next number increases automatically.',
        none: 'No volumes yet.',
        number: 'Volume number',
        numberFor: (number) => `Volume number for volume ${number}`,
        remove: (number) => `Remove volume ${number}`,
        chapterCount: (count) => `${String(count)} ${countOf(count, 'chapter', 'chapters')}`,
        splitBefore: 'Split before',
        splitLabel: (number) => `Split volume ${number}`,
        split: 'Split',
        splitHelp: 'This chapter and all later chapters move into a new volume.',
        mergeInto: (number) => `Merge into volume ${number}`,
      },
      check: {
        title: 'Ready check',
        ready: 'All chapters are ready to bind.',
        errorsLabel: 'Mapping errors',
        fixFirst: 'Fix before continuing',
        warningsLabel: 'Mapping warnings',
        checkThese: 'Check these chapters',
        confirm: 'Confirm mapping',
      },
    },
    summary: {
      title: 'Proposed chapter mapping',
      counts: (volumes, assigned, chapters) =>
        `${String(volumes)} ${countOf(volumes, 'volume', 'volumes')} · ${String(assigned)} of ${String(chapters)} chapters assigned`,
      edit: 'Edit chapter mapping',
      volumeLine: (chapters, first, last) =>
        `${String(chapters)} ${countOf(chapters, 'chapter', 'chapters')}${
          chapters === 1 ? ` · ${first}` : chapters > 1 ? ` · first: ${first} · last: ${last}` : ''
        }`,
      review: 'Review this proposal before continuing.',
      confirm: 'Confirm mapping',
    },
    chaptersFrom: {
      title: 'Chapters from',
      tabs: { names: 'File names', online: 'Online source', manual: 'Manual' },
      names: {
        none: (onlineAvailable) =>
          `No file-name grouping is available here. ${
            onlineAvailable
              ? 'Use an online source, or group the chapters yourself.'
              : 'Group the chapters yourself.'
          }`,
        read: (volumes, chapters) =>
          `${String(volumes)} ${countOf(volumes, 'volume', 'volumes')} ${countOf(volumes, 'was', 'were')} read from the names of ${String(chapters)} ${countOf(chapters, 'chapter', 'chapters')}, without going online.`,
        startOver: 'Start over from the names',
      },
      manual: {
        noVolumesTitle: 'No volumes found in file names',
        buildHere: 'Build the volumes here; no online source is required.',
        buildOrTry: (online) =>
          `Build them here, or try ${online} for a suggestion. Nothing is searched automatically.`,
        text: 'Select chapters or a range to assign to volumes. You can move them later. Manual edits stay on this computer.',
      },
      online: {
        pick: 'Pick a source to look up which chapters belong in each volume. Nothing is sent anywhere until you search.',
        dataBy: 'Volume data by',
        open: (name) => `Open ${name} in your browser`,
        search: (name) => `Search ${name}`,
        placeholder: 'Manga title',
        searchButton: 'Search',
        privacy: (name) =>
          `Searching sends the title to ${name}. Only volume and chapter numbers are used, and nothing is downloaded from there.`,
        language: (language) =>
          ` Volumes are looked up in ${language}, the language of your folders.`,
        searching: 'Searching…',
        matches: 'Matches',
        applying: 'Applying…',
        use: 'Use these volumes',
        noVolumes: (name) =>
          `${name} has this series, but no volumes for it: its chapters are not grouped into volumes there. The series can still be one book: choose “One book for the whole series” under Books, or group the chapters yourself.`,
        noMatch: (name) =>
          `${name} has volumes for this series, but none of them holds a chapter of this folder, so nothing was grouped. Check that the chapter numbers match, or group the chapters yourself.`,
      },
    },
    providers: {
      label: 'Source',
      noneDetail: 'Only the folder names and your edits',
      none: 'No online source',
      select: 'Select a source',
    },
    noMatches: {
      label: 'No matches',
      text: (query, fix) =>
        `No matches for “${query}”. Extra characters in the ${fix} can keep a work from being found. ${
          fix === 'title' ? 'Try a simpler title above' : 'Try simpler words above'
        } and search again.`,
    },
  },
  'pt-BR': {
    editor: {
      kicker: 'Mapeamento de capítulos',
      origin: {
        suggestedBy: (source) => `Sugerido por ${source}`,
        groupedByMangabind: 'Agrupado pelo mangabind · Offline',
        manual: 'Mapeamento manual · Offline',
      },
      title: (manga) => `Organizar ${manga === '' ? 'mangá sem título' : manga} em livros`,
      introEditing:
        'Selecione capítulos, atribua-os a um volume e resolva os conflitos antes de continuar. Atribuir um capítulo que já está em um volume o move.',
      introReviewing:
        'Revise os volumes propostos abaixo, ou abra o editor para mudar em que volume cada capítulo fica.',
      showSummary: 'Mostrar o resumo do mapeamento',
      history: {
        label: 'Histórico de edições',
        undo: 'Desfazer a última edição do mapeamento',
        redo: 'Refazer a última edição do mapeamento',
        reset: 'Desfazer todas as edições do mapeamento',
      },
      leftOut: 'Pastas deixadas de fora',
      versions: {
        text: (count) =>
          `${String(count)} ${countOf(count, 'capítulo desta pasta vem', 'capítulos desta pasta vêm')} em mais de uma versão, e você escolheu qual usar.`,
        open: 'Rever as versões',
        edited: 'Desfaça ou confirme antes as suas mudanças nos volumes: elas se perderiam.',
      },
      books: {
        legend: 'Livros',
        perVolume: {
          label: 'Um livro por volume',
          help: 'Precisa de volumes: pelos nomes, de uma fonte online ou feitos à mão.',
        },
        series: {
          label: 'Um livro para a série inteira',
          help: 'Não precisa de volumes: os capítulos formam o sumário. Os volumes, se você os criar, são o primeiro nível.',
          produces: {
            epub: 'Um EPUB para a série inteira, com os capítulos (e os volumes, se ela tiver) no sumário. Não precisa de volumes.',
            cbz: 'Um CBZ para a série inteira, com os capítulos (e os volumes) em pastas. Não tem sumário.',
            pdf: 'Um PDF para a série inteira, com as páginas em ordem e marcadores para os capítulos (e os volumes).',
          },
        },
        asIs: {
          label: 'Converter a pasta como está',
          help: 'Nada é agrupado: a pasta vai ao mangaprep como um livro só.',
        },
        noVolumes: {
          text: 'Esta série não precisa de volumes: os capítulos formam o sumário do livro. Agrupe-os em volumes só se quiser os volumes como primeiro nível.',
          done: 'Concluir',
          group: 'Agrupar em volumes',
        },
        inLibrary: {
          title: 'Um livro para cada título',
          text: 'Os volumes mapeados serão o primeiro nível do livro do título, com os capítulos dentro deles: no sumário de um EPUB, nos marcadores de um PDF, em pastas num CBZ.',
        },
      },
      start: {
        text: 'Comece criando um volume e depois atribua capítulos a ele.',
        createFirst: 'Criar o primeiro volume',
        createVolume: (number) => `Criar o volume ${number}`,
      },
      confirmed: 'Mapeamento confirmado.',
      editFailed: 'Não foi possível aplicar essa edição. Nada foi alterado.',
      saveFailed: 'Não foi possível guardar o mapeamento.',
      chapters: {
        title: 'Capítulos',
        selected: (selected, total) =>
          `${String(selected)} de ${String(total)} ${countOf(selected, 'selecionado', 'selecionados')}`,
        clearAll: 'Limpar a seleção',
        selectAll: 'Selecionar tudo',
        select: (name) => `Selecionar ${name}`,
        pages: (count) => `${String(count)} ${countOf(count, 'página', 'páginas')}`,
        unassigned: 'Sem volume',
        volume: (number) => `Volume ${number}`,
        moveTo: 'Mover os capítulos selecionados para',
        createFirst: 'Crie um volume primeiro',
        assignSelected: 'Atribuir selecionados',
        unassign: 'Tirar do volume',
        range: {
          legend: 'Atribuir um intervalo de capítulos',
          note: 'O primeiro e o último capítulo estão incluídos.',
          from: 'De',
          through: 'Até',
          volume: 'Volume',
          assign: 'Atribuir intervalo',
        },
      },
      volumes: {
        title: 'Volumes',
        created: (count) => `${String(count)} ${countOf(count, 'criado', 'criados')}`,
        newNumber: 'Número do novo volume',
        addLabel: 'Adicionar volume',
        add: 'Adicionar',
        help: 'Adicionar cria um volume com este número. O número seguinte aumenta sozinho.',
        none: 'Ainda não há volumes.',
        number: 'Número do volume',
        numberFor: (number) => `Número do volume ${number}`,
        remove: (number) => `Remover o volume ${number}`,
        chapterCount: (count) => `${String(count)} ${countOf(count, 'capítulo', 'capítulos')}`,
        splitBefore: 'Dividir antes de',
        splitLabel: (number) => `Dividir o volume ${number}`,
        split: 'Dividir',
        splitHelp: 'Este capítulo e todos os seguintes passam para um novo volume.',
        mergeInto: (number) => `Juntar ao volume ${number}`,
      },
      check: {
        title: 'Verificação',
        ready: 'Todos os capítulos estão prontos para agrupar.',
        errorsLabel: 'Erros do mapeamento',
        fixFirst: 'Corrija antes de continuar',
        warningsLabel: 'Avisos do mapeamento',
        checkThese: 'Confira estes capítulos',
        confirm: 'Confirmar mapeamento',
      },
    },
    summary: {
      title: 'Mapeamento de capítulos proposto',
      counts: (volumes, assigned, chapters) =>
        `${String(volumes)} ${countOf(volumes, 'volume', 'volumes')} · ${String(assigned)} de ${String(chapters)} ${countOf(chapters, 'capítulo atribuído', 'capítulos atribuídos')}`,
      edit: 'Editar o mapeamento',
      volumeLine: (chapters, first, last) =>
        `${String(chapters)} ${countOf(chapters, 'capítulo', 'capítulos')}${
          chapters === 1
            ? ` · ${first}`
            : chapters > 1
              ? ` · primeiro: ${first} · último: ${last}`
              : ''
        }`,
      review: 'Revise esta proposta antes de continuar.',
      confirm: 'Confirmar mapeamento',
    },
    chaptersFrom: {
      title: 'Capítulos vindos de',
      tabs: { names: 'Nomes dos arquivos', online: 'Fonte online', manual: 'Manual' },
      names: {
        none: (onlineAvailable) =>
          `Não há agrupamento pelos nomes dos arquivos aqui. ${
            onlineAvailable
              ? 'Use uma fonte online ou agrupe os capítulos você mesmo.'
              : 'Agrupe os capítulos você mesmo.'
          }`,
        read: (volumes, chapters) =>
          `${String(volumes)} ${countOf(volumes, 'volume foi lido', 'volumes foram lidos')} dos nomes de ${String(chapters)} ${countOf(chapters, 'capítulo', 'capítulos')}, sem usar a internet.`,
        startOver: 'Recomeçar a partir dos nomes',
      },
      manual: {
        noVolumesTitle: 'Nenhum volume encontrado nos nomes dos arquivos',
        buildHere: 'Monte os volumes aqui; nenhuma fonte online é necessária.',
        buildOrTry: (online) =>
          `Monte-os aqui, ou experimente ${online} para receber uma sugestão. Nada é buscado automaticamente.`,
        text: 'Selecione capítulos ou um intervalo para atribuir a volumes. Você pode movê-los depois. As edições manuais ficam neste computador.',
      },
      online: {
        pick: 'Escolha uma fonte para consultar quais capítulos pertencem a cada volume. Nada é enviado a lugar nenhum até você buscar.',
        dataBy: 'Dados de volumes de',
        open: (name) => `Abrir ${name} no navegador`,
        search: (name) => `Buscar em ${name}`,
        placeholder: 'Título do mangá',
        searchButton: 'Buscar',
        privacy: (name) =>
          `Buscar envia o título para ${name}. Só os números de volumes e de capítulos são usados, e nada é baixado de lá.`,
        language: (language) =>
          ` Os volumes são procurados em ${language}, o idioma das suas pastas.`,
        searching: 'Buscando…',
        matches: 'Resultados',
        applying: 'Aplicando…',
        use: 'Usar estes volumes',
        noVolumes: (name) =>
          `${name} tem esta série, mas sem volumes: lá os capítulos não estão agrupados em volumes. A série ainda pode ser um livro só: escolha “Um livro para a série inteira” em Livros, ou agrupe os capítulos você mesmo.`,
        noMatch: (name) =>
          `${name} tem volumes para esta série, mas nenhum deles tem um capítulo desta pasta, então nada foi agrupado. Confira se a numeração dos capítulos confere, ou agrupe os capítulos você mesmo.`,
      },
    },
    providers: {
      label: 'Fonte',
      noneDetail: 'Só os nomes das pastas e as suas edições',
      none: 'Nenhuma fonte online',
      select: 'Escolher uma fonte',
    },
    noMatches: {
      label: 'Nenhum resultado',
      text: (query, fix) =>
        `Nenhum resultado para “${query}”. Caracteres a mais ${fix === 'title' ? 'no título' : 'na busca'} podem impedir que uma obra seja encontrada. ${
          fix === 'title'
            ? 'Tente um título mais simples acima'
            : 'Tente palavras mais simples acima'
        } e busque de novo.`,
    },
  },
  ja: {
    editor: {
      kicker: '各話と巻の割り当て',
      origin: {
        suggestedBy: (source) => `${source} からの提案`,
        groupedByMangabind: 'mangabind によるまとめ · オフライン',
        manual: '手動の割り当て · オフライン',
      },
      title: (manga) =>
        manga === '' ? 'タイトルのないマンガを本にまとめる' : `「${manga}」を本にまとめる`,
      introEditing:
        '各話を選んで巻に割り当て、競合があれば解消してから進みます。すでに割り当て済みの話をもう一度割り当てると、その話は移動します。',
      introReviewing:
        '提案された巻を下で確認するか、エディターを開いて各話の割り当てを変更します。',
      showSummary: '割り当ての概要を表示',
      history: {
        label: '編集履歴',
        undo: '直前の割り当ての編集を元に戻す',
        redo: '割り当ての編集をやり直す',
        reset: 'すべての割り当ての編集をリセット',
      },
      leftOut: '対象外のフォルダー',
      versions: {
        text: (count) =>
          `このフォルダーの ${String(count)} 話に複数の版があり、使う版を選んであります。`,
        open: '版を見直す',
        edited: '先に、巻への変更を元に戻すか確定してください。そのままでは失われます。',
      },
      books: {
        legend: '本',
        perVolume: {
          label: '巻ごとに 1 冊',
          help: '巻が必要です。ファイル名、オンラインの情報源、または手作業で作ります。',
        },
        series: {
          label: 'シリーズ全体で 1 冊',
          help: '巻は不要です。各話が目次になります。巻を作った場合は、その巻が目次の最上位になります。',
          produces: {
            epub: 'シリーズ全体で 1 つの EPUB を作成します。各話（巻がある場合は各巻も）が目次に入ります。巻は不要です。',
            cbz: 'シリーズ全体で 1 つの CBZ を作成します。各話（巻がある場合は各巻も）がフォルダーになります。目次はありません。',
            pdf: 'シリーズ全体で 1 つの PDF を作成します。ページが順番に並び、各話（巻がある場合は各巻も）のしおりが付きます。',
          },
        },
        asIs: {
          label: 'フォルダーをそのまま変換',
          help: 'まとめは行いません。フォルダーが 1 冊の本として mangaprep に渡されます。',
        },
        noVolumes: {
          text: 'このシリーズに巻は不要です。各話が本の目次になります。巻を目次の最上位にしたい場合にだけ、各話を巻にまとめてください。',
          done: '完了',
          group: '巻にまとめる',
        },
        inLibrary: {
          title: 'タイトルごとに 1 冊',
          text: '割り当てた巻はタイトルの本の最上位になり、その下に各話が入ります。EPUB では目次、PDF ではしおり、CBZ ではフォルダーになります。',
        },
      },
      start: {
        text: 'まず巻を作成し、そこに各話を割り当てます。',
        createFirst: '最初の巻を作成',
        createVolume: (number) => `${number} 巻を作成`,
      },
      confirmed: '割り当てを確定しました。',
      editFailed: 'その編集を適用できませんでした。何も変更されていません。',
      saveFailed: '割り当てを保存できませんでした。',
      chapters: {
        title: '各話',
        selected: (selected, total) => `${String(total)} 話中 ${String(selected)} 話を選択`,
        clearAll: 'すべてクリア',
        selectAll: 'すべて選択',
        select: (name) => `「${name}」を選択`,
        pages: (count) => `${String(count)} ページ`,
        unassigned: '未割り当て',
        volume: (number) => `${number} 巻`,
        moveTo: '選択した各話の移動先',
        createFirst: '先に巻を作成してください',
        assignSelected: '選択した各話を割り当て',
        unassign: '割り当てを解除',
        range: {
          legend: '各話の範囲を割り当てる',
          note: '最初の話と最後の話も含まれます。',
          from: '開始',
          through: '終了',
          volume: '巻',
          assign: '範囲を割り当て',
        },
      },
      volumes: {
        title: '巻',
        created: (count) => `${String(count)} 巻を作成済み`,
        newNumber: '新しい巻の番号',
        addLabel: '巻を追加',
        add: '追加',
        help: '「追加」を押すと、この番号で巻を作成します。次の番号は自動的に増えます。',
        none: 'まだ巻がありません。',
        number: '巻番号',
        numberFor: (number) => `${number} 巻の巻番号`,
        remove: (number) => `${number} 巻を削除`,
        chapterCount: (count) => `${String(count)} 話`,
        splitBefore: '次の話の前で分割',
        splitLabel: (number) => `${number} 巻を分割`,
        split: '分割',
        splitHelp: 'この話と、それ以降のすべての話が、新しい巻に移ります。',
        mergeInto: (number) => `${number} 巻に統合`,
      },
      check: {
        title: '確定前のチェック',
        ready: 'すべての話を巻にまとめる準備ができています。',
        errorsLabel: '割り当てのエラー',
        fixFirst: '修正してから進んでください',
        warningsLabel: '割り当ての警告',
        checkThese: 'これらの話を確認してください',
        confirm: '割り当てを確定',
      },
    },
    summary: {
      title: '提案された各話の割り当て',
      counts: (volumes, assigned, chapters) =>
        `${String(volumes)} 巻 · ${String(chapters)} 話中 ${String(assigned)} 話を割り当て済み`,
      edit: '各話の割り当てを編集',
      volumeLine: (chapters, first, last) =>
        `${String(chapters)} 話${
          chapters === 1 ? ` · ${first}` : chapters > 1 ? ` · 最初: ${first} · 最後: ${last}` : ''
        }`,
      review: '進む前に、この提案を確認してください。',
      confirm: '割り当てを確定',
    },
    chaptersFrom: {
      title: '各話のまとめ方',
      tabs: { names: 'ファイル名', online: 'オンラインの情報源', manual: '手動' },
      names: {
        none: (onlineAvailable) =>
          `ここでは、ファイル名によるまとめを使えません。${
            onlineAvailable
              ? 'オンラインの情報源を使うか、各話を自分でまとめてください。'
              : '各話を自分でまとめてください。'
          }`,
        read: (volumes, chapters) =>
          `${String(chapters)} 話の名前から、オンラインを使わずに ${String(volumes)} 巻を読み取りました。`,
        startOver: 'ファイル名からやり直す',
      },
      manual: {
        noVolumesTitle: 'ファイル名から巻が見つかりませんでした',
        buildHere: 'ここで巻を作成できます。オンラインの情報源は不要です。',
        buildOrTry: (online) =>
          `ここで作成するか、${online} で提案を試してください。自動で検索されることはありません。`,
        text: '各話または範囲を選び、巻に割り当てます。あとから移動することもできます。手動の編集内容は、このパソコンにだけ保存されます。',
      },
      online: {
        pick: 'どの話がどの巻に入るかを調べる情報源を選んでください。検索するまでは、何も送信されません。',
        dataBy: '巻データの提供元',
        open: (name) => `${name} をブラウザーで開く`,
        search: (name) => `${name} で検索`,
        placeholder: 'マンガのタイトル',
        searchButton: '検索',
        privacy: (name) =>
          `検索すると、タイトルが ${name} に送信されます。使うのは巻と話の番号だけで、そこから何もダウンロードしません。`,
        language: (language) => `巻は、フォルダーの言語である ${language} で検索されます。`,
        searching: '検索中…',
        matches: '一致',
        applying: '適用中…',
        use: 'この巻を使う',
        noVolumes: (name) =>
          `${name} にはこのシリーズがありますが、巻の情報がありません。あちらでは各話が巻にまとめられていません。シリーズは 1 冊にすることもできます。「本」で「シリーズ全体で 1 冊」を選ぶか、各話を自分でまとめてください。`,
        noMatch: (name) =>
          `${name} にはこのシリーズの巻がありますが、このフォルダーの各話を含む巻がないため、何もまとめられませんでした。各話の番号が合っているか確認するか、各話を自分でまとめてください。`,
      },
    },
    providers: {
      label: '情報源',
      noneDetail: 'フォルダー名と編集内容だけ',
      none: 'オンラインの情報源なし',
      select: '情報源を選択',
    },
    noMatches: {
      label: '一致なし',
      text: (query, fix) =>
        `「${query}」に一致するものはありません。${fix === 'title' ? 'タイトル' : '検索語'}に余分な文字があると、作品が見つからないことがあります。上の${
          fix === 'title' ? 'タイトルをもっと簡単に' : '言葉をもっと簡単に'
        }して、もう一度検索してください。`,
    },
  },
};
