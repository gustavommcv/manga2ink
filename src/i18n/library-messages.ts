import type { Language } from '@/domain/app-settings';

import { countOf } from './count';

/**
 * The words of the screen of a library (ADR 0052). The names of the buttons of a title that it shares
 * with the rows of the queue (edit the volumes, the details) are the queue's.
 */
export interface LibraryMessages {
  /** How many titles the library holds, and what happens to one with no volumes. */
  readonly summary: (titles: number) => string;
  /** How the books of every title are made: one for each volume, or one for each title (ADR 0094). */
  readonly books: {
    readonly label: string;
    readonly perVolume: string;
    readonly perVolumeNote: string;
    readonly series: string;
    readonly seriesNote: string;
  };
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
    books: {
      label: 'Books',
      perVolume: 'One book per volume',
      perVolumeNote: 'Each volume of each title is made into a book of its own.',
      series: 'One book for each title',
      seriesNote:
        'Each title becomes one book, with its volumes as the first level of its table of contents. A title still needs its volumes.',
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
    books: {
      label: 'Livros',
      perVolume: 'Um livro por volume',
      perVolumeNote: 'Cada volume de cada título vira um livro próprio.',
      series: 'Um livro para cada título',
      seriesNote:
        'Cada título vira um livro só, com os volumes como primeiro nível do sumário. Um título ainda precisa dos seus volumes.',
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
  ja: {
    summary: (titles) =>
      `${String(titles)} タイトル。巻のないタイトルは、まとめるまで処理の対象から外れます。`,
    books: {
      label: '本',
      perVolume: '巻ごとに 1 冊',
      perVolumeNote: '各タイトルの各巻が、それぞれ 1 冊の本になります。',
      series: 'タイトルごとに 1 冊',
      seriesNote:
        '各タイトルが 1 冊の本になり、巻は目次の最上位になります。タイトルには、引き続き巻が必要です。',
    },
    titles: 'タイトル',
    chips: {
      saved: '保存済み',
      failed: '失敗',
      needsVolumes: '巻が必要',
      volumes: (count) => `${String(count)} 巻`,
    },
    chapters: (chapters, leftOut) =>
      `${String(chapters)} 話${leftOut > 0 ? ` · 対象外 ${String(leftOut)} 話` : ''}`,
    editOptions: (set) =>
      set ? 'このタイトルの変換オプションを編集（設定済み）' : 'このタイトルの変換オプションを編集',
  },
};
