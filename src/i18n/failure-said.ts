import type { Language } from '@/domain/app-settings';
import type { FailureMessageValues, RunningThing } from '@/domain/messages/failure';

import type { SaidFor } from './say';

/** What is already running, as it is said in each language. */
const runningEnglish: Readonly<Record<RunningThing, string>> = {
  validation: 'validation',
  discovery: 'discovery',
  search: 'search',
  lookup: 'lookup',
  conversion: 'conversion',
};
const runningPortuguese: Readonly<Record<RunningThing, string>> = {
  validation: 'Essa validação já está em andamento.',
  discovery: 'Essa leitura da biblioteca já está em andamento.',
  search: 'Essa busca já está em andamento.',
  lookup: 'Essa consulta já está em andamento.',
  conversion: 'Essa conversão já está em andamento.',
};
const runningJapanese: Readonly<Record<RunningThing, string>> = {
  validation: 'その検証は、すでに実行中です。',
  discovery: 'そのライブラリの読み込みは、すでに実行中です。',
  search: 'その検索は、すでに実行中です。',
  lookup: 'その照会は、すでに実行中です。',
  conversion: 'その変換は、すでに実行中です。',
};

/** What the main process says when a request cannot be done, in every language (ADR 0053). */
export const failureSaid: Readonly<Record<Language, SaidFor<FailureMessageValues>>> = {
  en: {
    'failure.cancelled': () => 'Cancelled.',
    'failure.conversionCancelled': () => 'Conversion cancelled.',
    'failure.internal': () => 'Manga2Ink could not complete that action.',
    'failure.invalidRequest': () => 'Manga2Ink rejected an invalid workflow request.',
    'failure.untrustedSender': () => 'Manga2Ink only takes requests from its own window.',
    'failure.fileAccessDenied': () =>
      'Manga2Ink was not allowed to use a file or folder it needs. Check the permissions of that folder and try again.',
    'failure.diskFull': () => 'There is no space left on the drive. Free some space and try again.',
    'failure.settingsNotSaved': () => 'Your settings could not be saved.',
    'failure.settingsNotLoaded': () => 'The saved settings could not be loaded.',
    'failure.suggestionNotApplied': () => 'The suggestion could not be applied.',
    'failure.searchNotCompleted': () => 'The search could not be completed.',
    'failure.catalogUnreadable': () => 'The output library catalog could not be read.',
    'failure.toolIncompatible': () =>
      'A bundled conversion tool returned incompatible data. Reinstall Manga2Ink or open Diagnostics.',
    'failure.bindingFailed': () => 'Mangabind could not build the selected volumes.',
    'failure.conversionFailed': () => 'Mangapress could not convert this volume.',
    'failure.titleNotConverted': () => 'It could not be converted.',
    'failure.coverUnusable': ({ book }) =>
      `The cover chosen for ${book} could not be used. Remove it, or choose another image, on the book’s details page.`,
    'failure.alreadyRunning': ({ what }) => `That ${runningEnglish[what]} is already running.`,
    'failure.conversionNotRunning': () => 'That conversion is no longer running.',
    'failure.sourceUnavailable': () => 'That source is not available.',
    'failure.sourceUnsafeAddress': () => 'That source has no safe address.',
    'failure.savedBookGone': () => 'The saved book is no longer available.',
    'failure.chooseInputAgain': () => 'Choose the input again.',
    'failure.chooseLibraryAgain': () => 'Choose a library to share again.',
    'failure.pendingConversionGone': () => 'The pending conversion is no longer available.',
    'failure.pendingConversionBeingDeleted': () => 'The pending conversion is being deleted.',
    'failure.pendingStillSaving': () =>
      'Wait for this pending run to finish saving before deleting it.',
    'failure.pendingNotFound': () =>
      'These pending books are no longer available. Reopen Manga2Ink to refresh the list.',
    'failure.pendingUnreadable': () =>
      'Pending books could not be loaded. Their files were not deleted; check storage permissions and try restarting Manga2Ink.',
    'failure.pendingDeleteFailed': () =>
      'The pending books could not be deleted. Check storage permissions and try again.',
    'failure.pendingNotDeleted': () =>
      'Manga2Ink could not delete these pending books. Please try again.',
    'failure.readyBooksShared': () =>
      'The ready books are being shared. Stop sharing before deleting their pending copies.',
    'failure.waitForConversion': () =>
      'Wait for the current conversion to finish before deleting pending books.',
    'failure.sharingAlreadyRunning': () => 'Sharing is already running.',
    'failure.sharingNotRunning': () => 'Sharing is not running.',
    'failure.sharingAddressUnavailable': () =>
      'That network address is not available on this device. Choose one from the list.',
    'failure.sharingPendingBeingDeleted': () =>
      'These pending books are being deleted and can no longer be shared.',
    'failure.sharingPortInUse': ({ port }) =>
      `Port ${String(port)} is already used by another program on this device. Close it and try again.`,
    'failure.sharingAddressRefused': () =>
      'The sharing server could not be started on that network address.',
    'failure.processingFolderUnavailable': ({ folder }) =>
      `The processing folder ${folder} is not available. Connect its drive again, or choose another folder in the app settings.`,
    'failure.processingFolderUnusable': ({ folder }) =>
      `Manga2Ink cannot work in ${folder}. Choose a folder it can write in.`,
    'failure.processingBusy': () =>
      'A conversion or a share is running. Finish or stop it, then try again.',
    'failure.diagnosticsNotCopied': () => 'The diagnostics could not be copied.',
    'failure.folderNotOpened': () =>
      'The folder could not be opened. Open it from your file manager instead.',
  },
  'pt-BR': {
    'failure.cancelled': () => 'Cancelado.',
    'failure.conversionCancelled': () => 'Conversão cancelada.',
    'failure.internal': () => 'O Manga2Ink não conseguiu concluir essa ação.',
    'failure.invalidRequest': () => 'O Manga2Ink recusou um pedido inválido.',
    'failure.untrustedSender': () => 'O Manga2Ink só aceita pedidos da própria janela.',
    'failure.fileAccessDenied': () =>
      'O Manga2Ink não teve permissão para usar um arquivo ou pasta de que precisa. Verifique as permissões dessa pasta e tente de novo.',
    'failure.diskFull': () => 'Não há mais espaço no disco. Libere espaço e tente de novo.',
    'failure.settingsNotSaved': () => 'Não foi possível salvar suas configurações.',
    'failure.settingsNotLoaded': () => 'Não foi possível carregar as configurações salvas.',
    'failure.suggestionNotApplied': () => 'Não foi possível aplicar a sugestão.',
    'failure.searchNotCompleted': () => 'Não foi possível concluir a busca.',
    'failure.catalogUnreadable': () => 'Não foi possível ler o catálogo da biblioteca de saída.',
    'failure.toolIncompatible': () =>
      'Uma das ferramentas de conversão incluídas devolveu dados incompatíveis. Reinstale o Manga2Ink ou abra o Diagnóstico.',
    'failure.bindingFailed': () => 'O mangabind não conseguiu montar os volumes escolhidos.',
    'failure.conversionFailed': () => 'O mangapress não conseguiu converter este volume.',
    'failure.titleNotConverted': () => 'Não foi possível converter.',
    'failure.coverUnusable': ({ book }) =>
      `Não foi possível usar a capa escolhida para ${book}. Remova-a, ou escolha outra imagem, na página de detalhes do livro.`,
    'failure.alreadyRunning': ({ what }) => runningPortuguese[what],
    'failure.conversionNotRunning': () => 'Essa conversão não está mais em andamento.',
    'failure.sourceUnavailable': () => 'Essa fonte não está disponível.',
    'failure.sourceUnsafeAddress': () => 'Essa fonte não tem um endereço seguro.',
    'failure.savedBookGone': () => 'O livro salvo não está mais disponível.',
    'failure.chooseInputAgain': () => 'Escolha o item de novo.',
    'failure.chooseLibraryAgain': () => 'Escolha de novo uma biblioteca para compartilhar.',
    'failure.pendingConversionGone': () => 'A conversão pendente não está mais disponível.',
    'failure.pendingConversionBeingDeleted': () => 'A conversão pendente está sendo apagada.',
    'failure.pendingStillSaving': () =>
      'Espere esta conversão pendente terminar de salvar antes de apagá-la.',
    'failure.pendingNotFound': () =>
      'Estes livros pendentes não estão mais disponíveis. Reabra o Manga2Ink para atualizar a lista.',
    'failure.pendingUnreadable': () =>
      'Não foi possível carregar os livros pendentes. Os arquivos não foram apagados; verifique as permissões de armazenamento e tente reiniciar o Manga2Ink.',
    'failure.pendingDeleteFailed': () =>
      'Não foi possível apagar os livros pendentes. Verifique as permissões de armazenamento e tente de novo.',
    'failure.pendingNotDeleted': () =>
      'O Manga2Ink não conseguiu apagar estes livros pendentes. Tente de novo.',
    'failure.readyBooksShared': () =>
      'Os livros prontos estão sendo compartilhados. Pare o compartilhamento antes de apagar as cópias pendentes.',
    'failure.waitForConversion': () =>
      'Espere a conversão atual terminar antes de apagar livros pendentes.',
    'failure.sharingAlreadyRunning': () => 'O compartilhamento já está em andamento.',
    'failure.sharingNotRunning': () => 'O compartilhamento não está em andamento.',
    'failure.sharingAddressUnavailable': () =>
      'Esse endereço de rede não está disponível neste dispositivo. Escolha um da lista.',
    'failure.sharingPendingBeingDeleted': () =>
      'Estes livros pendentes estão sendo apagados e não podem mais ser compartilhados.',
    'failure.sharingPortInUse': ({ port }) =>
      `A porta ${String(port)} já está em uso por outro programa neste dispositivo. Feche-o e tente de novo.`,
    'failure.sharingAddressRefused': () =>
      'Não foi possível iniciar o servidor de compartilhamento nesse endereço de rede.',
    'failure.processingFolderUnavailable': ({ folder }) =>
      `A pasta de trabalho ${folder} não está disponível. Conecte o disco dela de novo ou escolha outra pasta nas configurações do app.`,
    'failure.processingFolderUnusable': ({ folder }) =>
      `O Manga2Ink não consegue trabalhar em ${folder}. Escolha uma pasta em que ele possa gravar.`,
    'failure.processingBusy': () =>
      'Há uma conversão ou um compartilhamento em andamento. Termine ou interrompa, e tente de novo.',
    'failure.diagnosticsNotCopied': () => 'Não foi possível copiar o diagnóstico.',
    'failure.folderNotOpened': () =>
      'Não foi possível abrir a pasta. Abra-a pelo gerenciador de arquivos.',
  },
  ja: {
    'failure.cancelled': () => 'キャンセルしました。',
    'failure.conversionCancelled': () => '変換をキャンセルしました。',
    'failure.internal': () => 'Manga2Ink はその操作を完了できませんでした。',
    'failure.invalidRequest': () => 'Manga2Ink は、無効なリクエストを拒否しました。',
    'failure.untrustedSender': () =>
      'Manga2Ink は、自身のウィンドウからのリクエストだけを受け付けます。',
    'failure.fileAccessDenied': () =>
      'Manga2Ink は、必要なファイルまたはフォルダーを使用する許可を得られませんでした。そのフォルダーのアクセス許可を確認して、もう一度お試しください。',
    'failure.diskFull': () =>
      'ドライブの空き容量がありません。空き容量を確保して、もう一度お試しください。',
    'failure.settingsNotSaved': () => '設定を保存できませんでした。',
    'failure.settingsNotLoaded': () => '保存された設定を読み込めませんでした。',
    'failure.suggestionNotApplied': () => '提案を適用できませんでした。',
    'failure.searchNotCompleted': () => '検索を完了できませんでした。',
    'failure.catalogUnreadable': () => '出力ライブラリのカタログを読み込めませんでした。',
    'failure.toolIncompatible': () =>
      '同梱の変換ツールが、互換性のないデータを返しました。Manga2Ink を再インストールするか、診断情報を開いてください。',
    'failure.bindingFailed': () => 'mangabind は、選ばれた巻を作成できませんでした。',
    'failure.conversionFailed': () => 'mangapress は、この巻を変換できませんでした。',
    'failure.titleNotConverted': () => '変換できませんでした。',
    'failure.coverUnusable': ({ book }) =>
      `「${book}」に選んだ表紙を使用できませんでした。本の詳細ページで、表紙を削除するか、別の画像を選んでください。`,
    'failure.alreadyRunning': ({ what }) => runningJapanese[what],
    'failure.conversionNotRunning': () => 'その変換は、もう実行されていません。',
    'failure.sourceUnavailable': () => 'その情報源は利用できません。',
    'failure.sourceUnsafeAddress': () => 'その情報源には、安全なアドレスがありません。',
    'failure.savedBookGone': () => '保存された本は、もう利用できません。',
    'failure.chooseInputAgain': () => '入力をもう一度選んでください。',
    'failure.chooseLibraryAgain': () => '共有するライブラリを、もう一度選んでください。',
    'failure.pendingConversionGone': () => '保留中の変換は、もう利用できません。',
    'failure.pendingConversionBeingDeleted': () => '保留中の変換は、削除されているところです。',
    'failure.pendingStillSaving': () =>
      '保留中のこの変換を削除する前に、保存が終わるのを待ってください。',
    'failure.pendingNotFound': () =>
      'これらの保留中の本は、もう利用できません。Manga2Ink を開き直して、一覧を更新してください。',
    'failure.pendingUnreadable': () =>
      '保留中の本を読み込めませんでした。ファイルは削除されていません。保存場所のアクセス許可を確認して、Manga2Ink を再起動してみてください。',
    'failure.pendingDeleteFailed': () =>
      '保留中の本を削除できませんでした。保存場所のアクセス許可を確認して、もう一度お試しください。',
    'failure.pendingNotDeleted': () =>
      'Manga2Ink は、これらの保留中の本を削除できませんでした。もう一度お試しください。',
    'failure.readyBooksShared': () =>
      '完成した本は共有されています。保留中のコピーを削除する前に、共有を停止してください。',
    'failure.waitForConversion': () =>
      '保留中の本を削除する前に、実行中の変換が終わるのを待ってください。',
    'failure.sharingAlreadyRunning': () => '共有はすでに実行中です。',
    'failure.sharingNotRunning': () => '共有は実行されていません。',
    'failure.sharingAddressUnavailable': () =>
      'このネットワークアドレスは、このパソコンでは利用できません。一覧から選んでください。',
    'failure.sharingPendingBeingDeleted': () =>
      'これらの保留中の本は削除されているところで、共有できなくなりました。',
    'failure.sharingPortInUse': ({ port }) =>
      `ポート ${String(port)} は、このパソコンの別のプログラムがすでに使用しています。そのプログラムを閉じて、もう一度お試しください。`,
    'failure.sharingAddressRefused': () =>
      'そのネットワークアドレスでは、共有サーバーを起動できませんでした。',
    'failure.processingFolderUnavailable': ({ folder }) =>
      `作業フォルダー「${folder}」を利用できません。ドライブを接続し直すか、アプリの設定で別のフォルダーを選んでください。`,
    'failure.processingFolderUnusable': ({ folder }) =>
      `Manga2Ink は「${folder}」で作業できません。書き込めるフォルダーを選んでください。`,
    'failure.processingBusy': () =>
      '変換または共有が実行中です。終了または停止してから、もう一度お試しください。',
    'failure.diagnosticsNotCopied': () => '診断情報をコピーできませんでした。',
    'failure.folderNotOpened': () =>
      'フォルダーを開けませんでした。代わりに、お使いのファイルマネージャーから開いてください。',
  },
};
