import type { Language } from '@/domain/app-settings';
import type { RunStep, WorkflowMessageValues } from '@/domain/messages/workflow';

import type { SaidFor } from './say';

const beforeEnglish: Readonly<Record<RunStep, string>> = {
  converting: 'converting',
  validating: 'validating the plan',
};
const beforePortuguese: Readonly<Record<RunStep, string>> = {
  converting: 'converter',
  validating: 'validar o plano',
};

/** Why the conversion workflow refused a request, in every language (ADR 0053). */
export const workflowSaid: Readonly<Record<Language, SaidFor<WorkflowMessageValues>>> = {
  en: {
    'workflow.inputGone': () => 'This input is no longer available. Choose it again.',
    'workflow.titleGone': () => 'That title is no longer in the library. Choose the library again.',
    'workflow.notALibrary': () => 'This input is not a library.',
    'workflow.libraryNeedsTitle': () => 'A library is made of titles; choose one of them.',
    'workflow.libraryByTitle': () => 'A library is converted title by title, not as one input.',
    'workflow.detailsNeedFolder': () =>
      'The author and language are kept with a folder, and this input is not one.',
    'workflow.mappingInvalid': () => 'The chapter mapping contains unknown or invalid assignments.',
    'workflow.mappingErrors': () => 'Fix the chapter mapping errors before converting.',
    'workflow.mappingNotSaved': () =>
      "Couldn't save mangabind.json in the source folder. Check that the folder is writable and that its mangabind.json is valid JSON.",
    'workflow.detailsNotSaved': () =>
      "Couldn't keep the author and language with the source folder. Check that the folder is writable and that its mangabind.json is valid.",
    'workflow.confirmMapping': ({ before }) =>
      `Confirm the chapter-to-volume mapping before ${beforeEnglish[before]}.`,
    'workflow.reviewSettings': ({ before }) =>
      `Review the output settings before ${beforeEnglish[before]}.`,
    'workflow.singleBookNeedsBoth': () => 'Single book mode requires both binding and converting.',
    'workflow.combineNeedsEpub': () =>
      'Binding the whole series as one volume is only available for EPUB right now.',
    'workflow.noVolumes': () =>
      'No volume files were produced. Review the chapter mapping and try again.',
    'workflow.publishFailed': () =>
      "Couldn't write a finished book to Mangabound's pending storage. Check available space and storage permissions.",
  },
  'pt-BR': {
    'workflow.inputGone': () => 'Este item não está mais disponível. Escolha-o de novo.',
    'workflow.titleGone': () =>
      'Esse título não está mais na biblioteca. Escolha a biblioteca de novo.',
    'workflow.notALibrary': () => 'Este item não é uma biblioteca.',
    'workflow.libraryNeedsTitle': () => 'Uma biblioteca é feita de títulos; escolha um deles.',
    'workflow.libraryByTitle': () =>
      'Uma biblioteca é convertida título por título, e não como um item só.',
    'workflow.detailsNeedFolder': () =>
      'O autor e o idioma ficam guardados com uma pasta, e este item não é uma.',
    'workflow.mappingInvalid': () =>
      'O mapeamento dos capítulos tem atribuições desconhecidas ou inválidas.',
    'workflow.mappingErrors': () =>
      'Corrija os erros do mapeamento dos capítulos antes de converter.',
    'workflow.mappingNotSaved': () =>
      'Não foi possível salvar o mangabind.json na pasta de origem. Verifique se a pasta permite gravação e se o mangabind.json dela é um JSON válido.',
    'workflow.detailsNotSaved': () =>
      'Não foi possível guardar o autor e o idioma com a pasta de origem. Verifique se a pasta permite gravação e se o mangabind.json dela é válido.',
    'workflow.confirmMapping': ({ before }) =>
      `Confirme o mapeamento de capítulos para volumes antes de ${beforePortuguese[before]}.`,
    'workflow.reviewSettings': ({ before }) =>
      `Revise as configurações de saída antes de ${beforePortuguese[before]}.`,
    'workflow.singleBookNeedsBoth': () =>
      'O modo de livro único exige as duas etapas, agrupar e converter.',
    'workflow.combineNeedsEpub': () =>
      'Juntar a série inteira em um só volume só está disponível para EPUB por enquanto.',
    'workflow.noVolumes': () =>
      'Nenhum arquivo de volume foi gerado. Revise o mapeamento dos capítulos e tente de novo.',
    'workflow.publishFailed': () =>
      'Não foi possível gravar um livro pronto no armazenamento pendente do Mangabound. Verifique o espaço disponível e as permissões de armazenamento.',
  },
};
