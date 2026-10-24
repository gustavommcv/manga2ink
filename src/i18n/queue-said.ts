import type { Language } from '@/domain/app-settings';
import type { QueueMessageValues } from '@/domain/messages/queue';

import { countOf } from './count';
import { queueMessages } from './queue-messages';
import { namesOf, type SaidFor } from './say';

const english = queueMessages.en;
const portuguese = queueMessages['pt-BR'];
const japanese = queueMessages.ja;

/** What the queue says about each of its rows, in every language (ADR 0053). */
export const queueSaid: Readonly<Record<Language, SaidFor<QueueMessageValues>>> = {
  en: {
    'queue.chip.checking': () => 'Checking…',
    'queue.chip.unreadable': () => 'Could not read',
    'queue.chip.nothingToJoin': () => 'Nothing to join',
    'queue.chip.ready': () => 'Ready',
    'queue.chip.oneBook': () => 'One book',
    'queue.chip.notRecognized': () => 'Not recognized',
    'queue.chip.needsVolumes': () => 'Needs volumes',
    'queue.chip.needsGrouping': () => 'Needs grouping',
    'queue.chip.reviewVersions': () => 'Choose versions',
    'queue.chip.wholeSeries': () => 'Whole series',
    'queue.chip.saved': () => 'Saved',
    'queue.chip.volumes': ({ count }) => `${String(count)} ${countOf(count, 'volume', 'volumes')}`,
    'queue.chip.titles': ({ count }) => `${String(count)} ${countOf(count, 'title', 'titles')}`,

    'queue.detail.folderReading': () => 'Folder · reading it',
    'queue.detail.cbzChecking': () => 'CBZ · checking it',
    'queue.detail.folder': () => 'Folder',
    'queue.detail.cbz': () => 'CBZ',
    'queue.detail.cbzOneVolume': () => 'CBZ · already one volume',
    'queue.detail.cbzStraight': () => 'CBZ · goes straight to the e-reader step',
    'queue.detail.folderNoChapters': () => 'Folder · no chapters found',
    'queue.detail.folderChapters': ({ chapters, grouping }) =>
      `Folder · ${String(chapters)} ${countOf(chapters, 'chapter', 'chapters')}${
        grouping === 'not-grouped'
          ? ' · not grouped'
          : grouping === 'from-names'
            ? ' · grouped from names'
            : ''
      }`,
    'queue.detail.library': ({ titles }) =>
      `Library · ${String(titles)} ${countOf(titles, 'title', 'titles')}`,
    'queue.detail.libraryVolumes': ({ titles, volumes }) =>
      `Library · ${String(titles)} ${countOf(titles, 'title', 'titles')} · ${String(volumes)} ${countOf(volumes, 'volume', 'volumes')}`,

    'queue.note.noChapters': () =>
      `mangabind found no chapters here. Turn off "${english.steps.group}" to convert the folder as one book.`,
    'queue.note.onlyLinks': ({ names }) => {
      const one = names.length === 1;
      return `${one ? 'A folder in it is a link' : `${String(names.length)} folders in it are links`}, and mangabind does not follow links to a series, so ${one ? 'it was' : 'they were'} not read: ${namesOf(names, (more) => ` and ${String(more)} more`)}. Put the real ${one ? 'folder' : 'folders'} in the library and add it again.`;
    },
    'queue.note.noVolumesYet': () =>
      `No volumes yet. Open ${english.row.editVolumes} to group the chapters, or make one book of the whole series.`,
    'queue.note.versionsPending': ({ count }) =>
      `${String(count)} ${countOf(count, 'chapter comes', 'chapters come')} in more than one version. Open ${english.row.reviewVersions} to choose which to use; your files stay where they are.`,
    'queue.note.unassigned': ({ count }) =>
      `${String(count)} ${countOf(count, 'chapter', 'chapters')} still ${countOf(count, 'has', 'have')} no volume. Open ${english.row.editVolumes} to place ${countOf(count, 'it', 'them')}, or accept the gaps there.`,
    'queue.note.chaptersLeftOut': ({ count }) =>
      `${String(count)} ${countOf(count, 'chapter', 'chapters')} left out.`,
    'queue.note.libraryEmpty': () => 'mangabind found no manga in this folder.',
    'queue.note.titlesNeedVolumes': ({ count }) =>
      `${String(count)} ${countOf(count, 'title', 'titles')} ${countOf(count, 'has', 'have')} no volumes yet. Use the pencil on this row to group ${countOf(count, 'it', 'them')}.`,
    'queue.note.titlesLeftOut': ({ count }) =>
      `${String(count)} ${countOf(count, 'title', 'titles')} left out until they have volumes.`,
    'queue.note.titlesFailed': ({ count }) =>
      `${String(count)} ${countOf(count, 'title', 'titles')} failed last time and will run again.`,
    'queue.note.unrecognizedChapters': ({ names, again }) =>
      `${leftOutIn(names.length)}: ${namesOf(names, (more) => ` and ${String(more)} more`)}. ${renameThemIn(names.length)}, then add the ${again} again.`,
    'queue.note.unrecognizedInLibrary': ({ titles }) => {
      const folders = titles.reduce((count, title) => count + title.names.length, 0);
      const where = titles.map(
        (title) =>
          `${title.title} (${namesOf(title.names, (more) => ` and ${String(more)} more`)})`,
      );
      return `${leftOutIn(folders)}: ${namesOf(where, (more) => ` and ${String(more)} more titles`)}. ${renameThemIn(folders)}, then add the library again.`;
    },
  },
  'pt-BR': {
    'queue.chip.checking': () => 'Verificando…',
    'queue.chip.unreadable': () => 'Não foi possível ler',
    'queue.chip.nothingToJoin': () => 'Nada para juntar',
    'queue.chip.ready': () => 'Pronto',
    'queue.chip.oneBook': () => 'Um livro',
    'queue.chip.notRecognized': () => 'Não reconhecido',
    'queue.chip.needsVolumes': () => 'Precisa de volumes',
    'queue.chip.needsGrouping': () => 'Precisa agrupar',
    'queue.chip.reviewVersions': () => 'Escolher versões',
    'queue.chip.wholeSeries': () => 'Série inteira',
    'queue.chip.saved': () => 'Salvo',
    'queue.chip.volumes': ({ count }) => `${String(count)} ${countOf(count, 'volume', 'volumes')}`,
    'queue.chip.titles': ({ count }) => `${String(count)} ${countOf(count, 'título', 'títulos')}`,

    'queue.detail.folderReading': () => 'Pasta · lendo',
    'queue.detail.cbzChecking': () => 'CBZ · verificando',
    'queue.detail.folder': () => 'Pasta',
    'queue.detail.cbz': () => 'CBZ',
    'queue.detail.cbzOneVolume': () => 'CBZ · já é um volume',
    'queue.detail.cbzStraight': () => 'CBZ · vai direto para a etapa do e-reader',
    'queue.detail.folderNoChapters': () => 'Pasta · nenhum capítulo encontrado',
    'queue.detail.folderChapters': ({ chapters, grouping }) =>
      `Pasta · ${String(chapters)} ${countOf(chapters, 'capítulo', 'capítulos')}${
        grouping === 'not-grouped'
          ? ' · sem agrupar'
          : grouping === 'from-names'
            ? ' · agrupado pelos nomes'
            : ''
      }`,
    'queue.detail.library': ({ titles }) =>
      `Biblioteca · ${String(titles)} ${countOf(titles, 'título', 'títulos')}`,
    'queue.detail.libraryVolumes': ({ titles, volumes }) =>
      `Biblioteca · ${String(titles)} ${countOf(titles, 'título', 'títulos')} · ${String(volumes)} ${countOf(volumes, 'volume', 'volumes')}`,

    'queue.note.noChapters': () =>
      `O mangabind não encontrou capítulos aqui. Desligue “${portuguese.steps.group}” para converter a pasta como um livro só.`,
    'queue.note.onlyLinks': ({ names }) => {
      const one = names.length === 1;
      return `${one ? 'Uma pasta dentro dela é um link' : `${String(names.length)} pastas dentro dela são links`}, e o mangabind não segue links para uma série, então ${one ? 'ela não foi lida' : 'elas não foram lidas'}: ${namesOf(names, (more) => ` e mais ${String(more)}`)}. Coloque ${one ? 'a pasta real' : 'as pastas reais'} na biblioteca e adicione-a de novo.`;
    },
    'queue.note.noVolumesYet': () =>
      `Ainda não há volumes. Abra ${portuguese.row.editVolumes} para agrupar os capítulos, ou faça um livro só da série inteira.`,
    'queue.note.versionsPending': ({ count }) =>
      `${String(count)} ${countOf(count, 'capítulo vem', 'capítulos vêm')} em mais de uma versão. Abra ${portuguese.row.reviewVersions} para escolher qual usar; os seus arquivos continuam onde estão.`,
    'queue.note.unassigned': ({ count }) =>
      `${String(count)} ${countOf(count, 'capítulo ainda não tem', 'capítulos ainda não têm')} volume. Abra ${portuguese.row.editVolumes} para colocá-${countOf(count, 'lo', 'los')}, ou aceite as lacunas lá.`,
    'queue.note.chaptersLeftOut': ({ count }) =>
      `${String(count)} ${countOf(count, 'capítulo ficou', 'capítulos ficaram')} de fora.`,
    'queue.note.libraryEmpty': () => 'O mangabind não encontrou nenhum mangá nesta pasta.',
    'queue.note.titlesNeedVolumes': ({ count }) =>
      `${String(count)} ${countOf(count, 'título ainda não tem', 'títulos ainda não têm')} volumes. Use o lápis nesta linha para agrupá-${countOf(count, 'lo', 'los')}.`,
    'queue.note.titlesLeftOut': ({ count }) =>
      `${String(count)} ${countOf(count, 'título ficou de fora até ter', 'títulos ficaram de fora até terem')} volumes.`,
    'queue.note.titlesFailed': ({ count }) =>
      `${String(count)} ${countOf(count, 'título falhou', 'títulos falharam')} da última vez e ${countOf(count, 'vai', 'vão')} rodar de novo.`,
    'queue.note.unrecognizedChapters': ({ names, again }) =>
      `${leftOutPt(names.length)}: ${namesOf(names, (more) => ` e mais ${String(more)}`)}. ${renameThemPt(names.length)}, e depois adicione ${again === 'folder' ? 'a pasta' : 'a biblioteca'} de novo.`,
    'queue.note.unrecognizedInLibrary': ({ titles }) => {
      const folders = titles.reduce((count, title) => count + title.names.length, 0);
      const where = titles.map(
        (title) => `${title.title} (${namesOf(title.names, (more) => ` e mais ${String(more)}`)})`,
      );
      return `${leftOutPt(folders)}: ${namesOf(where, (more) => ` e mais ${String(more)} títulos`)}. ${renameThemPt(folders)}, e depois adicione a biblioteca de novo.`;
    },
  },
  ja: {
    'queue.chip.checking': () => '確認中…',
    'queue.chip.unreadable': () => '読み込めません',
    'queue.chip.nothingToJoin': () => 'まとめる対象なし',
    'queue.chip.ready': () => '準備完了',
    'queue.chip.oneBook': () => '1 冊',
    'queue.chip.notRecognized': () => '認識できません',
    'queue.chip.needsVolumes': () => '巻が必要',
    'queue.chip.needsGrouping': () => 'まとめが必要',
    'queue.chip.reviewVersions': () => '版を選択',
    'queue.chip.wholeSeries': () => 'シリーズ全体',
    'queue.chip.saved': () => '保存済み',
    'queue.chip.volumes': ({ count }) => `${String(count)} 巻`,
    'queue.chip.titles': ({ count }) => `${String(count)} タイトル`,

    'queue.detail.folderReading': () => 'フォルダー · 読み込み中',
    'queue.detail.cbzChecking': () => 'CBZ · 確認中',
    'queue.detail.folder': () => 'フォルダー',
    'queue.detail.cbz': () => 'CBZ',
    'queue.detail.cbzOneVolume': () => 'CBZ · すでに 1 巻',
    'queue.detail.cbzStraight': () => 'CBZ · そのままリーダー向けの手順へ',
    'queue.detail.folderNoChapters': () => 'フォルダー · 各話が見つかりません',
    'queue.detail.folderChapters': ({ chapters, grouping }) =>
      `フォルダー · ${String(chapters)} 話${
        grouping === 'not-grouped'
          ? ' · まとめていません'
          : grouping === 'from-names'
            ? ' · 名前からまとめ済み'
            : ''
      }`,
    'queue.detail.library': ({ titles }) => `ライブラリ · ${String(titles)} タイトル`,
    'queue.detail.libraryVolumes': ({ titles, volumes }) =>
      `ライブラリ · ${String(titles)} タイトル · ${String(volumes)} 巻`,

    'queue.note.noChapters': () =>
      `mangabind はここで各話を見つけられませんでした。フォルダーを 1 冊の本として変換するには、「${japanese.steps.group}」をオフにしてください。`,
    'queue.note.onlyLinks': ({ names }) =>
      `この中のフォルダー ${String(names.length)} 個はリンクです。mangabind はシリーズへのリンクをたどらないため、読み込まれませんでした: ${namesOf(names, (more) => ` ほか ${String(more)} 個`, '、')}。実際のフォルダーをライブラリに置いて、もう一度追加してください。`,
    'queue.note.noVolumesYet': () =>
      `まだ巻がありません。「${japanese.row.editVolumes}」を開いて各話をまとめるか、シリーズ全体を 1 冊にしてください。`,
    'queue.note.versionsPending': ({ count }) =>
      `${String(count)} 話に複数の版があります。「${japanese.row.reviewVersions}」を開いて使う版を選んでください。ファイルはそのままの場所に残ります。`,
    'queue.note.unassigned': ({ count }) =>
      `${String(count)} 話が、まだどの巻にも入っていません。「${japanese.row.editVolumes}」を開いて割り当てるか、抜けがあるまま進めることもできます。`,
    'queue.note.chaptersLeftOut': ({ count }) => `${String(count)} 話が対象外です。`,
    'queue.note.libraryEmpty': () =>
      'このフォルダーに、mangabind はマンガを見つけられませんでした。',
    'queue.note.titlesNeedVolumes': ({ count }) =>
      `${String(count)} タイトルには、まだ巻がありません。この行の鉛筆アイコンから、まとめてください。`,
    'queue.note.titlesLeftOut': ({ count }) =>
      `${String(count)} タイトルは、巻ができるまで対象外です。`,
    'queue.note.titlesFailed': ({ count }) =>
      `${String(count)} タイトルは前回失敗したため、もう一度実行されます。`,
    'queue.note.unrecognizedChapters': ({ names, again }) =>
      `${leftOutJa(names.length)}: ${namesOf(names, (more) => ` ほか ${String(more)} 個`, '、')}。${renameThemJa}、${again === 'folder' ? 'フォルダー' : 'ライブラリ'}をもう一度追加してください。`,
    'queue.note.unrecognizedInLibrary': ({ titles }) => {
      const folders = titles.reduce((count, title) => count + title.names.length, 0);
      const where = titles.map(
        (title) =>
          `${title.title}（${namesOf(title.names, (more) => ` ほか ${String(more)} 個`, '、')}）`,
      );
      return `${leftOutJa(folders)}: ${namesOf(where, (more) => ` ほか ${String(more)} タイトル`, '、')}。${renameThemJa}、ライブラリをもう一度追加してください。`;
    },
  },
};

function leftOutIn(count: number): string {
  const many = count === 1 ? 'A folder has' : `${String(count)} folders have`;
  return `${many} a name mangabind cannot read as a chapter, so ${count === 1 ? 'it is' : 'they are'} left out of the books`;
}

function renameThemIn(count: number): string {
  return `Rename ${count === 1 ? 'it' : 'them'} to include a chapter number (Ch.005, for one)`;
}

function leftOutPt(count: number): string {
  const many = count === 1 ? 'Uma pasta tem' : `${String(count)} pastas têm`;
  return `${many} um nome que o mangabind não consegue ler como capítulo, então ${count === 1 ? 'ela ficou' : 'elas ficaram'} de fora dos livros`;
}

function renameThemPt(count: number): string {
  return `Renomeie-${count === 1 ? 'a' : 'as'} para incluir um número de capítulo (Ch.005, por exemplo)`;
}

function leftOutJa(count: number): string {
  return `名前を各話として読み取れないフォルダーが ${String(count)} 個あり、本から除外されています`;
}

const renameThemJa = '各話の番号（たとえば Ch.005）を含む名前に変更してから';
