import type { Language } from '@/domain/app-settings';
import type { QueueMessageValues } from '@/domain/messages/queue';

import { countOf } from './count';
import { queueMessages } from './queue-messages';
import { namesOf, type SaidFor } from './say';

const english = queueMessages.en;
const portuguese = queueMessages['pt-BR'];

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
      `No volumes yet. Open ${english.row.editVolumes} to group the chapters.`,
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
      `Ainda não há volumes. Abra ${portuguese.row.editVolumes} para agrupar os capítulos.`,
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
