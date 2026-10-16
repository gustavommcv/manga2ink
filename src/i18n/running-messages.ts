import type { Language } from '@/domain/app-settings';

/** The words of the screen that shows a conversion going on (ADR 0052). What it is doing is said by code (ADR 0053). */
export interface RunningMessages {
  /** The small line above the heading: the stage the run is in when no item is counted. */
  readonly stage: {
    readonly none: string;
    readonly binding: string;
    readonly processing: string;
    readonly saving: string;
  };
  readonly item: (index: number, total: number) => string;
  /** The heading, with the name of the item or, when the run has none to name, of the books. */
  readonly heading: {
    readonly binding: (name: string) => string;
    readonly converting: (name: string) => string;
    readonly yourBooks: string;
  };
  readonly percentComplete: (percentage: number) => string;
  readonly pagesCopied: (completed: number, total: number) => string;
  readonly details: {
    readonly show: string;
    readonly hide: string;
    readonly region: string;
    readonly volume: (number: number) => string;
    readonly volumeProgress: (number: number) => string;
    readonly status: {
      readonly waiting: string;
      readonly processing: string;
      readonly saving: string;
      readonly done: string;
    };
  };
  readonly cancel: string;
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const runningMessages: Readonly<Record<Language, RunningMessages>> = {
  en: {
    stage: {
      none: 'Processing',
      binding: 'Binding',
      processing: 'Processing',
      saving: 'Saving',
    },
    item: (index, total) => `Item ${String(index)} of ${String(total)}`,
    heading: {
      binding: (name) => `Building volume files for ${name}`,
      converting: (name) => `Converting ${name}`,
      yourBooks: 'your books',
    },
    percentComplete: (percentage) => `${String(percentage)}% complete`,
    pagesCopied: (completed, total) => `${String(completed)} of ${String(total)} pages copied`,
    details: {
      show: 'Show details',
      hide: 'Hide details',
      region: 'Volume details',
      volume: (number) => `Volume ${String(number)}`,
      volumeProgress: (number) => `Volume ${String(number)} progress`,
      status: {
        waiting: 'Waiting',
        processing: 'Converting',
        saving: 'Saving',
        done: 'Complete',
      },
    },
    cancel: 'Cancel conversion',
  },
  'pt-BR': {
    stage: {
      none: 'Processando',
      binding: 'Montando volumes',
      processing: 'Processando',
      saving: 'Salvando',
    },
    item: (index, total) => `Item ${String(index)} de ${String(total)}`,
    heading: {
      binding: (name) => `Montando os arquivos de volume de ${name}`,
      converting: (name) => `Convertendo ${name}`,
      yourBooks: 'seus livros',
    },
    percentComplete: (percentage) => `${String(percentage)}% concluído`,
    pagesCopied: (completed, total) => `${String(completed)} de ${String(total)} páginas copiadas`,
    details: {
      show: 'Mostrar detalhes',
      hide: 'Ocultar detalhes',
      region: 'Detalhes dos volumes',
      volume: (number) => `Volume ${String(number)}`,
      volumeProgress: (number) => `Progresso do volume ${String(number)}`,
      status: {
        waiting: 'Aguardando',
        processing: 'Convertendo',
        saving: 'Salvando',
        done: 'Concluído',
      },
    },
    cancel: 'Cancelar conversão',
  },
};
