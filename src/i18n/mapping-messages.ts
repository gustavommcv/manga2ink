import type { Language } from '@/domain/app-settings';

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
    /** "Organize … into volumes"; a title that is empty is said as an untitled manga. */
    readonly title: (manga: string) => string;
    readonly introEditing: string;
    readonly introReviewing: string;
    readonly skipGrouping: {
      readonly button: string;
      readonly singleBook: string;
      readonly detail: string;
    };
    readonly showSummary: string;
    readonly history: {
      readonly label: string;
      readonly undo: string;
      readonly redo: string;
      readonly reset: string;
    };
    readonly leftOut: string;
    readonly singleBook: { readonly title: string; readonly text: string };
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
      title: (manga) => `Organize ${manga === '' ? 'untitled manga' : manga} into volumes`,
      introEditing:
        'Select chapters, assign them to a volume, and fix any conflicts before continuing. Assigning an already placed chapter moves it.',
      introReviewing:
        'Review the proposed volumes below, or open the editor to change chapter assignments.',
      skipGrouping: {
        button: 'Skip grouping',
        singleBook: 'Single book mode requires grouping chapters into volumes.',
        detail:
          'Send the folder to mangapress as one book, without grouping chapters into volumes.',
      },
      showSummary: 'Show mapping summary',
      history: {
        label: 'Edit history',
        undo: 'Undo last mapping edit',
        redo: 'Redo last mapping edit',
        reset: 'Reset all mapping edits',
      },
      leftOut: 'Folders left out',
      singleBook: {
        title: 'Single book for the series',
        text: 'The mapped volumes become the top level of the single book, with their chapters under them: in the table of contents of an EPUB, in the bookmarks of a PDF, as folders in a CBZ.',
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
      title: (manga) => `Organizar ${manga === '' ? 'mangá sem título' : manga} em volumes`,
      introEditing:
        'Selecione capítulos, atribua-os a um volume e resolva os conflitos antes de continuar. Atribuir um capítulo que já está em um volume o move.',
      introReviewing:
        'Revise os volumes propostos abaixo, ou abra o editor para mudar em que volume cada capítulo fica.',
      skipGrouping: {
        button: 'Pular o agrupamento',
        singleBook: 'O modo de livro único exige agrupar os capítulos em volumes.',
        detail:
          'Enviar a pasta ao mangapress como um livro só, sem agrupar os capítulos em volumes.',
      },
      showSummary: 'Mostrar o resumo do mapeamento',
      history: {
        label: 'Histórico de edições',
        undo: 'Desfazer a última edição do mapeamento',
        redo: 'Refazer a última edição do mapeamento',
        reset: 'Desfazer todas as edições do mapeamento',
      },
      leftOut: 'Pastas deixadas de fora',
      singleBook: {
        title: 'Um livro para a série',
        text: 'Os volumes mapeados serão o primeiro nível do livro único, com os capítulos dentro deles: no sumário de um EPUB, nos marcadores de um PDF, em pastas num CBZ.',
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
};
