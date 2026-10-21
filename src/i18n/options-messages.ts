import type { Language } from '@/domain/app-settings';

import { countOf } from './count';

/**
 * The words of the pages of the conversion options, the queue's and an item's, and of the notice that
 * says how many items have options of their own (ADR 0052). The fields of the options themselves
 * are said by the part that follows this one.
 */
export interface OptionsMessages {
  readonly back: string;
  readonly advanced: string;
  readonly page: {
    readonly title: string;
    readonly description: string;
  };
  readonly item: {
    readonly kicker: string;
    readonly title: (name: string) => string;
    readonly description: string;
    readonly useQueue: string;
    readonly hasOwn: string;
    readonly followsQueue: string;
  };
  readonly overrides: {
    readonly label: string;
    /** "3 items in the queue are converted with options of their own." */
    readonly some: (count: number) => string;
    readonly keep: string;
    readonly clearAll: string;
    /** "2 items now follow the queue’s options." */
    readonly cleared: (count: number) => string;
  };
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const optionsMessages: Readonly<Record<Language, OptionsMessages>> = {
  en: {
    back: 'Back',
    advanced: 'Advanced',
    page: {
      title: 'Conversion options',
      description:
        'Fine-tune page layout, images, metadata, and output for everything in the queue. Your choices are saved for next time.',
    },
    item: {
      kicker: 'Advanced · this item only',
      title: (name) => `Options for ${name}`,
      description:
        'What you change here is used for this item only, and is shown in color. Everything else follows the conversion options of the queue, including what you change there later; the arrow beside a changed option puts the queue’s value back.',
      useQueue: 'Use the queue’s options',
      hasOwn: 'This item has options of its own.',
      followsQueue: 'This item uses the options of the queue.',
    },
    overrides: {
      label: 'Items with options of their own',
      some: (count) =>
        `${String(count)} ${countOf(count, 'item', 'items')} in the queue ${countOf(count, 'is', 'are')} converted with options of their own.`,
      keep: 'They keep what they set; every other option follows what you choose here.',
      clearAll: 'Use the queue’s options for all',
      cleared: (count) =>
        `${String(count)} ${countOf(count, 'item', 'items')} now ${countOf(count, 'follows', 'follow')} the queue’s options.`,
    },
  },
  'pt-BR': {
    back: 'Voltar',
    advanced: 'Avançado',
    page: {
      title: 'Opções de conversão',
      description:
        'Ajuste o layout das páginas, as imagens, os metadados e a saída de tudo o que está na fila. Suas escolhas ficam guardadas para a próxima vez.',
    },
    item: {
      kicker: 'Avançado · só este item',
      title: (name) => `Opções de ${name}`,
      description:
        'O que você mudar aqui vale só para este item e aparece colorido. Todo o resto segue as opções de conversão da fila, inclusive o que você mudar nelas depois; a seta ao lado de uma opção alterada devolve o valor da fila.',
      useQueue: 'Usar as opções da fila',
      hasOwn: 'Este item tem opções próprias.',
      followsQueue: 'Este item usa as opções da fila.',
    },
    overrides: {
      label: 'Itens com opções próprias',
      some: (count) =>
        `${String(count)} ${countOf(count, 'item da fila é convertido', 'itens da fila são convertidos')} com opções próprias.`,
      keep: 'Eles mantêm o que definiram; todas as outras opções seguem o que você escolher aqui.',
      clearAll: 'Usar as opções da fila em todos',
      cleared: (count) =>
        `${String(count)} ${countOf(count, 'item agora segue', 'itens agora seguem')} as opções da fila.`,
    },
  },
  ja: {
    back: '戻る',
    advanced: '詳細設定',
    page: {
      title: '変換オプション',
      description:
        'キューにあるすべての項目について、ページのレイアウト、画像、メタデータ、出力を細かく調整します。選んだ内容は、次回のために保存されます。',
    },
    item: {
      kicker: '詳細設定 · この項目のみ',
      title: (name) => `「${name}」のオプション`,
      description:
        'ここで変更した内容は、この項目だけに使われ、色付きで表示されます。それ以外は、あとからキューで変更した内容も含め、キューの変換オプションに従います。変更したオプションの横の矢印を押すと、キューの値に戻ります。',
      useQueue: 'キューのオプションを使う',
      hasOwn: 'この項目には、専用のオプションがあります。',
      followsQueue: 'この項目は、キューのオプションを使っています。',
    },
    overrides: {
      label: '専用のオプションがある項目',
      some: (count) => `キューの ${String(count)} 個の項目は、専用のオプションで変換されます。`,
      keep: 'これらの項目は設定した内容を保ち、それ以外のオプションは、ここで選んだ内容に従います。',
      clearAll: 'すべてキューのオプションにする',
      cleared: (count) => `${String(count)} 個の項目が、キューのオプションに従うようになりました。`,
    },
  },
};
