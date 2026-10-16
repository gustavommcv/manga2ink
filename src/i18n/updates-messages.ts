import type { Language } from '@/domain/app-settings';

/** The words of the Updates tab of the app settings. */
export interface UpdatesMessages {
  readonly notice: {
    readonly title: string;
    readonly text: string;
  };
  /** Said before the number of the version that is installed. */
  readonly installed: string;
  readonly check: string;
  readonly automatic: {
    readonly label: string;
    readonly help: string;
  };
  readonly channel: {
    readonly label: string;
    readonly stable: string;
    readonly prerelease: string;
  };
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const updatesMessages: Readonly<Record<Language, UpdatesMessages>> = {
  en: {
    notice: {
      title: 'Not available yet',
      text: 'The app cannot update itself yet. For now, new versions are downloaded from the project’s releases page. The options below will work when the feature arrives.',
    },
    installed: 'Installed version',
    check: 'Check for updates',
    automatic: {
      label: 'Check for updates automatically',
      help: 'Looks for a new version when the app starts.',
    },
    channel: {
      label: 'Versions to look for',
      stable: 'Stable versions only',
      prerelease: 'Stable and pre-release versions',
    },
  },
  'pt-BR': {
    notice: {
      title: 'Ainda não disponível',
      text: 'O app ainda não consegue se atualizar sozinho. Por enquanto, as versões novas são baixadas na página de lançamentos do projeto. As opções abaixo passarão a funcionar quando o recurso chegar.',
    },
    installed: 'Versão instalada',
    check: 'Verificar atualizações',
    automatic: {
      label: 'Verificar atualizações automaticamente',
      help: 'Procura uma versão nova quando o app abre.',
    },
    channel: {
      label: 'Versões a procurar',
      stable: 'Só versões estáveis',
      prerelease: 'Estáveis e de pré-lançamento',
    },
  },
};
