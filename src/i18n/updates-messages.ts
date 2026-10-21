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
  /** On the button while the list of releases is being read. */
  readonly checking: string;
  readonly upToDate: (version: string) => string;
  /** A newer version is out; the day it was published is said when the release gives one. */
  readonly available: (version: string, day: string | undefined) => string;
  readonly download: string;
  /** The page of the downloads could not be opened in the browser. */
  readonly openFailed: string;
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
      title: 'Updates are manual for now',
      text: 'The app looks for a newer version when you ask. It cannot install one itself yet: when there is a new version, a button opens the download page in your browser. The options below will work when the app can update itself.',
    },
    installed: 'Installed version',
    check: 'Check for updates',
    checking: 'Checking…',
    upToDate: (version) => `You have the latest version (${version}).`,
    available: (version, day) =>
      day === undefined
        ? `A new version is available: ${version}.`
        : `A new version is available: ${version}, published on ${day}.`,
    download: 'Download the update',
    openFailed: 'The download page could not be opened. Try again.',
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
      title: 'Atualizações manuais por enquanto',
      text: 'O app procura uma versão mais nova quando você pede. Ele ainda não consegue instalá-la sozinho: quando houver uma versão nova, um botão abre a página de download no seu navegador. As opções abaixo passarão a funcionar quando o app puder se atualizar sozinho.',
    },
    installed: 'Versão instalada',
    check: 'Buscar atualizações',
    checking: 'Buscando…',
    upToDate: (version) => `Você está com a versão mais recente (${version}).`,
    available: (version, day) =>
      day === undefined
        ? `Há uma versão nova: ${version}.`
        : `Há uma versão nova: ${version}, publicada em ${day}.`,
    download: 'Baixar a atualização',
    openFailed: 'Não foi possível abrir a página de download. Tente de novo.',
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
  ja: {
    notice: {
      title: '更新は今のところ手動です',
      text: 'アプリは、操作したときに新しいバージョンを確認します。まだアプリ自身でインストールすることはできません。新しいバージョンがあるときは、ボタンからブラウザーでダウンロードページを開けます。下のオプションは、アプリが自分で更新できるようになってから使えます。',
    },
    installed: 'インストール済みのバージョン',
    check: '更新を確認',
    checking: '確認中…',
    upToDate: (version) => `最新のバージョン（${version}）をお使いです。`,
    available: (version, day) =>
      day === undefined
        ? `新しいバージョン ${version} があります。`
        : `新しいバージョン ${version} があります（${day}公開）。`,
    download: '更新をダウンロード',
    openFailed: 'ダウンロードページを開けませんでした。もう一度お試しください。',
    automatic: {
      label: '更新を自動的に確認',
      help: 'アプリの起動時に、新しいバージョンがないか確認します。',
    },
    channel: {
      label: '確認するバージョン',
      stable: '安定版のみ',
      prerelease: '安定版とプレリリース版',
    },
  },
};
