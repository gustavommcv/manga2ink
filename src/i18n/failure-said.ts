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

/** What the main process says when a request cannot be done, in every language (ADR 0053). */
export const failureSaid: Readonly<Record<Language, SaidFor<FailureMessageValues>>> = {
  en: {
    'failure.cancelled': () => 'Cancelled.',
    'failure.conversionCancelled': () => 'Conversion cancelled.',
    'failure.internal': () => 'Mangabound could not complete that action.',
    'failure.invalidRequest': () => 'Mangabound rejected an invalid workflow request.',
    'failure.untrustedSender': () => 'Mangabound only takes requests from its own window.',
    'failure.fileAccessDenied': () =>
      'Mangabound was not allowed to use a file or folder it needs. Check the permissions of that folder and try again.',
    'failure.diskFull': () => 'There is no space left on the drive. Free some space and try again.',
    'failure.settingsNotSaved': () => 'Your settings could not be saved.',
    'failure.settingsNotLoaded': () => 'The saved settings could not be loaded.',
    'failure.suggestionNotApplied': () => 'The suggestion could not be applied.',
    'failure.searchNotCompleted': () => 'The search could not be completed.',
    'failure.catalogUnreadable': () => 'The output library catalog could not be read.',
    'failure.toolIncompatible': () =>
      'A bundled conversion tool returned incompatible data. Reinstall Mangabound or open Diagnostics.',
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
      'These pending books are no longer available. Reopen Mangabound to refresh the list.',
    'failure.pendingUnreadable': () =>
      'Pending books could not be loaded. Their files were not deleted; check storage permissions and try restarting Mangabound.',
    'failure.pendingDeleteFailed': () =>
      'The pending books could not be deleted. Check storage permissions and try again.',
    'failure.pendingNotDeleted': () =>
      'Mangabound could not delete these pending books. Please try again.',
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
  },
  'pt-BR': {
    'failure.cancelled': () => 'Cancelado.',
    'failure.conversionCancelled': () => 'Conversão cancelada.',
    'failure.internal': () => 'O Mangabound não conseguiu concluir essa ação.',
    'failure.invalidRequest': () => 'O Mangabound recusou um pedido inválido.',
    'failure.untrustedSender': () => 'O Mangabound só aceita pedidos da própria janela.',
    'failure.fileAccessDenied': () =>
      'O Mangabound não teve permissão para usar um arquivo ou pasta de que precisa. Verifique as permissões dessa pasta e tente de novo.',
    'failure.diskFull': () => 'Não há mais espaço no disco. Libere espaço e tente de novo.',
    'failure.settingsNotSaved': () => 'Não foi possível salvar suas configurações.',
    'failure.settingsNotLoaded': () => 'Não foi possível carregar as configurações salvas.',
    'failure.suggestionNotApplied': () => 'Não foi possível aplicar a sugestão.',
    'failure.searchNotCompleted': () => 'Não foi possível concluir a busca.',
    'failure.catalogUnreadable': () => 'Não foi possível ler o catálogo da biblioteca de saída.',
    'failure.toolIncompatible': () =>
      'Uma das ferramentas de conversão incluídas devolveu dados incompatíveis. Reinstale o Mangabound ou abra o Diagnóstico.',
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
      'Estes livros pendentes não estão mais disponíveis. Reabra o Mangabound para atualizar a lista.',
    'failure.pendingUnreadable': () =>
      'Não foi possível carregar os livros pendentes. Os arquivos não foram apagados; verifique as permissões de armazenamento e tente reiniciar o Mangabound.',
    'failure.pendingDeleteFailed': () =>
      'Não foi possível apagar os livros pendentes. Verifique as permissões de armazenamento e tente de novo.',
    'failure.pendingNotDeleted': () =>
      'O Mangabound não conseguiu apagar estes livros pendentes. Tente de novo.',
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
  },
};
