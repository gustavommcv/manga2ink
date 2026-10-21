import type { Language } from '@/domain/app-settings';

import { countOf } from './count';

/**
 * The words of the screen of a library (ADR 0052). The names of the buttons of a title that it shares
 * with the rows of the queue (edit the volumes, the details) are the queue's.
 */
export interface LibraryMessages {
  /** How many titles the library holds, and what happens to one with no volumes. */
  readonly summary: (titles: number) => string;
  readonly singleBook: { readonly title: string; readonly text: string };
  readonly titles: string;
  readonly chips: {
    readonly saved: string;
    readonly failed: string;
    readonly needsVolumes: string;
    readonly volumes: (count: number) => string;
  };
  /** The chapters of a title, and how many are left out when some have no volume. */
  readonly chapters: (chapters: number, leftOut: number) => string;
  readonly editOptions: (set: boolean) => string;
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const libraryMessages: Readonly<Record<Language, LibraryMessages>> = {
  en: {
    summary: (titles) =>
      `${String(titles)} ${countOf(titles, 'title', 'titles')}. A title with no volumes is left out of a run until you group it.`,
    singleBook: {
      title: 'Single book mode',
      text: 'Each title in the library will be produced as its own single book.',
    },
    titles: 'Titles',
    chips: {
      saved: 'Saved',
      failed: 'Failed',
      needsVolumes: 'Needs volumes',
      volumes: (count) => `${String(count)} ${countOf(count, 'volume', 'volumes')}`,
    },
    chapters: (chapters, leftOut) =>
      `${String(chapters)} ${countOf(chapters, 'chapter', 'chapters')}${
        leftOut > 0
          ? ` · ${String(leftOut)} ${countOf(leftOut, 'chapter', 'chapters')} left out`
          : ''
      }`,
    editOptions: (set) =>
      set
        ? 'Edit conversion options for this title (set)'
        : 'Edit conversion options for this title',
  },
  'pt-BR': {
    summary: (titles) =>
      `${String(titles)} ${countOf(titles, 'título', 'títulos')}. Um título sem volumes fica de fora do processamento até você agrupá-lo.`,
    singleBook: {
      title: 'Modo de livro único',
      text: 'Cada título da biblioteca será gerado como um livro único próprio.',
    },
    titles: 'Títulos',
    chips: {
      saved: 'Salvo',
      failed: 'Falhou',
      needsVolumes: 'Precisa de volumes',
      volumes: (count) => `${String(count)} ${countOf(count, 'volume', 'volumes')}`,
    },
    chapters: (chapters, leftOut) =>
      `${String(chapters)} ${countOf(chapters, 'capítulo', 'capítulos')}${
        leftOut > 0
          ? ` · ${String(leftOut)} ${countOf(leftOut, 'capítulo ficou', 'capítulos ficaram')} de fora`
          : ''
      }`,
    editOptions: (set) =>
      set
        ? 'Editar as opções de conversão deste título (definidas)'
        : 'Editar as opções de conversão deste título',
  },
};
