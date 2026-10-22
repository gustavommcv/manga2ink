import type { Language } from '@/domain/app-settings';

/** The words of what every screen shares. */
export interface SharedMessages {
  readonly notices: {
    /** The name of the notices at the top of a screen. */
    readonly label: string;
    readonly dismiss: string;
  };
  /** The name of a banner of information that has no title to name it by. */
  readonly infoBanner: { readonly label: string };
  /** The banner that says the bundled tools need attention. */
  readonly toolchain: { readonly label: string; readonly title: string };
  /** What the window says when the app could not start at all, which it says without having read the settings. */
  readonly startup: {
    readonly label: string;
    readonly title: string;
    readonly text: string;
  };
  /** What a screen says of a step that could not be done. */
  readonly failure: {
    /** The name of the box that tells it. */
    readonly label: string;
    readonly title: string;
    readonly technicalDetails: string;
    /** A book that is not named, in "a book: why it was not saved". */
    readonly aBook: string;
  };
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const sharedMessages: Readonly<Record<Language, SharedMessages>> = {
  en: {
    notices: { label: 'Notices', dismiss: 'Dismiss these notices' },
    infoBanner: { label: 'Information' },
    toolchain: { label: 'Bundled tool status', title: 'Conversion tools need attention' },
    startup: {
      label: 'Startup error',
      title: 'Manga2Ink could not start correctly.',
      text: 'Restart the app. If the problem persists, reinstall Manga2Ink.',
    },
    failure: {
      label: 'Workflow error',
      title: 'Couldn’t complete this step',
      technicalDetails: 'Technical details',
      aBook: 'A book',
    },
  },
  'pt-BR': {
    notices: { label: 'Avisos', dismiss: 'Dispensar estes avisos' },
    infoBanner: { label: 'Informação' },
    toolchain: {
      label: 'Estado das ferramentas incluídas',
      title: 'As ferramentas de conversão precisam de atenção',
    },
    startup: {
      label: 'Erro na inicialização',
      title: 'O Manga2Ink não conseguiu iniciar corretamente.',
      text: 'Reinicie o app. Se o problema continuar, reinstale o Manga2Ink.',
    },
    failure: {
      label: 'Erro no fluxo',
      title: 'Não foi possível concluir esta etapa',
      technicalDetails: 'Detalhes técnicos',
      aBook: 'Um livro',
    },
  },
  ja: {
    notices: { label: 'お知らせ', dismiss: 'これらのお知らせを閉じる' },
    infoBanner: { label: '情報' },
    toolchain: { label: '同梱ツールの状態', title: '変換ツールの確認が必要です' },
    startup: {
      label: '起動エラー',
      title: 'Manga2Ink を正しく起動できませんでした。',
      text: 'アプリを再起動してください。問題が続く場合は、Manga2Ink を再インストールしてください。',
    },
    failure: {
      label: 'ワークフローのエラー',
      title: 'この手順を完了できませんでした',
      technicalDetails: '技術的な詳細',
      aBook: 'ある本',
    },
  },
};
