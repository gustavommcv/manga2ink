import type { Language } from '@/domain/app-settings';
import type { RunMessageValues, RunShape } from '@/domain/messages/run';

import { countOf } from './count';
import type { SaidFor } from './say';

const plural = (count: number, one: string, other: string): string =>
  `${String(count)} ${countOf(count, one, other)}`;

/** The stages mangapress announces, in the words of Portuguese; another stage is said as the tool names it. */
const stagesInPortuguese: ReadonlyMap<string, string> = new Map([
  ['inspect', 'a leitura'],
  ['plan', 'o planejamento'],
  ['process', 'o processamento'],
  ['metadata', 'os metadados'],
  ['package', 'o empacotamento'],
]);

const where = (title: string | undefined, separator = ' · '): string =>
  title === undefined ? '' : `${title}${separator}`;

const inEnglishAfter: Readonly<Record<RunShape, string>> = {
  books: '',
  joined: ' · saved as CBZ files, mangapress not run',
  series: ' · single book for the series',
};

const inPortugueseAfter: Readonly<Record<RunShape, string>> = {
  books: '',
  joined: ' · salvos como arquivos CBZ, mangapress não executado',
  series: ' · um só livro para a série',
};

/** What a run says while it goes on, what validating found and how the results began, in every language (ADR 0053). */
export const runSaid: Readonly<Record<Language, SaidFor<RunMessageValues>>> = {
  en: {
    'progress.preparing': () => 'Preparing…',
    'progress.inspecting': ({ title }) => `Inspecting ${title}…`,
    'progress.organizing': ({ title }) => `Organizing chapters for ${title}…`,
    'progress.organizingChapters': ({ chapters }) =>
      `Organizing ${plural(chapters, 'chapter', 'chapters')} into volume files…`,
    'progress.bindingLibrary': () => 'Building volume files for the library…',
    'progress.buildingVolume': ({ volume, volumes }) =>
      `Building volume ${String(volume)} of ${String(volumes)}…`,
    'progress.converting': ({ title, volume }) =>
      `Converting ${where(title)}volume ${String(volume.number)} of ${String(volume.count)}…`,
    'progress.savingVolume': ({ title, volume }) =>
      `Saving ${where(title)}volume ${String(volume.number)} of ${String(volume.count)}…`,
    'progress.pageProcessed': ({ completed, total }) =>
      `Processed page ${String(completed)} of ${String(total)}.`,
    'progress.stageStarted': ({ stage }) => `Starting ${stage}…`,
    'progress.savingBook': () => 'Saving the finished book…',
    'progress.volumesConverted': ({ title, done, total }) =>
      `${where(title)}${String(done)} of ${String(total)} volumes converted.`,
    'progress.booksSaved': ({ count }) => `${plural(count, 'book', 'books')} saved.`,

    'plan.mangapress': ({ profile, width, height, chaptersNotGrouped }) =>
      `mangapress validated ${profile} · ${String(width)} × ${String(height)}${chaptersNotGrouped ? ' · one book, chapters not grouped' : ''} · no library files written`,
    'plan.mangabind': ({ volumes, shape }) =>
      `mangabind validated ${plural(volumes, 'volume', 'volumes')}${inEnglishAfter[shape]} · no library files written`,
    'plan.library': ({ titles, volumes, books, shape }) =>
      `mangabind validated ${plural(titles, 'title', 'titles')} · ${plural(volumes, 'volume', 'volumes')}${
        shape === 'series'
          ? ` · ${plural(books, 'EPUB', 'EPUBs')} (one per series)`
          : inEnglishAfter[shape]
      } · no library files written`,

    'summary.joined': () => 'Joined volumes · CBZ',
    'summary.books': ({ device, format, ownOptions }) =>
      `${device} · ${format}${ownOptions === 0 ? '' : ` · ${String(ownOptions)} with options of their own`}`,
    'summary.earlier': () => 'Ready to save or share',
  },
  'pt-BR': {
    'progress.preparing': () => 'Preparando…',
    'progress.inspecting': ({ title }) => `Analisando ${title}…`,
    'progress.organizing': ({ title }) => `Organizando os capítulos de ${title}…`,
    'progress.organizingChapters': ({ chapters }) =>
      `Organizando ${plural(chapters, 'capítulo', 'capítulos')} em arquivos de volume…`,
    'progress.bindingLibrary': () => 'Montando os arquivos de volume da biblioteca…',
    'progress.buildingVolume': ({ volume, volumes }) =>
      `Montando o volume ${String(volume)} de ${String(volumes)}…`,
    'progress.converting': ({ title, volume }) =>
      `Convertendo ${where(title)}volume ${String(volume.number)} de ${String(volume.count)}…`,
    'progress.savingVolume': ({ title, volume }) =>
      `Salvando ${where(title)}volume ${String(volume.number)} de ${String(volume.count)}…`,
    'progress.pageProcessed': ({ completed, total }) =>
      `Página ${String(completed)} de ${String(total)} processada.`,
    'progress.stageStarted': ({ stage }) => `Iniciando ${stagesInPortuguese.get(stage) ?? stage}…`,
    'progress.savingBook': () => 'Salvando o livro pronto…',
    'progress.volumesConverted': ({ title, done, total }) =>
      `${where(title)}${String(done)} de ${String(total)} volumes convertidos.`,
    'progress.booksSaved': ({ count }) => `${plural(count, 'livro salvo', 'livros salvos')}.`,

    'plan.mangapress': ({ profile, width, height, chaptersNotGrouped }) =>
      `mangapress validou ${profile} · ${String(width)} × ${String(height)}${chaptersNotGrouped ? ' · um livro, capítulos sem agrupar' : ''} · nenhum arquivo da biblioteca gravado`,
    'plan.mangabind': ({ volumes, shape }) =>
      `mangabind validou ${plural(volumes, 'volume', 'volumes')}${inPortugueseAfter[shape]} · nenhum arquivo da biblioteca gravado`,
    'plan.library': ({ titles, volumes, books, shape }) =>
      `mangabind validou ${plural(titles, 'título', 'títulos')} · ${plural(volumes, 'volume', 'volumes')}${
        shape === 'series'
          ? ` · ${plural(books, 'EPUB', 'EPUBs')} (um por série)`
          : inPortugueseAfter[shape]
      } · nenhum arquivo da biblioteca gravado`,

    'summary.joined': () => 'Volumes unidos · CBZ',
    'summary.books': ({ device, format, ownOptions }) =>
      `${device} · ${format}${ownOptions === 0 ? '' : ` · ${String(ownOptions)} com opções próprias`}`,
    'summary.earlier': () => 'Pronto para salvar ou compartilhar',
  },
};
