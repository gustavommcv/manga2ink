import type { Language } from '@/domain/app-settings';
import type { Theme } from '@/domain/theme';

/** The words of the dialog behind the gear on the title bar (ADR 0052). */
export interface AppSettingsMessages {
  /** The name of the gear button. */
  readonly open: string;
  /** What it shows when the pointer rests on it: its name, and the keys that do the same (ADR 0064). */
  readonly openTip: (shortcut: string) => string;
  readonly title: string;
  /** What the dialog is for, for a person who cannot see it. */
  readonly description: string;
  readonly close: string;
  /** The name of the row of tabs, which is shown only when there is more than one. */
  readonly sections: string;
  /** The names of the tabs: what a person decides about the window, and what the app says about itself. */
  readonly interface: string;
  readonly processing: string;
  readonly updates: string;
  readonly about: string;
  readonly language: {
    readonly label: string;
    readonly help: string;
    /** The choice that follows the system's language. */
    readonly system: string;
    readonly saveFailed: string;
    /**
     * Said under the choice while this language is the one in use, when few people who speak it have
     * read its text (ADR 0084); null for a language that needs no such sentence.
     */
    readonly note: string | null;
  };
  /** How the app looks (ADR 0066). */
  readonly theme: {
    readonly label: string;
    readonly help: string;
    /** What each theme is called: a theme is not added without its name in every language. */
    readonly names: Readonly<Record<Theme, string>>;
    /** The choice to look as the system does, as the language has its own (ADR 0070). */
    readonly system: string;
    readonly saveFailed: string;
  };
  /** Said when the file of the app settings was there and could not be used. */
  readonly unreadable: string;
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const appSettingsMessages: Readonly<Record<Language, AppSettingsMessages>> = {
  en: {
    open: 'App settings',
    openTip: (shortcut) => `App settings (${shortcut})`,
    title: 'App settings',
    description: 'Choices about the app itself. Each change is kept as you make it.',
    close: 'Close app settings',
    sections: 'App settings sections',
    interface: 'Interface',
    processing: 'Processing',
    updates: 'Updates',
    about: 'About',
    language: {
      label: 'Language',
      help: 'Applies right away. Books, titles and the tools’ own messages are not translated.',
      system: 'Automatic (system language)',
      saveFailed: 'The language could not be saved. Try again.',
      note: null,
    },
    theme: {
      label: 'Theme',
      help: 'How the app looks. Automatic follows the light or dark setting of the system, also when it changes. Applies right away.',
      names: { dark: 'Dark (graphite)', light: 'Light (paper)' },
      system: 'Automatic (system theme)',
      saveFailed: 'The theme could not be saved. Try again.',
    },
    unreadable: 'The saved app settings could not be read, so the defaults are in use.',
  },
  'pt-BR': {
    open: 'Configurações do app',
    openTip: (shortcut) => `Configurações do app (${shortcut})`,
    title: 'Configurações do app',
    description: 'Escolhas sobre o próprio app. Cada mudança é guardada assim que você a faz.',
    close: 'Fechar as configurações do app',
    sections: 'Seções das configurações do app',
    interface: 'Interface',
    processing: 'Processamento',
    updates: 'Atualizações',
    about: 'Sobre',
    language: {
      label: 'Idioma',
      help: 'Vale na hora. Livros, títulos e as mensagens das próprias ferramentas não são traduzidos.',
      system: 'Automático (idioma do sistema)',
      saveFailed: 'Não foi possível guardar o idioma. Tente de novo.',
      note: null,
    },
    theme: {
      label: 'Tema',
      help: 'Como o app se parece. O automático segue o claro ou escuro do sistema, também quando ele muda. Vale na hora.',
      names: { dark: 'Escuro (grafite)', light: 'Claro (papel)' },
      system: 'Automático (tema do sistema)',
      saveFailed: 'Não foi possível guardar o tema. Tente de novo.',
    },
    unreadable:
      'As configurações do app guardadas não puderam ser lidas, então os padrões estão em uso.',
  },
  ja: {
    open: 'アプリの設定',
    openTip: (shortcut) => `アプリの設定（${shortcut}）`,
    title: 'アプリの設定',
    description: 'アプリ自体に関する設定です。変更は、行った時点で保存されます。',
    close: 'アプリの設定を閉じる',
    sections: 'アプリの設定のタブ',
    interface: 'インターフェース',
    processing: '処理',
    updates: '更新',
    about: 'このアプリについて',
    language: {
      label: '言語',
      help: 'すぐに反映されます。本やタイトル、各ツール自身のメッセージは翻訳されません。',
      system: '自動（システムの言語）',
      saveFailed: '言語を保存できませんでした。もう一度お試しください。',
      note: 'このアプリの日本語は AI の支援を受けて作られていて、日本語を話す方による確認はまだ十分ではありません。不自然な表現や誤りを見つけたら、ぜひお知らせください。',
    },
    theme: {
      label: 'テーマ',
      help: 'アプリの見た目です。「自動」では、システムのライト／ダークの設定に従い、設定が変わったときも合わせて切り替わります。すぐに反映されます。',
      names: { dark: 'ダーク（グラファイト）', light: 'ライト（ペーパー）' },
      system: '自動（システムのテーマ）',
      saveFailed: 'テーマを保存できませんでした。もう一度お試しください。',
    },
    unreadable: '保存されたアプリの設定を読み込めなかったため、初期設定を使用しています。',
  },
};
