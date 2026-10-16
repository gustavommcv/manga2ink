import type { Language } from '@/domain/app-settings';
import type { SaveMessageValues } from '@/domain/messages/save';

import type { SaidFor } from './say';

/** Why a pending book could not be saved where it was asked to, in every language (ADR 0053). */
export const saveSaid: Readonly<Record<Language, SaidFor<SaveMessageValues>>> = {
  en: {
    'save.bookGone': () => 'This pending book is no longer available.',
    'save.bookBeingDeleted': () => 'This pending book is being deleted.',
    'save.wrongExtension': ({ extension }) => `Choose a ${extension} file for this book.`,
    'save.nameUnavailable': () => 'No available file name was found.',
    'save.destinationFull': () =>
      'The destination is full. Free some space and try again; the pending book is safe.',
    'save.cannotWrite': () =>
      'Mangabound cannot write to that destination. Choose a writable folder or check its permissions.',
    'save.folderGone': () =>
      'The chosen destination folder is no longer available. Choose another folder.',
    'save.failed': () =>
      'The book could not be saved. Its pending copy is still available; try another destination.',
    'save.copiedCatalogFailed': () =>
      'The book was copied, but its destination catalog could not be updated. Choose another folder or check its permissions, then retry; the pending copy is safe.',
    'save.copiedNotRecorded': () =>
      'The book was copied, but Mangabound could not remember that it was saved. Its pending copy remains available to retry.',
  },
  'pt-BR': {
    'save.bookGone': () => 'Este livro pendente não está mais disponível.',
    'save.bookBeingDeleted': () => 'Este livro pendente está sendo apagado.',
    'save.wrongExtension': ({ extension }) => `Escolha um arquivo ${extension} para este livro.`,
    'save.nameUnavailable': () => 'Não foi encontrado nenhum nome de arquivo disponível.',
    'save.destinationFull': () =>
      'O destino está cheio. Libere espaço e tente de novo; o livro pendente está seguro.',
    'save.cannotWrite': () =>
      'O Mangabound não consegue gravar nesse destino. Escolha uma pasta com permissão de gravação ou verifique as permissões dela.',
    'save.folderGone': () =>
      'A pasta de destino escolhida não está mais disponível. Escolha outra pasta.',
    'save.failed': () =>
      'Não foi possível salvar o livro. A cópia pendente continua disponível; tente outro destino.',
    'save.copiedCatalogFailed': () =>
      'O livro foi copiado, mas o catálogo do destino não pôde ser atualizado. Escolha outra pasta ou verifique as permissões dela e tente de novo; a cópia pendente está segura.',
    'save.copiedNotRecorded': () =>
      'O livro foi copiado, mas o Mangabound não conseguiu registrar que ele foi salvo. A cópia pendente continua disponível para tentar de novo.',
  },
};
