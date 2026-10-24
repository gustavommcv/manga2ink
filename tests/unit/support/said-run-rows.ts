import type { RunMessageValues } from '@/domain/messages/run';

import type { Rows } from './said-table';

/**
 * What a run says while it goes on, what validating found, and the line under the results (ADR 0053).
 * The English is what the app has always said, character for character.
 */
export const runRows: Rows<RunMessageValues> = {
  'progress.preparing': [[{}, 'Preparing…', 'Preparando…']],
  'progress.inspecting': [[{ title: 'A Work' }, 'Inspecting A Work…', 'Analisando A Work…']],
  'progress.organizing': [
    [{ title: 'A Work' }, 'Organizing chapters for A Work…', 'Organizando os capítulos de A Work…'],
  ],
  'progress.organizingChapters': [
    [
      { chapters: 1 },
      'Organizing 1 chapter into volume files…',
      'Organizando 1 capítulo em arquivos de volume…',
    ],
    [
      { chapters: 12 },
      'Organizing 12 chapters into volume files…',
      'Organizando 12 capítulos em arquivos de volume…',
    ],
  ],
  'progress.bindingLibrary': [
    [{}, 'Building volume files for the library…', 'Montando os arquivos de volume da biblioteca…'],
  ],
  'progress.buildingVolume': [
    [{ volume: 2, volumes: 3 }, 'Building volume 2 of 3…', 'Montando o volume 2 de 3…'],
  ],
  'progress.converting': [
    [
      { volume: { number: 1, count: 3 } },
      'Converting volume 1 of 3…',
      'Convertendo volume 1 de 3…',
    ],
    [
      { title: 'Good Manga', volume: { number: 2, count: 3 } },
      'Converting Good Manga · volume 2 of 3…',
      'Convertendo Good Manga · volume 2 de 3…',
    ],
  ],
  'progress.savingVolume': [
    [{ volume: { number: 1, count: 3 } }, 'Saving volume 1 of 3…', 'Salvando volume 1 de 3…'],
    [
      { title: 'Good Manga', volume: { number: 2, count: 3 } },
      'Saving Good Manga · volume 2 of 3…',
      'Salvando Good Manga · volume 2 de 3…',
    ],
  ],
  'progress.pageProcessed': [
    [{ completed: 7, total: 10 }, 'Processed page 7 of 10.', 'Página 7 de 10 processada.'],
  ],
  'progress.stageStarted': [
    [{ stage: 'inspect' }, 'Starting inspect…', 'Iniciando a leitura…'],
    [{ stage: 'plan' }, 'Starting plan…', 'Iniciando o planejamento…'],
    [{ stage: 'process' }, 'Starting process…', 'Iniciando o processamento…'],
    [{ stage: 'metadata' }, 'Starting metadata…', 'Iniciando os metadados…'],
    [{ stage: 'package' }, 'Starting package…', 'Iniciando o empacotamento…'],
    // A stage a later tool adds is said as the tool names it.
    [{ stage: 'future' }, 'Starting future…', 'Iniciando future…'],
    [{ stage: 'constructor' }, 'Starting constructor…', 'Iniciando constructor…'],
  ],
  'progress.savingBook': [[{}, 'Saving the finished book…', 'Salvando o livro pronto…']],
  'progress.volumesConverted': [
    [{ done: 1, total: 3 }, '1 of 3 volumes converted.', '1 de 3 volumes convertidos.'],
    [
      { title: 'Good Manga', done: 2, total: 2 },
      'Good Manga · 2 of 2 volumes converted.',
      'Good Manga · 2 de 2 volumes convertidos.',
    ],
  ],
  'progress.booksSaved': [
    [{ count: 1 }, '1 book saved.', '1 livro salvo.'],
    [{ count: 2 }, '2 books saved.', '2 livros salvos.'],
  ],

  'plan.mangaprep': [
    [
      { profile: 'KV', width: 1072, height: 1448, chaptersNotGrouped: false },
      'mangaprep validated KV · 1072 × 1448 · no library files written',
      'mangaprep validou KV · 1072 × 1448 · nenhum arquivo da biblioteca gravado',
    ],
    [
      { profile: 'KV', width: 1072, height: 1448, chaptersNotGrouped: true },
      'mangaprep validated KV · 1072 × 1448 · one book, chapters not grouped · no library files written',
      'mangaprep validou KV · 1072 × 1448 · um livro, capítulos sem agrupar · nenhum arquivo da biblioteca gravado',
    ],
  ],
  'plan.mangabind': [
    [
      { volumes: 1, shape: 'books' },
      'mangabind validated 1 volume · no library files written',
      'mangabind validou 1 volume · nenhum arquivo da biblioteca gravado',
    ],
    [
      { volumes: 2, shape: 'joined' },
      'mangabind validated 2 volumes · saved as CBZ files, mangaprep not run · no library files written',
      'mangabind validou 2 volumes · salvos como arquivos CBZ, mangaprep não executado · nenhum arquivo da biblioteca gravado',
    ],
    [
      { volumes: 2, shape: 'series' },
      'mangabind validated 2 volumes · single book for the series · no library files written',
      'mangabind validou 2 volumes · um só livro para a série · nenhum arquivo da biblioteca gravado',
    ],
  ],
  'plan.series': [
    [
      { volumes: 0, chapters: 16 },
      'mangabind validated 16 chapters · one book for the whole series · no library files written',
      'mangabind validou 16 capítulos · um livro para a série inteira · nenhum arquivo da biblioteca gravado',
    ],
    [
      { volumes: 2, chapters: 1 },
      'mangabind validated 1 chapter in 2 volumes · one book for the whole series · no library files written',
      'mangabind validou 1 capítulo em 2 volumes · um livro para a série inteira · nenhum arquivo da biblioteca gravado',
    ],
    [
      { volumes: 0, chapters: 0 },
      'mangabind validated the series · one book for the whole series · no library files written',
      'mangabind validou a série · um livro para a série inteira · nenhum arquivo da biblioteca gravado',
    ],
  ],
  'plan.library': [
    [
      { titles: 1, volumes: 1, books: 1, shape: 'books' },
      'mangabind validated 1 title · 1 volume · no library files written',
      'mangabind validou 1 título · 1 volume · nenhum arquivo da biblioteca gravado',
    ],
    [
      { titles: 2, volumes: 5, books: 5, shape: 'joined' },
      'mangabind validated 2 titles · 5 volumes · saved as CBZ files, mangaprep not run · no library files written',
      'mangabind validou 2 títulos · 5 volumes · salvos como arquivos CBZ, mangaprep não executado · nenhum arquivo da biblioteca gravado',
    ],
    [
      { titles: 1, volumes: 3, books: 1, shape: 'series' },
      'mangabind validated 1 title · 3 volumes · 1 EPUB (one per series) · no library files written',
      'mangabind validou 1 título · 3 volumes · 1 EPUB (um por série) · nenhum arquivo da biblioteca gravado',
    ],
    [
      { titles: 2, volumes: 5, books: 2, shape: 'series' },
      'mangabind validated 2 titles · 5 volumes · 2 EPUBs (one per series) · no library files written',
      'mangabind validou 2 títulos · 5 volumes · 2 EPUBs (um por série) · nenhum arquivo da biblioteca gravado',
    ],
  ],

  'summary.joined': [[{}, 'Joined volumes · CBZ', 'Volumes unidos · CBZ']],
  'summary.books': [
    [
      { device: 'Kindle 11', format: 'EPUB', ownOptions: 0 },
      'Kindle 11 · EPUB',
      'Kindle 11 · EPUB',
    ],
    [
      { device: 'Kindle 11', format: 'EPUB', ownOptions: 2 },
      'Kindle 11 · EPUB · 2 with options of their own',
      'Kindle 11 · EPUB · 2 com opções próprias',
    ],
  ],
  'summary.earlier': [[{}, 'Ready to save or share', 'Pronto para salvar ou compartilhar']],
};
