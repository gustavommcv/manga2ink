import type { Language } from '@/domain/app-settings';

import { countOf } from './count';

/**
 * The words of the screen where a person chooses among the files that claim one chapter (ADR 0093).
 * The way back and the names of the buttons it shares with the queue are the queue's.
 */
export interface VersionsMessages {
  readonly kicker: string;
  readonly title: (name: string) => string;
  readonly description: string;
  /** How many chapters are decided, and how many are left. */
  readonly progress: (decided: number, total: number) => string;
  readonly allDecided: string;
  /** What a chapter says once a choice is made for it. */
  readonly decided: string;
  readonly done: string;
  /** The chapter, by its number as the mapping file writes it: `6`, `6.5`, `21x1`. */
  readonly chapter: (token: string) => string;
  readonly versions: (count: number) => string;
  /** What a chapter says while nothing is chosen for it. */
  readonly undecided: string;
  readonly pages: (count: number) => string;
  readonly kind: { readonly folder: string; readonly cbz: string };
  readonly preview: {
    readonly alt: (name: string) => string;
    readonly missing: string;
  };
  readonly flag: { readonly new: string; readonly changed: string };
  readonly all: { readonly label: (count: number) => string; readonly help: string };
  readonly none: { readonly label: string; readonly help: string };
  /** What was chosen when the folder was added before, offered again because the files are not the same. */
  readonly remembered: {
    readonly text: (names: string) => string;
    readonly use: string;
  };
  readonly saved: string;
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const versionsMessages: Readonly<Record<Language, VersionsMessages>> = {
  en: {
    kicker: 'Versions',
    title: (name) => `Versions of the same chapter in ${name}`,
    description:
      'Some chapters of this folder come in more than one file. Choose which to use for each one. Your files are never moved, renamed or deleted.',
    progress: (decided, total) =>
      `${String(decided)} of ${String(total)} ${countOf(total, 'chapter', 'chapters')} decided`,
    allDecided: 'Every chapter is decided.',
    decided: 'Decided',
    done: 'Done',
    chapter: (token) => `Chapter ${token}`,
    versions: (count) => `${String(count)} versions`,
    undecided: 'Not decided yet',
    pages: (count) => `${String(count)} ${countOf(count, 'page', 'pages')}`,
    kind: { folder: 'Folder', cbz: 'CBZ file' },
    preview: {
      alt: (name) => `First page of ${name}`,
      missing: 'No preview',
    },
    flag: { new: 'New since you chose', changed: 'Changed since you chose' },
    all: {
      label: (count) => `Keep all ${String(count)} versions`,
      help: 'They are in the book one after the other, each named with “(version 1 of 2)”, and the chapter keeps its number.',
    },
    none: {
      label: 'Leave this chapter out',
      help: 'None of its files is in the book.',
    },
    remembered: {
      text: (names) => `Earlier you chose ${names}.`,
      use: 'Choose it again',
    },
    saved: 'Your choice is kept with the folder, and used when you add it again.',
  },
  'pt-BR': {
    kicker: 'Versões',
    title: (name) => `Versões do mesmo capítulo em ${name}`,
    description:
      'Alguns capítulos desta pasta vêm em mais de um arquivo. Escolha qual usar em cada um. Os seus arquivos nunca são movidos, renomeados nem apagados.',
    progress: (decided, total) =>
      `${String(decided)} de ${String(total)} ${countOf(total, 'capítulo decidido', 'capítulos decididos')}`,
    allDecided: 'Todos os capítulos estão decididos.',
    decided: 'Decidido',
    done: 'Concluir',
    chapter: (token) => `Capítulo ${token}`,
    versions: (count) => `${String(count)} versões`,
    undecided: 'Ainda não decidido',
    pages: (count) => `${String(count)} ${countOf(count, 'página', 'páginas')}`,
    kind: { folder: 'Pasta', cbz: 'Arquivo CBZ' },
    preview: {
      alt: (name) => `Primeira página de ${name}`,
      missing: 'Sem prévia',
    },
    flag: { new: 'Novo desde a sua escolha', changed: 'Mudou desde a sua escolha' },
    all: {
      label: (count) => `Manter as ${String(count)} versões`,
      help: 'Ficam no livro uma depois da outra, cada uma com “(version 1 of 2)” no nome, e o capítulo mantém o seu número.',
    },
    none: {
      label: 'Deixar este capítulo de fora',
      help: 'Nenhum dos arquivos dele entra no livro.',
    },
    remembered: {
      text: (names) => `Antes você escolheu ${names}.`,
      use: 'Escolher de novo',
    },
    saved: 'A sua escolha fica guardada com a pasta e é usada quando você a adicionar de novo.',
  },
  ja: {
    kicker: '版',
    title: (name) => `「${name}」の同じ話の版`,
    description:
      'このフォルダーには、複数のファイルがある話があります。それぞれ、使う版を選んでください。ファイルが移動・名前変更・削除されることはありません。',
    progress: (decided, total) => `${String(total)} 話中 ${String(decided)} 話を選択済み`,
    allDecided: 'すべての話を選択しました。',
    decided: '選択済み',
    done: '完了',
    chapter: (token) => `第 ${token} 話`,
    versions: (count) => `${String(count)} 版`,
    undecided: '未選択',
    pages: (count) => `${String(count)} ページ`,
    kind: { folder: 'フォルダー', cbz: 'CBZ ファイル' },
    preview: {
      alt: (name) => `「${name}」の最初のページ`,
      missing: 'プレビューなし',
    },
    flag: { new: '選択後に追加', changed: '選択後に変更' },
    all: {
      label: (count) => `${String(count)} 版すべてを残す`,
      help: '本の中に続けて並び、それぞれ名前に「(version 1 of 2)」のような表記が付きます。話の番号は変わりません。',
    },
    none: {
      label: 'この話は入れない',
      help: 'この話のファイルは、どれも本に入りません。',
    },
    remembered: {
      text: (names) => `前回は ${names} を選びました。`,
      use: '同じものを選ぶ',
    },
    saved: '選択はフォルダーと一緒に保存され、同じフォルダーを追加したときに使われます。',
  },
};
