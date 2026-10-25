import type { Language } from '@/domain/app-settings';
import type { RunMessageValues, RunShape } from '@/domain/messages/run';

import { countOf } from './count';
import type { SaidFor } from './say';

const plural = (count: number, one: string, other: string): string =>
  `${String(count)} ${countOf(count, one, other)}`;

/** The stages mangaprep announces, in the words of Portuguese; another stage is said as the tool names it. */
const stagesInPortuguese: ReadonlyMap<string, string> = new Map([
  ['inspect', 'a leitura'],
  ['plan', 'o planejamento'],
  ['process', 'o processamento'],
  ['metadata', 'os metadados'],
  ['package', 'o empacotamento'],
]);

/** The stages mangaprep announces, in the words of Japanese; another stage is said as the tool names it. */
const stagesInJapanese: ReadonlyMap<string, string> = new Map([
  ['inspect', '読み込み'],
  ['plan', '計画'],
  ['process', '処理'],
  ['metadata', 'メタデータの処理'],
  ['package', 'パッケージ化'],
]);

const where = (title: string | undefined, separator = ' · '): string =>
  title === undefined ? '' : `${title}${separator}`;

const inEnglishAfter: Readonly<Record<RunShape, string>> = {
  books: '',
  joined: ' · saved as CBZ files, mangaprep not run',
  series: ' · single book for the series',
};

const inPortugueseAfter: Readonly<Record<RunShape, string>> = {
  books: '',
  joined: ' · salvos como arquivos CBZ, mangaprep não executado',
  series: ' · um só livro para a série',
};

const inJapaneseAfter: Readonly<Record<RunShape, string>> = {
  books: '',
  joined: ' · CBZ ファイルとして保存（mangaprep は実行しません）',
  series: ' · シリーズ全体で 1 冊',
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

    'plan.mangaprep': ({ profile, width, height, chaptersNotGrouped }) =>
      `mangaprep validated ${profile} · ${String(width)} × ${String(height)}${chaptersNotGrouped ? ' · one book, chapters not grouped' : ''} · no library files written`,
    'plan.mangabind': ({ volumes, shape }) =>
      `mangabind validated ${plural(volumes, 'volume', 'volumes')}${inEnglishAfter[shape]} · no library files written`,
    'plan.series': ({ volumes, chapters }) =>
      `mangabind validated ${chapters > 0 ? plural(chapters, 'chapter', 'chapters') : 'the series'}${volumes > 0 ? ` in ${plural(volumes, 'volume', 'volumes')}` : ''} · one book for the whole series · no library files written`,
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

    'plan.mangaprep': ({ profile, width, height, chaptersNotGrouped }) =>
      `mangaprep validou ${profile} · ${String(width)} × ${String(height)}${chaptersNotGrouped ? ' · um livro, capítulos sem agrupar' : ''} · nenhum arquivo da biblioteca gravado`,
    'plan.mangabind': ({ volumes, shape }) =>
      `mangabind validou ${plural(volumes, 'volume', 'volumes')}${inPortugueseAfter[shape]} · nenhum arquivo da biblioteca gravado`,
    'plan.series': ({ volumes, chapters }) =>
      `mangabind validou ${chapters > 0 ? plural(chapters, 'capítulo', 'capítulos') : 'a série'}${volumes > 0 ? ` em ${plural(volumes, 'volume', 'volumes')}` : ''} · um livro para a série inteira · nenhum arquivo da biblioteca gravado`,
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
  ja: {
    'progress.preparing': () => '準備中…',
    'progress.inspecting': ({ title }) => `「${title}」を調べています…`,
    'progress.organizing': ({ title }) => `「${title}」の各話を整理しています…`,
    'progress.organizingChapters': ({ chapters }) =>
      `${String(chapters)} 話を巻のファイルにまとめています…`,
    'progress.bindingLibrary': () => 'ライブラリの巻ファイルを作成しています…',
    'progress.buildingVolume': ({ volume, volumes }) =>
      `${String(volumes)} 巻中 ${String(volume)} 巻目を作成しています…`,
    'progress.converting': ({ title, volume }) =>
      `${where(title)}${String(volume.count)} 巻中 ${String(volume.number)} 巻目を変換しています…`,
    'progress.savingVolume': ({ title, volume }) =>
      `${where(title)}${String(volume.count)} 巻中 ${String(volume.number)} 巻目を保存しています…`,
    'progress.pageProcessed': ({ completed, total }) =>
      `${String(total)} ページ中 ${String(completed)} ページを処理しました。`,
    'progress.stageStarted': ({ stage }) => {
      const name = stagesInJapanese.get(stage);
      return name === undefined ? `${stage} を開始しています…` : `${name}を開始しています…`;
    },
    'progress.savingBook': () => '完成した本を保存しています…',
    'progress.volumesConverted': ({ title, done, total }) =>
      `${where(title)}${String(total)} 巻中 ${String(done)} 巻の変換が完了しました。`,
    'progress.booksSaved': ({ count }) => `${String(count)} 冊を保存しました。`,

    'plan.mangaprep': ({ profile, width, height, chaptersNotGrouped }) =>
      `mangaprep の検証: ${profile} · ${String(width)} × ${String(height)}${chaptersNotGrouped ? ' · 1 冊、各話はまとめていません' : ''} · ライブラリのファイルは書き込まれていません`,
    'plan.mangabind': ({ volumes, shape }) =>
      `mangabind の検証: ${String(volumes)} 巻${inJapaneseAfter[shape]} · ライブラリのファイルは書き込まれていません`,
    'plan.series': ({ volumes, chapters }) =>
      `mangabind の検証: ${chapters > 0 ? `${String(chapters)} 話` : 'シリーズ'}${volumes > 0 ? `（${String(volumes)} 巻）` : ''} · シリーズ全体で 1 冊 · ライブラリのファイルは書き込まれていません`,
    'plan.library': ({ titles, volumes, books, shape }) =>
      `mangabind の検証: ${String(titles)} タイトル · ${String(volumes)} 巻${
        shape === 'series'
          ? ` · EPUB ${String(books)} 冊（シリーズごとに 1 冊）`
          : inJapaneseAfter[shape]
      } · ライブラリのファイルは書き込まれていません`,

    'summary.joined': () => 'まとめた巻 · CBZ',
    'summary.books': ({ device, format, ownOptions }) =>
      `${device} · ${format}${ownOptions === 0 ? '' : ` · 専用のオプション ${String(ownOptions)} 個`}`,
    'summary.earlier': () => '保存または共有できます',
  },
};
