import { describe, expect, it } from 'vitest';

import { countOf } from '@/i18n/count';
import { messagesFor } from '@/i18n/messages';

const en = messagesFor('en');
const pt = messagesFor('pt-BR');

describe('countOf', () => {
  it('is the singular for one and the plural for everything else, nothing included', () => {
    expect(countOf(1, 'item', 'items')).toBe('item');
    expect(countOf(0, 'item', 'items')).toBe('items');
    expect(countOf(2, 'item', 'items')).toBe('items');
  });
});

describe('the words of the queue screen in English, which are what the app has always said', () => {
  it('count the items of a run', () => {
    expect(en.queue.run.process(0)).toBe('Process');
    expect(en.queue.run.process(1)).toBe('Process 1 item');
    expect(en.queue.run.process(3)).toBe('Process 3 items');
    expect(en.queue.run.reading(1)).toBe('Reading 1 item…');
    expect(en.queue.run.reading(2)).toBe('Reading 2 items…');
    expect(en.queue.run.leftOut(1)).toBe(
      '1 item will be left out. Use the pencil on a row to fix it.',
    );
    expect(en.queue.run.leftOut(4)).toBe(
      '4 items will be left out. Use the pencil on a row to fix it.',
    );
  });

  it('count the pages of a planned book', () => {
    expect(en.queue.plans.pages(1)).toBe('1 page');
    expect(en.queue.plans.pages(46)).toBe('46 pages');
  });

  it('name the books that wait to be saved, and ask before deleting them', () => {
    expect(en.queue.pending.andMore('Vol.01.cbz', 1)).toBe('Vol.01.cbz and 1 more book');
    expect(en.queue.pending.andMore('Vol.01.cbz', 3)).toBe('Vol.01.cbz and 3 more books');
    expect(en.queue.pending.viewBooksFrom('Vol.01.cbz')).toBe('View books from Vol.01.cbz');
    expect(en.queue.pending.deleteFrom('Vol.01.cbz')).toBe('Delete pending books from Vol.01.cbz');
    expect(en.queue.pending.confirmDeletion('Vol.01.cbz')).toBe('Confirm deletion of Vol.01.cbz');
    expect(en.queue.pending.question(1)).toBe(
      "Permanently delete this conversion's 1 pending book? Books saved elsewhere will stay untouched.",
    );
    expect(en.queue.pending.question(2)).toBe(
      "Permanently delete this conversion's 2 pending books? Books saved elsewhere will stay untouched.",
    );
  });

  it('name the buttons of a row after the item, and say when something was set', () => {
    expect(en.queue.row.editTitlesOf('Library')).toBe('Edit titles of Library');
    expect(en.queue.row.editVolumesFor('Series')).toBe('Edit volumes for Series');
    expect(en.queue.row.editDetailsOf('Series')).toBe('Edit details of Series');
    expect(en.queue.row.editDetails(false)).toBe('Edit title, author and language');
    expect(en.queue.row.editDetails(true)).toBe('Edit title, author and language (set)');
    expect(en.queue.row.editOptionsOf('Series')).toBe('Edit conversion options of Series');
    expect(en.queue.row.editOptions(false)).toBe('Edit conversion options for this item');
    expect(en.queue.row.editOptions(true)).toBe('Edit conversion options for this item (set)');
    expect(en.queue.row.remove('Series')).toBe('Remove Series');
  });

  it('say what a changed option can do, and what a reset puts back', () => {
    expect(en.settings.field.restoreDefault('Device')).toBe('Restore default for Device');
    expect(en.settings.field.useQueueValue('Device')).toBe('Use the queue’s value for Device');
    expect(en.settings.reset.question.queue).toBe(
      'Put the steps, device, format and every mangaprep option back to their defaults?',
    );
    expect(en.settings.reset.question.options).toBe(
      'Put the device, format and every mangaprep option back to their defaults?',
    );
  });
});

describe('the words of the queue screen in Portuguese', () => {
  it('count the items of a run, with the verb that agrees with the count', () => {
    expect(pt.queue.run.process(0)).toBe('Processar');
    expect(pt.queue.run.process(1)).toBe('Processar 1 item');
    expect(pt.queue.run.process(3)).toBe('Processar 3 itens');
    expect(pt.queue.run.reading(1)).toBe('Lendo 1 item…');
    expect(pt.queue.run.reading(2)).toBe('Lendo 2 itens…');
    expect(pt.queue.run.leftOut(1)).toBe(
      '1 item ficará de fora. Use o lápis na linha para corrigir.',
    );
    expect(pt.queue.run.leftOut(4)).toBe(
      '4 itens ficarão de fora. Use o lápis na linha para corrigir.',
    );
  });

  it('count the pages of a planned book', () => {
    expect(pt.queue.plans.pages(1)).toBe('1 página');
    expect(pt.queue.plans.pages(46)).toBe('46 páginas');
  });

  it('name the books that wait to be saved, and ask before deleting them', () => {
    expect(pt.queue.pending.andMore('Vol.01.cbz', 1)).toBe('Vol.01.cbz e mais 1 livro');
    expect(pt.queue.pending.andMore('Vol.01.cbz', 3)).toBe('Vol.01.cbz e mais 3 livros');
    expect(pt.queue.pending.viewBooksFrom('Vol.01.cbz')).toBe('Ver os livros de Vol.01.cbz');
    expect(pt.queue.pending.question(1)).toBe(
      'Apagar definitivamente o livro pendente desta conversão? Livros salvos em outro lugar não serão alterados.',
    );
    expect(pt.queue.pending.question(2)).toBe(
      'Apagar definitivamente os 2 livros pendentes desta conversão? Livros salvos em outro lugar não serão alterados.',
    );
  });

  it('name the buttons of a row after the item, and say when something was set', () => {
    expect(pt.queue.row.editDetails(true)).toBe('Editar título, autor e idioma (definidos)');
    expect(pt.queue.row.editOptions(true)).toBe(
      'Editar as opções de conversão deste item (definidas)',
    );
    expect(pt.queue.row.remove('Série')).toBe('Remover Série');
  });

  it('say what a changed option can do, and what a reset puts back', () => {
    expect(pt.settings.field.restoreDefault('Dispositivo')).toBe(
      'Restaurar o padrão de Dispositivo',
    );
    expect(pt.settings.reset.question.queue).toContain('as etapas');
    expect(pt.settings.reset.question.options).not.toContain('etapas');
  });
});
