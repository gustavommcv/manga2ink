import type { Language } from '@/domain/app-settings';

/** The words of what every screen shares. */
export interface SharedMessages {
  readonly notices: {
    /** The name of the notices at the top of a screen. */
    readonly label: string;
    readonly dismiss: string;
  };
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const sharedMessages: Readonly<Record<Language, SharedMessages>> = {
  en: { notices: { label: 'Notices', dismiss: 'Dismiss these notices' } },
  'pt-BR': { notices: { label: 'Avisos', dismiss: 'Dispensar estes avisos' } },
};
