import type { Language } from '@/domain/app-settings';

/** The words of what every screen shares. */
export interface SharedMessages {
  readonly notices: {
    /** The name of the notices at the top of a screen. */
    readonly label: string;
    readonly dismiss: string;
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
    failure: {
      label: 'Workflow error',
      title: 'Couldn’t complete this step',
      technicalDetails: 'Technical details',
      aBook: 'A book',
    },
  },
  'pt-BR': {
    notices: { label: 'Avisos', dismiss: 'Dispensar estes avisos' },
    failure: {
      label: 'Erro no fluxo',
      title: 'Não foi possível concluir esta etapa',
      technicalDetails: 'Detalhes técnicos',
      aBook: 'Um livro',
    },
  },
};
