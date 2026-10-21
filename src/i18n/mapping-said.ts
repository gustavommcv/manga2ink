import type { Language } from '@/domain/app-settings';
import type { MappingMessageValues } from '@/domain/messages/mapping';

import { countOf } from './count';
import type { SaidFor } from './say';

/** What the editor of the mapping says of an edit that was refused and of what to fix, in every language (ADR 0053). */
export const mappingSaid: Readonly<Record<Language, SaidFor<MappingMessageValues>>> = {
  en: {
    'mapping.invalidVolumeNumber': ({ value }) => `Invalid volume number: ${value}`,
    'mapping.chapterNotMappable': ({ name }) =>
      `${name} does not have a chapter number mangabind can map.`,
    'mapping.chapterBadSpecial': ({ name }) => `${name} has an unsupported special-chapter suffix.`,
    'mapping.unknownChapter': ({ id }) => `Unknown chapter: ${id}`,
    'mapping.unknownVolume': ({ id }) => `Unknown volume: ${id}`,
    'mapping.duplicateChapterId': ({ id }) => `Duplicate chapter id: ${id}`,
    'mapping.duplicateVolumeId': ({ id }) => `Duplicate volume id: ${id}`,
    'mapping.chooseOneChapter': () => 'Choose at least one chapter.',
    'mapping.splitLeavesNone': () => 'A split must leave at least one chapter in each volume.',
    'mapping.chooseTwoVolumes': () => 'Choose two different volumes to merge.',
    'mapping.hasErrors': () =>
      'The chapter-to-volume mapping has errors that must be fixed before it can be saved.',

    'mapping.issue.invalidSource': () =>
      'A suggested mapping must identify both its provider and work.',
    'mapping.issue.emptyVolume': ({ number }) => `Volume ${number} has no chapters.`,
    'mapping.issue.unparseable': ({ name }) => `${name} cannot be represented in mangabind.json.`,
    'mapping.issue.filenameConflict': ({ name, named, volume }) =>
      `${name} names volume ${String(named)}, which mangabind will keep instead of volume ${volume}.`,
    'mapping.issue.duplicateVolume': ({ number }) => `More than one volume is numbered ${number}.`,
    'mapping.issue.duplicateSources': ({ token }) =>
      `More than one source represents chapter ${token}; mangabind cannot choose between them.`,
    'mapping.issue.copiesInFolder': ({ token }) =>
      `Chapter ${token} is in the folder more than once. mangabind cannot choose between the copies and would leave all of them out of the book; remove all but one from the folder.`,
    'mapping.issue.unassigned': ({ count }) =>
      `${String(count)} ${countOf(count, 'chapter is', 'chapters are')} not assigned to a volume.`,
  },
  'pt-BR': {
    'mapping.invalidVolumeNumber': ({ value }) => `Número de volume inválido: ${value}`,
    'mapping.chapterNotMappable': ({ name }) =>
      `${name} não tem um número de capítulo que o mangabind consiga mapear.`,
    'mapping.chapterBadSpecial': ({ name }) =>
      `${name} tem um sufixo de capítulo especial que não é aceito.`,
    'mapping.unknownChapter': ({ id }) => `Capítulo desconhecido: ${id}`,
    'mapping.unknownVolume': ({ id }) => `Volume desconhecido: ${id}`,
    'mapping.duplicateChapterId': ({ id }) => `Id de capítulo repetido: ${id}`,
    'mapping.duplicateVolumeId': ({ id }) => `Id de volume repetido: ${id}`,
    'mapping.chooseOneChapter': () => 'Escolha pelo menos um capítulo.',
    'mapping.splitLeavesNone': () =>
      'Uma divisão precisa deixar pelo menos um capítulo em cada volume.',
    'mapping.chooseTwoVolumes': () => 'Escolha dois volumes diferentes para juntar.',
    'mapping.hasErrors': () =>
      'O mapeamento de capítulos para volumes tem erros que precisam ser corrigidos antes de ser salvo.',

    'mapping.issue.invalidSource': () =>
      'Um mapeamento sugerido precisa identificar o provedor e a obra.',
    'mapping.issue.emptyVolume': ({ number }) => `O volume ${number} não tem capítulos.`,
    'mapping.issue.unparseable': ({ name }) =>
      `${name} não pode ser representado no mangabind.json.`,
    'mapping.issue.filenameConflict': ({ name, named, volume }) =>
      `${name} indica o volume ${String(named)}, que o mangabind vai manter no lugar do volume ${volume}.`,
    'mapping.issue.duplicateVolume': ({ number }) =>
      `Mais de um volume está numerado como ${number}.`,
    'mapping.issue.duplicateSources': ({ token }) =>
      `Mais de uma fonte representa o capítulo ${token}; o mangabind não consegue escolher entre elas.`,
    'mapping.issue.copiesInFolder': ({ token }) =>
      `O capítulo ${token} está na pasta mais de uma vez. O mangabind não consegue escolher entre as cópias e deixaria todas elas de fora do livro; deixe só uma na pasta.`,
    'mapping.issue.unassigned': ({ count }) =>
      `${String(count)} ${countOf(count, 'capítulo não está atribuído', 'capítulos não estão atribuídos')} a um volume.`,
  },
  ja: {
    'mapping.invalidVolumeNumber': ({ value }) => `巻番号が正しくありません: ${value}`,
    'mapping.chapterNotMappable': ({ name }) =>
      `「${name}」には、mangabind が割り当てられる話の番号がありません。`,
    'mapping.chapterBadSpecial': ({ name }) =>
      `「${name}」には、対応していない特別話の接尾辞が付いています。`,
    'mapping.unknownChapter': ({ id }) => `不明な話: ${id}`,
    'mapping.unknownVolume': ({ id }) => `不明な巻: ${id}`,
    'mapping.duplicateChapterId': ({ id }) => `話の ID が重複しています: ${id}`,
    'mapping.duplicateVolumeId': ({ id }) => `巻の ID が重複しています: ${id}`,
    'mapping.chooseOneChapter': () => '少なくとも 1 つの話を選んでください。',
    'mapping.splitLeavesNone': () =>
      '分割したあとも、各巻に少なくとも 1 つの話が残る必要があります。',
    'mapping.chooseTwoVolumes': () => '統合する巻を、異なる 2 つ選んでください。',
    'mapping.hasErrors': () =>
      '各話と巻の割り当てにエラーがあります。保存する前に修正してください。',

    'mapping.issue.invalidSource': () => '提案された割り当てには、提供元と作品の両方が必要です。',
    'mapping.issue.emptyVolume': ({ number }) => `${number} 巻に話がありません。`,
    'mapping.issue.unparseable': ({ name }) => `「${name}」は mangabind.json で表せません。`,
    'mapping.issue.filenameConflict': ({ name, named, volume }) =>
      `「${name}」は ${String(named)} 巻を示しているため、mangabind は ${volume} 巻ではなく ${String(named)} 巻に入れます。`,
    'mapping.issue.duplicateVolume': ({ number }) => `巻番号 ${number} が複数の巻に付いています。`,
    'mapping.issue.duplicateSources': ({ token }) =>
      `${token} 話を表す元が複数あり、mangabind はどれかを選べません。`,
    'mapping.issue.copiesInFolder': ({ token }) =>
      `${token} 話がフォルダーに複数あります。mangabind はどのコピーを使うか選べず、すべてを本から除外します。1 つを残して、ほかをフォルダーから取り除いてください。`,
    'mapping.issue.unassigned': ({ count }) =>
      `${String(count)} 話が、どの巻にも割り当てられていません。`,
  },
};
