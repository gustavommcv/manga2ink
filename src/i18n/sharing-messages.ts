import type { Language } from '@/domain/app-settings';

/**
 * The words of sharing the books on the network (ADR 0052): the Share button of the title bar, the
 * panel it opens, and the card of the results that takes a person there. Why sharing could not
 * start is said by code (ADR 0053).
 */
export interface SharingMessages {
  /** The Share button of the title bar, and the button that puts the panel away. */
  readonly menu: {
    readonly share: string;
    readonly sharing: string;
    readonly close: string;
  };
  /** The card of the results that opens the panel. */
  readonly send: {
    readonly title: string;
    readonly sharing: string;
    readonly text: string;
    readonly show: string;
    readonly share: string;
  };
  readonly panel: {
    readonly title: string;
    readonly intro: string;
    readonly addressLabel: string;
    readonly copyAddress: string;
    readonly copy: string;
    readonly copied: string;
    /** How to add the address in KOReader, whose own menus are named as it names them. */
    readonly inKoreader: string;
    readonly stop: string;
    readonly chooseLibrary: string;
    readonly changeLibrary: string;
    readonly noInterfaces: string;
    readonly networkInterface: string;
    readonly username: string;
    readonly noUsername: string;
    readonly password: string;
    readonly noPassword: string;
    readonly blankHint: string;
    readonly start: string;
  };
  /** What the panel calls the books of the run that was just made, where a folder would be named. */
  readonly booksReady: string;
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const sharingMessages: Readonly<Record<Language, SharingMessages>> = {
  en: {
    menu: { share: 'Share', sharing: 'Sharing', close: 'Close sharing' },
    send: {
      title: 'Send to KOReader',
      sharing: 'Sharing',
      text: 'KOReader downloads the books from this computer over your Wi-Fi.',
      show: 'Show sharing',
      share: 'Share these books',
    },
    panel: {
      title: 'Share to your e-reader',
      intro:
        "Serves a newest-first catalog on your network, so KOReader or any OPDS reader can browse and download what you've converted.",
      addressLabel: 'Catalog address',
      copyAddress: 'Copy the address',
      copy: 'Copy',
      copied: 'Copied',
      inKoreader:
        'In KOReader: Search, then OPDS catalog, then add this address. Keep Mangabound open while it syncs.',
      stop: 'Stop sharing',
      chooseLibrary: 'Choose a library to share',
      changeLibrary: 'Change shared library',
      noInterfaces: 'No network interfaces were detected.',
      networkInterface: 'Network interface',
      username: 'Username',
      noUsername: 'No username',
      password: 'Password',
      noPassword: 'No password',
      blankHint: 'Leave both blank to share with no password.',
      start: 'Start sharing',
    },
    booksReady: 'Books ready to share',
  },
  'pt-BR': {
    menu: { share: 'Compartilhar', sharing: 'Compartilhando', close: 'Fechar compartilhamento' },
    send: {
      title: 'Enviar para o KOReader',
      sharing: 'Compartilhando',
      text: 'O KOReader baixa os livros deste computador pela sua rede Wi-Fi.',
      show: 'Mostrar compartilhamento',
      share: 'Compartilhar estes livros',
    },
    panel: {
      title: 'Compartilhar com o seu e-reader',
      intro:
        'Serve na sua rede um catálogo com os mais recentes primeiro, para que o KOReader ou qualquer leitor OPDS navegue e baixe o que você converteu.',
      addressLabel: 'Endereço do catálogo',
      copyAddress: 'Copiar o endereço',
      copy: 'Copiar',
      copied: 'Copiado',
      inKoreader:
        'No KOReader: Search, depois OPDS catalog, e adicione este endereço. Mantenha o Mangabound aberto enquanto ele sincroniza.',
      stop: 'Parar de compartilhar',
      chooseLibrary: 'Escolher uma biblioteca para compartilhar',
      changeLibrary: 'Trocar a biblioteca compartilhada',
      noInterfaces: 'Nenhuma interface de rede foi detectada.',
      networkInterface: 'Interface de rede',
      username: 'Usuário',
      noUsername: 'Sem usuário',
      password: 'Senha',
      noPassword: 'Sem senha',
      blankHint: 'Deixe os dois em branco para compartilhar sem senha.',
      start: 'Começar a compartilhar',
    },
    booksReady: 'Livros prontos para compartilhar',
  },
  ja: {
    menu: { share: '共有', sharing: '共有中', close: '共有を閉じる' },
    send: {
      title: 'KOReader に送信',
      sharing: '共有中',
      text: 'KOReader が、お使いの Wi-Fi を通じてこのパソコンから本をダウンロードします。',
      show: '共有を表示',
      share: 'これらの本を共有',
    },
    panel: {
      title: '電子書籍リーダーに共有',
      intro:
        'ネットワーク上に、新しい順のカタログを公開します。KOReader などの OPDS リーダーから、変換した本を閲覧してダウンロードできます。',
      addressLabel: 'カタログのアドレス',
      copyAddress: 'アドレスをコピー',
      copy: 'コピー',
      copied: 'コピーしました',
      inKoreader:
        'KOReader では、「検索」→「OPDS カタログ」の順に開き、このアドレスを追加します。同期が終わるまで、Mangabound を開いたままにしてください。',
      stop: '共有を停止',
      chooseLibrary: '共有するライブラリを選択',
      changeLibrary: '共有するライブラリを変更',
      noInterfaces: 'ネットワークインターフェースが見つかりませんでした。',
      networkInterface: 'ネットワークインターフェース',
      username: 'ユーザー名',
      noUsername: 'ユーザー名なし',
      password: 'パスワード',
      noPassword: 'パスワードなし',
      blankHint: 'パスワードなしで共有するには、両方を空欄にしてください。',
      start: '共有を開始',
    },
    booksReady: '共有できる本',
  },
};
