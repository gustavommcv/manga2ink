import type { Language } from '@/domain/app-settings';

/** What a reset puts back: the options of the queue screen, or of the page of conversion options. */
export type ResetScope = 'queue' | 'options';

/**
 * The words the controls of the conversion options share: what a changed option offers to do, and
 * putting the options back to their defaults. The names of the options themselves are said by the
 * screens that show them.
 */
export interface SettingsMessages {
  readonly field: {
    readonly restoreDefault: (label: string) => string;
    readonly useQueueValue: (label: string) => string;
    readonly optional: string;
  };
  readonly reset: {
    readonly button: string;
    readonly alreadyDefault: string;
    readonly confirmLabel: string;
    /** The question asked before what was changed, and kept, is discarded. */
    readonly question: Readonly<Record<ResetScope, string>>;
    readonly confirm: string;
    readonly cancel: string;
    readonly done: string;
  };
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const settingsMessages: Readonly<Record<Language, SettingsMessages>> = {
  en: {
    field: {
      restoreDefault: (label) => `Restore default for ${label}`,
      useQueueValue: (label) => `Use the queue’s value for ${label}`,
      optional: '(optional)',
    },
    reset: {
      button: 'Reset to defaults',
      alreadyDefault: 'Every option is already at its default.',
      confirmLabel: 'Confirm reset',
      question: {
        queue: 'Put the steps, device, format and every mangaprep option back to their defaults?',
        options: 'Put the device, format and every mangaprep option back to their defaults?',
      },
      confirm: 'Reset',
      cancel: 'Cancel',
      done: 'Every option is back to its default.',
    },
  },
  'pt-BR': {
    field: {
      restoreDefault: (label) => `Restaurar o padrão de ${label}`,
      useQueueValue: (label) => `Usar o valor da fila para ${label}`,
      optional: '(opcional)',
    },
    reset: {
      button: 'Restaurar padrões',
      alreadyDefault: 'Todas as opções já estão no padrão.',
      confirmLabel: 'Confirmar a restauração',
      question: {
        queue:
          'Voltar as etapas, o dispositivo, o formato e todas as opções do mangaprep aos padrões?',
        options: 'Voltar o dispositivo, o formato e todas as opções do mangaprep aos padrões?',
      },
      confirm: 'Restaurar',
      cancel: 'Cancelar',
      done: 'Todas as opções voltaram ao padrão.',
    },
  },
  ja: {
    field: {
      restoreDefault: (label) => `「${label}」を初期設定に戻す`,
      useQueueValue: (label) => `「${label}」をキューの値にする`,
      optional: '（任意）',
    },
    reset: {
      button: '初期設定に戻す',
      alreadyDefault: 'すべてのオプションがすでに初期設定です。',
      confirmLabel: 'リセットを確認',
      question: {
        queue: '手順、端末、形式、mangaprep のすべてのオプションを初期設定に戻しますか？',
        options: '端末、形式、mangaprep のすべてのオプションを初期設定に戻しますか？',
      },
      confirm: 'リセット',
      cancel: 'キャンセル',
      done: 'すべてのオプションを初期設定に戻しました。',
    },
  },
};
