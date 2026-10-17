import type { FailureMessageValues } from '@/domain/messages/failure';
import type { InputMessageValues } from '@/domain/messages/input';
import type { NoticeMessageValues } from '@/domain/messages/notice';
import type { ProviderMessageValues } from '@/domain/messages/provider';
import type { SaveMessageValues } from '@/domain/messages/save';
import type { WorkflowMessageValues } from '@/domain/messages/workflow';

import type { Rows } from './said-table';

/** What is said when something cannot be done, and what the person is told at the start (ADR 0053). */
export const failureRows: Rows<
  FailureMessageValues &
    InputMessageValues &
    NoticeMessageValues &
    ProviderMessageValues &
    SaveMessageValues &
    WorkflowMessageValues
> = {
  'failure.cancelled': [[{}, 'Cancelled.', 'Cancelado.']],
  'failure.conversionCancelled': [[{}, 'Conversion cancelled.', 'Conversão cancelada.']],
  'failure.internal': [
    [
      {},
      'Mangabound could not complete that action.',
      'O Mangabound não conseguiu concluir essa ação.',
    ],
  ],
  'failure.invalidRequest': [
    [
      {},
      'Mangabound rejected an invalid workflow request.',
      'O Mangabound recusou um pedido inválido.',
    ],
  ],
  'failure.untrustedSender': [
    [
      {},
      'Mangabound only takes requests from its own window.',
      'O Mangabound só aceita pedidos da própria janela.',
    ],
  ],
  'failure.fileAccessDenied': [
    [
      {},
      'Mangabound was not allowed to use a file or folder it needs. Check the permissions of that folder and try again.',
      'O Mangabound não teve permissão para usar um arquivo ou pasta de que precisa. Verifique as permissões dessa pasta e tente de novo.',
    ],
  ],
  'failure.diskFull': [
    [
      {},
      'There is no space left on the drive. Free some space and try again.',
      'Não há mais espaço no disco. Libere espaço e tente de novo.',
    ],
  ],
  'failure.settingsNotSaved': [
    [{}, 'Your settings could not be saved.', 'Não foi possível salvar suas configurações.'],
  ],
  'failure.settingsNotLoaded': [
    [
      {},
      'The saved settings could not be loaded.',
      'Não foi possível carregar as configurações salvas.',
    ],
  ],
  'failure.suggestionNotApplied': [
    [{}, 'The suggestion could not be applied.', 'Não foi possível aplicar a sugestão.'],
  ],
  'failure.searchNotCompleted': [
    [{}, 'The search could not be completed.', 'Não foi possível concluir a busca.'],
  ],
  'failure.catalogUnreadable': [
    [
      {},
      'The output library catalog could not be read.',
      'Não foi possível ler o catálogo da biblioteca de saída.',
    ],
  ],
  'failure.toolIncompatible': [
    [
      {},
      'A bundled conversion tool returned incompatible data. Reinstall Mangabound or open Diagnostics.',
      'Uma das ferramentas de conversão incluídas devolveu dados incompatíveis. Reinstale o Mangabound ou abra o Diagnóstico.',
    ],
  ],
  'failure.bindingFailed': [
    [
      {},
      'Mangabind could not build the selected volumes.',
      'O mangabind não conseguiu montar os volumes escolhidos.',
    ],
  ],
  'failure.conversionFailed': [
    [
      {},
      'Mangapress could not convert this volume.',
      'O mangapress não conseguiu converter este volume.',
    ],
  ],
  'failure.titleNotConverted': [[{}, 'It could not be converted.', 'Não foi possível converter.']],
  'failure.coverUnusable': [
    [
      { book: 'Vol.01.epub' },
      'The cover chosen for Vol.01.epub could not be used. Remove it, or choose another image, on the book’s details page.',
      'Não foi possível usar a capa escolhida para Vol.01.epub. Remova-a, ou escolha outra imagem, na página de detalhes do livro.',
    ],
  ],
  'failure.alreadyRunning': [
    [
      { what: 'validation' },
      'That validation is already running.',
      'Essa validação já está em andamento.',
    ],
    [
      { what: 'discovery' },
      'That discovery is already running.',
      'Essa leitura da biblioteca já está em andamento.',
    ],
    [{ what: 'search' }, 'That search is already running.', 'Essa busca já está em andamento.'],
    [{ what: 'lookup' }, 'That lookup is already running.', 'Essa consulta já está em andamento.'],
    [
      { what: 'conversion' },
      'That conversion is already running.',
      'Essa conversão já está em andamento.',
    ],
  ],
  'failure.conversionNotRunning': [
    [{}, 'That conversion is no longer running.', 'Essa conversão não está mais em andamento.'],
  ],
  'failure.sourceUnavailable': [
    [{}, 'That source is not available.', 'Essa fonte não está disponível.'],
  ],
  'failure.sourceUnsafeAddress': [
    [{}, 'That source has no safe address.', 'Essa fonte não tem um endereço seguro.'],
  ],
  'failure.savedBookGone': [
    [{}, 'The saved book is no longer available.', 'O livro salvo não está mais disponível.'],
  ],
  'failure.chooseInputAgain': [[{}, 'Choose the input again.', 'Escolha o item de novo.']],
  'failure.chooseLibraryAgain': [
    [{}, 'Choose a library to share again.', 'Escolha de novo uma biblioteca para compartilhar.'],
  ],
  'failure.pendingConversionGone': [
    [
      {},
      'The pending conversion is no longer available.',
      'A conversão pendente não está mais disponível.',
    ],
  ],
  'failure.pendingConversionBeingDeleted': [
    [{}, 'The pending conversion is being deleted.', 'A conversão pendente está sendo apagada.'],
  ],
  'failure.pendingStillSaving': [
    [
      {},
      'Wait for this pending run to finish saving before deleting it.',
      'Espere esta conversão pendente terminar de salvar antes de apagá-la.',
    ],
  ],
  'failure.pendingNotFound': [
    [
      {},
      'These pending books are no longer available. Reopen Mangabound to refresh the list.',
      'Estes livros pendentes não estão mais disponíveis. Reabra o Mangabound para atualizar a lista.',
    ],
  ],
  'failure.pendingUnreadable': [
    [
      {},
      'Pending books could not be loaded. Their files were not deleted; check storage permissions and try restarting Mangabound.',
      'Não foi possível carregar os livros pendentes. Os arquivos não foram apagados; verifique as permissões de armazenamento e tente reiniciar o Mangabound.',
    ],
  ],
  'failure.pendingDeleteFailed': [
    [
      {},
      'The pending books could not be deleted. Check storage permissions and try again.',
      'Não foi possível apagar os livros pendentes. Verifique as permissões de armazenamento e tente de novo.',
    ],
  ],
  'failure.pendingNotDeleted': [
    [
      {},
      'Mangabound could not delete these pending books. Please try again.',
      'O Mangabound não conseguiu apagar estes livros pendentes. Tente de novo.',
    ],
  ],
  'failure.readyBooksShared': [
    [
      {},
      'The ready books are being shared. Stop sharing before deleting their pending copies.',
      'Os livros prontos estão sendo compartilhados. Pare o compartilhamento antes de apagar as cópias pendentes.',
    ],
  ],
  'failure.waitForConversion': [
    [
      {},
      'Wait for the current conversion to finish before deleting pending books.',
      'Espere a conversão atual terminar antes de apagar livros pendentes.',
    ],
  ],
  'failure.sharingAlreadyRunning': [
    [{}, 'Sharing is already running.', 'O compartilhamento já está em andamento.'],
  ],
  'failure.sharingNotRunning': [
    [{}, 'Sharing is not running.', 'O compartilhamento não está em andamento.'],
  ],
  'failure.sharingAddressUnavailable': [
    [
      {},
      'That network address is not available on this device. Choose one from the list.',
      'Esse endereço de rede não está disponível neste dispositivo. Escolha um da lista.',
    ],
  ],
  'failure.sharingPendingBeingDeleted': [
    [
      {},
      'These pending books are being deleted and can no longer be shared.',
      'Estes livros pendentes estão sendo apagados e não podem mais ser compartilhados.',
    ],
  ],
  'failure.sharingPortInUse': [
    [
      { port: 8080 },
      'Port 8080 is already used by another program on this device. Close it and try again.',
      'A porta 8080 já está em uso por outro programa neste dispositivo. Feche-o e tente de novo.',
    ],
  ],
  'failure.sharingAddressRefused': [
    [
      {},
      'The sharing server could not be started on that network address.',
      'Não foi possível iniciar o servidor de compartilhamento nesse endereço de rede.',
    ],
  ],
  'failure.processingFolderUnavailable': [
    [
      { folder: '/mnt/books' },
      'The processing folder /mnt/books is not available. Connect its drive again, or choose another folder in the app settings.',
      'A pasta de trabalho /mnt/books não está disponível. Conecte o disco dela de novo ou escolha outra pasta nas configurações do app.',
    ],
  ],
  'failure.processingFolderUnusable': [
    [
      { folder: '/mnt/books' },
      'Mangabound cannot work in /mnt/books. Choose a folder it can write in.',
      'O Mangabound não consegue trabalhar em /mnt/books. Escolha uma pasta em que ele possa gravar.',
    ],
  ],
  'failure.diagnosticsNotCopied': [
    [{}, 'The diagnostics could not be copied.', 'Não foi possível copiar o diagnóstico.'],
  ],
  'failure.folderNotOpened': [
    [
      {},
      'The folder could not be opened. Open it from your file manager instead.',
      'Não foi possível abrir a pasta. Abra-a pelo gerenciador de arquivos.',
    ],
  ],
  'failure.processingBusy': [
    [
      {},
      'A conversion or a share is running. Finish or stop it, then try again.',
      'Há uma conversão ou um compartilhamento em andamento. Termine ou interrompa, e tente de novo.',
    ],
  ],

  'notice.settingsUnreadable': [
    [
      {},
      'The saved settings could not be read, so the defaults are in use.',
      'Não foi possível ler as configurações salvas, então os padrões estão em uso.',
    ],
  ],
  'notice.optionsReset': [
    [
      { options: ['gamma'] },
      'Some saved options could not be used and are back to their defaults: gamma.',
      'Algumas opções salvas não puderam ser usadas e voltaram aos padrões: gama.',
    ],
    [
      { options: ['quiet', 'croppingMinimum'] },
      'Some saved options could not be used and are back to their defaults: quiet, cropping minimum.',
      'Algumas opções salvas não puderam ser usadas e voltaram aos padrões: modo silencioso, área mínima mantida.',
    ],
  ],

  'notice.deviceFallback': [
    [
      { profile: 'KPW5', name: 'Kindle Paperwhite 6' },
      'The device profile KPW5 is not available, so Kindle Paperwhite 6 is selected.',
      'O perfil de dispositivo KPW5 não está disponível, então Kindle Paperwhite 6 foi selecionado.',
    ],
  ],

  'input.unreadable': [[{}, 'That item could not be read.', 'Não foi possível ler esse item.']],
  'input.onlyFoldersAndCbz': [
    [
      {},
      'Only folders and .cbz files can be added.',
      'Só é possível adicionar pastas e arquivos .cbz.',
    ],
  ],
  'input.overLimit': [
    [
      { left: 1, limit: 100 },
      'Only the first 100 items are added at once; 1 was left out.',
      'Só os primeiros 100 itens são adicionados de uma vez; 1 ficou de fora.',
    ],
    [
      { left: 5, limit: 100 },
      'Only the first 100 items are added at once; 5 were left out.',
      'Só os primeiros 100 itens são adicionados de uma vez; 5 ficaram de fora.',
    ],
  ],

  'workflow.inputGone': [
    [
      {},
      'This input is no longer available. Choose it again.',
      'Este item não está mais disponível. Escolha-o de novo.',
    ],
  ],
  'workflow.titleGone': [
    [
      {},
      'That title is no longer in the library. Choose the library again.',
      'Esse título não está mais na biblioteca. Escolha a biblioteca de novo.',
    ],
  ],
  'workflow.notALibrary': [[{}, 'This input is not a library.', 'Este item não é uma biblioteca.']],
  'workflow.libraryNeedsTitle': [
    [
      {},
      'A library is made of titles; choose one of them.',
      'Uma biblioteca é feita de títulos; escolha um deles.',
    ],
  ],
  'workflow.libraryByTitle': [
    [
      {},
      'A library is converted title by title, not as one input.',
      'Uma biblioteca é convertida título por título, e não como um item só.',
    ],
  ],
  'workflow.detailsNeedFolder': [
    [
      {},
      'The author and language are kept with a folder, and this input is not one.',
      'O autor e o idioma ficam guardados com uma pasta, e este item não é uma.',
    ],
  ],
  'workflow.mappingInvalid': [
    [
      {},
      'The chapter mapping contains unknown or invalid assignments.',
      'O mapeamento dos capítulos tem atribuições desconhecidas ou inválidas.',
    ],
  ],
  'workflow.mappingErrors': [
    [
      {},
      'Fix the chapter mapping errors before converting.',
      'Corrija os erros do mapeamento dos capítulos antes de converter.',
    ],
  ],
  'workflow.mappingNotSaved': [
    [
      {},
      "Couldn't save mangabind.json in the source folder. Check that the folder is writable and that its mangabind.json is valid JSON.",
      'Não foi possível salvar o mangabind.json na pasta de origem. Verifique se a pasta permite gravação e se o mangabind.json dela é um JSON válido.',
    ],
  ],
  'workflow.detailsNotSaved': [
    [
      {},
      "Couldn't keep the author and language with the source folder. Check that the folder is writable and that its mangabind.json is valid.",
      'Não foi possível guardar o autor e o idioma com a pasta de origem. Verifique se a pasta permite gravação e se o mangabind.json dela é válido.',
    ],
  ],
  'workflow.confirmMapping': [
    [
      { before: 'converting' },
      'Confirm the chapter-to-volume mapping before converting.',
      'Confirme o mapeamento de capítulos para volumes antes de converter.',
    ],
    [
      { before: 'validating' },
      'Confirm the chapter-to-volume mapping before validating the plan.',
      'Confirme o mapeamento de capítulos para volumes antes de validar o plano.',
    ],
  ],
  'workflow.reviewSettings': [
    [
      { before: 'converting' },
      'Review the output settings before converting.',
      'Revise as configurações de saída antes de converter.',
    ],
    [
      { before: 'validating' },
      'Review the output settings before validating the plan.',
      'Revise as configurações de saída antes de validar o plano.',
    ],
  ],
  'workflow.singleBookNeedsBoth': [
    [
      {},
      'Single book mode requires both binding and converting.',
      'O modo de livro único exige as duas etapas, agrupar e converter.',
    ],
  ],
  'workflow.combineNeedsEpub': [
    [
      {},
      'Binding the whole series as one volume is only available for EPUB right now.',
      'Juntar a série inteira em um só volume só está disponível para EPUB por enquanto.',
    ],
  ],
  'workflow.noVolumes': [
    [
      {},
      'No volume files were produced. Review the chapter mapping and try again.',
      'Nenhum arquivo de volume foi gerado. Revise o mapeamento dos capítulos e tente de novo.',
    ],
  ],
  'workflow.publishFailed': [
    [
      {},
      "Couldn't write a finished book to Mangabound's pending storage. Check available space and storage permissions.",
      'Não foi possível gravar um livro pronto no armazenamento pendente do Mangabound. Verifique o espaço disponível e as permissões de armazenamento.',
    ],
  ],

  'save.bookGone': [
    [
      {},
      'This pending book is no longer available.',
      'Este livro pendente não está mais disponível.',
    ],
  ],
  'save.bookBeingDeleted': [
    [{}, 'This pending book is being deleted.', 'Este livro pendente está sendo apagado.'],
  ],
  'save.wrongExtension': [
    [
      { extension: '.epub' },
      'Choose a .epub file for this book.',
      'Escolha um arquivo .epub para este livro.',
    ],
  ],
  'save.nameUnavailable': [
    [
      {},
      'No available file name was found.',
      'Não foi encontrado nenhum nome de arquivo disponível.',
    ],
  ],
  'save.destinationFull': [
    [
      {},
      'The destination is full. Free some space and try again; the pending book is safe.',
      'O destino está cheio. Libere espaço e tente de novo; o livro pendente está seguro.',
    ],
  ],
  'save.cannotWrite': [
    [
      {},
      'Mangabound cannot write to that destination. Choose a writable folder or check its permissions.',
      'O Mangabound não consegue gravar nesse destino. Escolha uma pasta com permissão de gravação ou verifique as permissões dela.',
    ],
  ],
  'save.folderGone': [
    [
      {},
      'The chosen destination folder is no longer available. Choose another folder.',
      'A pasta de destino escolhida não está mais disponível. Escolha outra pasta.',
    ],
  ],
  'save.failed': [
    [
      {},
      'The book could not be saved. Its pending copy is still available; try another destination.',
      'Não foi possível salvar o livro. A cópia pendente continua disponível; tente outro destino.',
    ],
  ],
  'save.copiedCatalogFailed': [
    [
      {},
      'The book was copied, but its destination catalog could not be updated. Choose another folder or check its permissions, then retry; the pending copy is safe.',
      'O livro foi copiado, mas o catálogo do destino não pôde ser atualizado. Escolha outra pasta ou verifique as permissões dela e tente de novo; a cópia pendente está segura.',
    ],
  ],
  'save.copiedNotRecorded': [
    [
      {},
      'The book was copied, but Mangabound could not remember that it was saved. Its pending copy remains available to retry.',
      'O livro foi copiado, mas o Mangabound não conseguiu registrar que ele foi salvo. A cópia pendente continua disponível para tentar de novo.',
    ],
  ],

  'provider.catalogue': [
    [
      {},
      'Community catalogue of manga, with volume and chapter data',
      'Catálogo comunitário de mangás, com dados de volumes e capítulos',
    ],
  ],
  'provider.timeout': [
    [
      { service: 'MangaDex' },
      'MangaDex did not answer in time. Try again shortly.',
      'MangaDex não respondeu a tempo. Tente de novo em instantes.',
    ],
  ],
  'provider.unreachable': [
    [{ service: 'MangaDex' }, 'Could not reach MangaDex.', 'Não foi possível acessar MangaDex.'],
  ],
  'provider.rateLimited': [
    [
      { service: 'MangaDex' },
      'MangaDex is rate-limiting requests. Try again shortly.',
      'MangaDex está limitando os pedidos. Tente de novo em instantes.',
    ],
  ],
  'provider.unexpectedStatus': [
    [
      { service: 'MangaDex', status: 503 },
      'MangaDex returned an unexpected status (503).',
      'MangaDex devolveu um status inesperado (503).',
    ],
  ],
  'provider.malformedJson': [
    [
      { service: 'MangaDex' },
      'MangaDex returned malformed JSON.',
      'MangaDex devolveu um JSON malformado.',
    ],
  ],
  'provider.unexpectedSearch': [
    [
      { service: 'MangaDex' },
      'MangaDex returned an unexpected search response.',
      'MangaDex devolveu uma resposta de busca inesperada.',
    ],
  ],
  'provider.unexpectedVolumes': [
    [
      { service: 'MangaDex' },
      'MangaDex returned an unexpected volumes response.',
      'MangaDex devolveu uma resposta de volumes inesperada.',
    ],
  ],
  'provider.unexpectedReleases': [
    [
      { service: 'GitHub' },
      'GitHub returned an unexpected list of versions.',
      'GitHub devolveu uma lista de versões inesperada.',
    ],
  ],
};
