import type { ModeMessageValues } from '@/domain/messages/mode';
import type { QueueMessageValues } from '@/domain/messages/queue';
import type { TextMessageValues } from '@/domain/messages/text';

import type { Rows } from './said-table';

/**
 * What the queue says about each of its rows, and why a process cannot be chosen, in each of the forms
 * it has, with what it says in English (which is what the app has always said, character for
 * character) and in Portuguese. The compiler fails for a code that has no row here.
 */
export const queueRows: Rows<QueueMessageValues & ModeMessageValues & TextMessageValues> = {
  'queue.chip.checking': [[{}, 'Checking…', 'Verificando…']],
  'queue.chip.unreadable': [[{}, 'Could not read', 'Não foi possível ler']],
  'queue.chip.nothingToJoin': [[{}, 'Nothing to join', 'Nada para juntar']],
  'queue.chip.ready': [[{}, 'Ready', 'Pronto']],
  'queue.chip.oneBook': [[{}, 'One book', 'Um livro']],
  'queue.chip.notRecognized': [[{}, 'Not recognized', 'Não reconhecido']],
  'queue.chip.needsVolumes': [[{}, 'Needs volumes', 'Precisa de volumes']],
  'queue.chip.needsGrouping': [[{}, 'Needs grouping', 'Precisa agrupar']],
  'queue.chip.saved': [[{}, 'Saved', 'Salvo']],
  'queue.chip.volumes': [
    [{ count: 1 }, '1 volume', '1 volume'],
    [{ count: 2 }, '2 volumes', '2 volumes'],
  ],
  'queue.chip.titles': [
    [{ count: 1 }, '1 title', '1 título'],
    [{ count: 3 }, '3 titles', '3 títulos'],
  ],

  'queue.detail.folderReading': [[{}, 'Folder · reading it', 'Pasta · lendo']],
  'queue.detail.cbzChecking': [[{}, 'CBZ · checking it', 'CBZ · verificando']],
  'queue.detail.folder': [[{}, 'Folder', 'Pasta']],
  'queue.detail.cbz': [[{}, 'CBZ', 'CBZ']],
  'queue.detail.cbzOneVolume': [[{}, 'CBZ · already one volume', 'CBZ · já é um volume']],
  'queue.detail.cbzStraight': [
    [{}, 'CBZ · goes straight to the e-reader step', 'CBZ · vai direto para a etapa do e-reader'],
  ],
  'queue.detail.folderNoChapters': [
    [{}, 'Folder · no chapters found', 'Pasta · nenhum capítulo encontrado'],
  ],
  'queue.detail.folderChapters': [
    [{ chapters: 1, grouping: 'plain' }, 'Folder · 1 chapter', 'Pasta · 1 capítulo'],
    [{ chapters: 3, grouping: 'plain' }, 'Folder · 3 chapters', 'Pasta · 3 capítulos'],
    [
      { chapters: 3, grouping: 'not-grouped' },
      'Folder · 3 chapters · not grouped',
      'Pasta · 3 capítulos · sem agrupar',
    ],
    [
      { chapters: 3, grouping: 'from-names' },
      'Folder · 3 chapters · grouped from names',
      'Pasta · 3 capítulos · agrupado pelos nomes',
    ],
  ],
  'queue.detail.library': [
    [{ titles: 1 }, 'Library · 1 title', 'Biblioteca · 1 título'],
    [{ titles: 4 }, 'Library · 4 titles', 'Biblioteca · 4 títulos'],
  ],
  'queue.detail.libraryVolumes': [
    [{ titles: 1, volumes: 1 }, 'Library · 1 title · 1 volume', 'Biblioteca · 1 título · 1 volume'],
    [
      { titles: 2, volumes: 5 },
      'Library · 2 titles · 5 volumes',
      'Biblioteca · 2 títulos · 5 volumes',
    ],
  ],

  'queue.note.noChapters': [
    [
      {},
      'mangabind found no chapters here. Turn off "Group chapters into volumes" to convert the folder as one book.',
      'O mangabind não encontrou capítulos aqui. Desligue “Agrupar capítulos em volumes” para converter a pasta como um livro só.',
    ],
  ],
  'queue.note.onlyLinks': [
    [
      { names: ['Berserk'] },
      'A folder in it is a link, and mangabind does not follow links to a series, so it was not read: Berserk. Put the real folder in the library and add it again.',
      'Uma pasta dentro dela é um link, e o mangabind não segue links para uma série, então ela não foi lida: Berserk. Coloque a pasta real na biblioteca e adicione-a de novo.',
    ],
    [
      { names: ['Berserk', 'Vagabond', 'Monster', 'Vinland Saga'] },
      '4 folders in it are links, and mangabind does not follow links to a series, so they were not read: Berserk, Vagabond, Monster and 1 more. Put the real folders in the library and add it again.',
      '4 pastas dentro dela são links, e o mangabind não segue links para uma série, então elas não foram lidas: Berserk, Vagabond, Monster e mais 1. Coloque as pastas reais na biblioteca e adicione-a de novo.',
    ],
  ],
  'queue.note.noVolumesYet': [
    [
      {},
      'No volumes yet. Open Edit volumes to group the chapters.',
      'Ainda não há volumes. Abra Editar volumes para agrupar os capítulos.',
    ],
  ],
  'queue.note.unassigned': [
    [
      { count: 1 },
      '1 chapter still has no volume. Open Edit volumes to place it, or accept the gaps there.',
      '1 capítulo ainda não tem volume. Abra Editar volumes para colocá-lo, ou aceite as lacunas lá.',
    ],
    [
      { count: 2 },
      '2 chapters still have no volume. Open Edit volumes to place them, or accept the gaps there.',
      '2 capítulos ainda não têm volume. Abra Editar volumes para colocá-los, ou aceite as lacunas lá.',
    ],
  ],
  'queue.note.chaptersLeftOut': [
    [{ count: 1 }, '1 chapter left out.', '1 capítulo ficou de fora.'],
    [{ count: 2 }, '2 chapters left out.', '2 capítulos ficaram de fora.'],
  ],
  'queue.note.libraryEmpty': [
    [
      {},
      'mangabind found no manga in this folder.',
      'O mangabind não encontrou nenhum mangá nesta pasta.',
    ],
  ],
  'queue.note.titlesNeedVolumes': [
    [
      { count: 1 },
      '1 title has no volumes yet. Use the pencil on this row to group it.',
      '1 título ainda não tem volumes. Use o lápis nesta linha para agrupá-lo.',
    ],
    [
      { count: 2 },
      '2 titles have no volumes yet. Use the pencil on this row to group them.',
      '2 títulos ainda não têm volumes. Use o lápis nesta linha para agrupá-los.',
    ],
  ],
  'queue.note.titlesLeftOut': [
    [
      { count: 1 },
      '1 title left out until they have volumes.',
      '1 título ficou de fora até ter volumes.',
    ],
    [
      { count: 2 },
      '2 titles left out until they have volumes.',
      '2 títulos ficaram de fora até terem volumes.',
    ],
  ],
  'queue.note.titlesFailed': [
    [
      { count: 1 },
      '1 title failed last time and will run again.',
      '1 título falhou da última vez e vai rodar de novo.',
    ],
    [
      { count: 2 },
      '2 titles failed last time and will run again.',
      '2 títulos falharam da última vez e vão rodar de novo.',
    ],
  ],
  'queue.note.unrecognizedChapters': [
    [
      { names: ['Extras'], again: 'folder' },
      'A folder has a name mangabind cannot read as a chapter, so it is left out of the books: Extras. Rename it to include a chapter number (Ch.005, for one), then add the folder again.',
      'Uma pasta tem um nome que o mangabind não consegue ler como capítulo, então ela ficou de fora dos livros: Extras. Renomeie-a para incluir um número de capítulo (Ch.005, por exemplo), e depois adicione a pasta de novo.',
    ],
    [
      { names: ['A', 'B', 'C', 'D', 'E'], again: 'library' },
      '5 folders have a name mangabind cannot read as a chapter, so they are left out of the books: A, B, C and 2 more. Rename them to include a chapter number (Ch.005, for one), then add the library again.',
      '5 pastas têm um nome que o mangabind não consegue ler como capítulo, então elas ficaram de fora dos livros: A, B, C e mais 2. Renomeie-as para incluir um número de capítulo (Ch.005, por exemplo), e depois adicione a biblioteca de novo.',
    ],
  ],
  'queue.note.unrecognizedInLibrary': [
    [
      {
        titles: [
          { title: 'Berserk', names: ['Extras'] },
          { title: 'Monster', names: ['Notes', 'Bonus'] },
        ],
      },
      '3 folders have a name mangabind cannot read as a chapter, so they are left out of the books: Berserk (Extras), Monster (Notes, Bonus). Rename them to include a chapter number (Ch.005, for one), then add the library again.',
      '3 pastas têm um nome que o mangabind não consegue ler como capítulo, então elas ficaram de fora dos livros: Berserk (Extras), Monster (Notes, Bonus). Renomeie-as para incluir um número de capítulo (Ch.005, por exemplo), e depois adicione a biblioteca de novo.',
    ],
    [
      {
        titles: [
          { title: 'A', names: ['1'] },
          { title: 'B', names: ['2'] },
          { title: 'C', names: ['3'] },
          { title: 'D', names: ['4', '5', '6', '7'] },
        ],
      },
      '7 folders have a name mangabind cannot read as a chapter, so they are left out of the books: A (1), B (2), C (3) and 1 more titles. Rename them to include a chapter number (Ch.005, for one), then add the library again.',
      '7 pastas têm um nome que o mangabind não consegue ler como capítulo, então elas ficaram de fora dos livros: A (1), B (2), C (3) e mais 1 títulos. Renomeie-as para incluir um número de capítulo (Ch.005, por exemplo), e depois adicione a biblioteca de novo.',
    ],
  ],

  'mode.cbzIsOneVolume': [
    [
      {},
      'A CBZ is already one volume, so there is nothing to join.',
      'Um CBZ já é um volume só, então não há o que juntar.',
    ],
  ],
  'mode.libraryGroupsFirst': [
    [
      {},
      'A library is grouped title by title first, so it cannot skip joining volumes.',
      'Uma biblioteca é agrupada título por título primeiro, então não dá para pular a junção dos volumes.',
    ],
  ],
  'mode.singleBookLocked': [
    [
      {},
      'Turn off “Create one book for the series” to change this.',
      'Desligue “Criar um livro para a série” para mudar isto.',
    ],
  ],

  'text.raw': [
    [
      { text: 'Not enough space on the disk.' },
      'Not enough space on the disk.',
      'Not enough space on the disk.',
    ],
  ],
};
