import type { Language } from '@/domain/app-settings';

import { countOf } from './count';

/**
 * The words of the screen that shows the books a run made (ADR 0052). Why an item failed or was
 * skipped, and what the warnings say, are said by code (ADR 0053).
 */
export interface ResultsMessages {
  readonly none: string;
  readonly ready: (books: number) => string;
  readonly convertMore: string;
  readonly saveAll: { readonly label: string; readonly hint: string };
  readonly books: string;
  readonly saved: string;
  readonly notSaved: string;
  readonly saveAs: string;
  readonly saveBookAs: (name: string) => string;
  readonly showInFolder: (name: string) => string;
  readonly open: (name: string) => string;
  readonly failed: (name: string) => string;
  readonly skipped: (name: string) => string;
  readonly fix: string;
  readonly fixBook: (name: string) => string;
  readonly warnings: string;
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const resultsMessages: Readonly<Record<Language, ResultsMessages>> = {
  en: {
    none: 'No books were produced',
    ready: (books) => `${String(books)} ${countOf(books, 'book', 'books')} ready`,
    convertMore: 'Convert more',
    saveAll: {
      label: 'Save all to folder…',
      hint: 'Existing files are not replaced; a repeated save may add numbered copies.',
    },
    books: 'Ready books',
    saved: 'Saved',
    notSaved: 'Not saved yet',
    saveAs: 'Save as…',
    saveBookAs: (name) => `Save ${name} as`,
    showInFolder: (name) => `Show ${name} in its folder`,
    open: (name) => `Open ${name}`,
    failed: (name) => `${name} could not be converted`,
    skipped: (name) => `${name} was skipped`,
    fix: 'Fix',
    fixBook: (name) => `Fix ${name}`,
    warnings: 'Warnings about the books',
  },
  'pt-BR': {
    none: 'Nenhum livro foi produzido',
    ready: (books) => `${String(books)} ${countOf(books, 'livro pronto', 'livros prontos')}`,
    convertMore: 'Converter mais',
    saveAll: {
      label: 'Salvar todos em uma pasta…',
      hint: 'Arquivos que já existem não são substituídos; salvar de novo pode criar cópias numeradas.',
    },
    books: 'Livros prontos',
    saved: 'Salvo',
    notSaved: 'Ainda não salvo',
    saveAs: 'Salvar como…',
    saveBookAs: (name) => `Salvar ${name} como`,
    showInFolder: (name) => `Mostrar ${name} na pasta`,
    open: (name) => `Abrir ${name}`,
    failed: (name) => `Não foi possível converter ${name}`,
    skipped: (name) => `${name} foi ignorado`,
    fix: 'Corrigir',
    fixBook: (name) => `Corrigir ${name}`,
    warnings: 'Avisos sobre os livros',
  },
  ja: {
    none: '作成された本はありません',
    ready: (books) => `${String(books)} 冊の準備ができました`,
    convertMore: 'さらに変換',
    saveAll: {
      label: 'すべてフォルダーに保存…',
      hint: '既存のファイルは置き換えられません。もう一度保存すると、番号付きのコピーが追加されることがあります。',
    },
    books: '完成した本',
    saved: '保存済み',
    notSaved: 'まだ保存されていません',
    saveAs: '名前を付けて保存…',
    saveBookAs: (name) => `「${name}」を名前を付けて保存`,
    showInFolder: (name) => `「${name}」をフォルダーで表示`,
    open: (name) => `「${name}」を開く`,
    failed: (name) => `「${name}」を変換できませんでした`,
    skipped: (name) => `「${name}」はスキップされました`,
    fix: '修正',
    fixBook: (name) => `「${name}」を修正`,
    warnings: '本に関する警告',
  },
};
