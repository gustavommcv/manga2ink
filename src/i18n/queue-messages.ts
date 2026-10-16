import type { Language } from '@/domain/app-settings';

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
      readonly produces: string;
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
  };
  readonly plans: {
    readonly validated: string;
    readonly nothingWritten: string;
    readonly pages: (count: number) => string;
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
        produces: 'Produces a single EPUB with volumes and chapters in the table of contents.',
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
    },
    plans: {
      validated: 'Plan validated',
      nothingWritten: 'No library files were written.',
      pages: (count) => `${String(count)} ${countOf(count, 'page', 'pages')}`,
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
        produces: 'Gera um único EPUB com volumes e capítulos no sumário.',
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
    },
    plans: {
      validated: 'Plano validado',
      nothingWritten: 'Nenhum arquivo da biblioteca foi gravado.',
      pages: (count) => `${String(count)} ${countOf(count, 'página', 'páginas')}`,
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
};
