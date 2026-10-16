import type { MappingMessageValues } from '@/domain/messages/mapping';

import type { Rows } from './said-table';

/** What the editor of the mapping says of an edit that was refused and of what to fix (ADR 0053). */
export const mappingRows: Rows<MappingMessageValues> = {
  'mapping.invalidVolumeNumber': [
    [{ value: 'abc' }, 'Invalid volume number: abc', 'Número de volume inválido: abc'],
  ],
  'mapping.chapterNotMappable': [
    [
      { name: 'Afterword' },
      'Afterword does not have a chapter number mangabind can map.',
      'Afterword não tem um número de capítulo que o mangabind consiga mapear.',
    ],
  ],
  'mapping.chapterBadSpecial': [
    [
      { name: 'Ch.2 extra' },
      'Ch.2 extra has an unsupported special-chapter suffix.',
      'Ch.2 extra tem um sufixo de capítulo especial que não é aceito.',
    ],
  ],
  'mapping.unknownChapter': [[{ id: 'c9' }, 'Unknown chapter: c9', 'Capítulo desconhecido: c9']],
  'mapping.unknownVolume': [[{ id: 'v9' }, 'Unknown volume: v9', 'Volume desconhecido: v9']],
  'mapping.duplicateChapterId': [
    [{ id: 'c1' }, 'Duplicate chapter id: c1', 'Id de capítulo repetido: c1'],
  ],
  'mapping.duplicateVolumeId': [
    [{ id: 'v1' }, 'Duplicate volume id: v1', 'Id de volume repetido: v1'],
  ],
  'mapping.chooseOneChapter': [
    [{}, 'Choose at least one chapter.', 'Escolha pelo menos um capítulo.'],
  ],
  'mapping.splitLeavesNone': [
    [
      {},
      'A split must leave at least one chapter in each volume.',
      'Uma divisão precisa deixar pelo menos um capítulo em cada volume.',
    ],
  ],
  'mapping.chooseTwoVolumes': [
    [{}, 'Choose two different volumes to merge.', 'Escolha dois volumes diferentes para juntar.'],
  ],
  'mapping.hasErrors': [
    [
      {},
      'The chapter-to-volume mapping has errors that must be fixed before it can be saved.',
      'O mapeamento de capítulos para volumes tem erros que precisam ser corrigidos antes de ser salvo.',
    ],
  ],

  'mapping.issue.invalidSource': [
    [
      {},
      'A suggested mapping must identify both its provider and work.',
      'Um mapeamento sugerido precisa identificar o provedor e a obra.',
    ],
  ],
  'mapping.issue.emptyVolume': [
    [{ number: '3' }, 'Volume 3 has no chapters.', 'O volume 3 não tem capítulos.'],
  ],
  'mapping.issue.unparseable': [
    [
      { name: 'Afterword' },
      'Afterword cannot be represented in mangabind.json.',
      'Afterword não pode ser representado no mangabind.json.',
    ],
  ],
  'mapping.issue.filenameConflict': [
    [
      { name: 'Vol.2 Ch.5', named: 2, volume: '1' },
      'Vol.2 Ch.5 names volume 2, which mangabind will keep instead of volume 1.',
      'Vol.2 Ch.5 indica o volume 2, que o mangabind vai manter no lugar do volume 1.',
    ],
  ],
  'mapping.issue.duplicateVolume': [
    [
      { number: '2' },
      'More than one volume is numbered 2.',
      'Mais de um volume está numerado como 2.',
    ],
  ],
  'mapping.issue.duplicateSources': [
    [
      { token: '2' },
      'More than one source represents chapter 2; mangabind cannot choose between them.',
      'Mais de uma fonte representa o capítulo 2; o mangabind não consegue escolher entre elas.',
    ],
  ],
  'mapping.issue.copiesInFolder': [
    [
      { token: '2' },
      'Chapter 2 is in the folder more than once. mangabind cannot choose between the copies and would leave all of them out of the book; remove all but one from the folder.',
      'O capítulo 2 está na pasta mais de uma vez. O mangabind não consegue escolher entre as cópias e deixaria todas elas de fora do livro; deixe só uma na pasta.',
    ],
  ],
  'mapping.issue.unassigned': [
    [
      { count: 1 },
      '1 chapter is not assigned to a volume.',
      '1 capítulo não está atribuído a um volume.',
    ],
    [
      { count: 3 },
      '3 chapters are not assigned to a volume.',
      '3 capítulos não estão atribuídos a um volume.',
    ],
  ],
};
