import type { Language } from '@/domain/app-settings';
import type { OptionsMessageValues } from '@/domain/messages/options';

import { optionFieldsMessages } from './option-fields-messages';
import type { SaidFor } from './say';

/** Why a conversion option has no effect, and what is wrong with a typed value, in every language (ADR 0053). */
export const optionsSaid: Readonly<Record<Language, SaidFor<OptionsMessageValues>>> = {
  en: {
    'options.lock.webtoon': () => 'Not used for webtoon strips.',
    'options.lock.strips': () => 'Replaced by restacking strips.',
    'options.lock.untouched': () => 'Not used while the images are left as they are.',
    'options.lock.pngOnly': () => 'Only for PNG pages.',
    'options.lock.epubOnly': () => 'Only an EPUB carries these.',
    'options.lock.bordersWebtoon': () => 'Always white for webtoon strips.',
    'options.lock.bothVersions': () => 'Only when both versions are made.',
    'options.lock.wholeSpreadKept': () => 'Only when the whole spread is kept.',
    'options.lock.spreadUpright': () => 'Nothing is rotated while the whole spread stays upright.',
    'options.lock.noJpeg': () => 'Nothing is saved as JPEG.',
    'options.lock.alreadyEightBit': () => 'Already 8-bit while all 256 grays are kept.',
    'options.lock.alwaysEightBitPdf': () => 'Always 8-bit in a PDF.',
    'options.lock.colorKept': () => 'Only when color pages are kept in color.',
    'options.lock.pdfNoCover': () => 'A PDF has no cover.',
    'options.lock.cbzCoverCut': () => 'A CBZ has a cover only when one is cut from a wide image.',
    'options.lock.koboEpub': () => 'Only for a Kobo’s EPUB.',
    'options.lock.customNamesEpub': () => 'A custom size already names the book .epub.',

    'options.issue.chooseDevice': () => 'Choose a device profile.',
    'options.issue.customSizeBoth': () =>
      'The custom device profile needs both a width and height.',
    'options.issue.languageCode': () => 'Enter an EPUB language code.',
    'options.issue.number': ({ option, minimum, maximum }) =>
      `${optionFieldsMessages.en.checked[option]} must be a number from ${String(minimum)} to ${String(maximum)}.`,
    'options.issue.percent': ({ option }) =>
      `${optionFieldsMessages.en.checked[option]} must be between 0 and 100.`,
    'options.issue.whole': ({ option, minimum, maximum }) =>
      `${optionFieldsMessages.en.checked[option]} must be a whole number from ${String(minimum)} to ${String(maximum)}.`,
  },
  'pt-BR': {
    'options.lock.webtoon': () => 'Não é usado em tiras de webtoon.',
    'options.lock.strips': () => 'Substituído pela reempilhagem das tiras.',
    'options.lock.untouched': () => 'Não é usado enquanto as imagens ficam como estão.',
    'options.lock.pngOnly': () => 'Só para páginas em PNG.',
    'options.lock.epubOnly': () => 'Só um EPUB leva estas opções.',
    'options.lock.bordersWebtoon': () => 'Sempre brancas em tiras de webtoon.',
    'options.lock.bothVersions': () => 'Só quando as duas versões são feitas.',
    'options.lock.wholeSpreadKept': () => 'Só quando a página dupla inteira é mantida.',
    'options.lock.spreadUpright': () => 'Nada é girado enquanto a página dupla inteira fica em pé.',
    'options.lock.noJpeg': () => 'Nada é salvo como JPEG.',
    'options.lock.alreadyEightBit': () => 'Já é de 8 bits enquanto os 256 cinzas são mantidos.',
    'options.lock.alwaysEightBitPdf': () => 'Sempre de 8 bits em um PDF.',
    'options.lock.colorKept': () => 'Só quando as páginas coloridas são mantidas em cores.',
    'options.lock.pdfNoCover': () => 'Um PDF não tem capa.',
    'options.lock.cbzCoverCut': () =>
      'Um CBZ só tem capa quando ela é recortada de uma imagem larga.',
    'options.lock.koboEpub': () => 'Só para o EPUB de um Kobo.',
    'options.lock.customNamesEpub': () => 'Um tamanho personalizado já nomeia o livro como .epub.',

    'options.issue.chooseDevice': () => 'Escolha um perfil de dispositivo.',
    'options.issue.customSizeBoth': () =>
      'O perfil de dispositivo personalizado precisa de largura e altura.',
    'options.issue.languageCode': () => 'Informe um código de idioma para o EPUB.',
    'options.issue.number': ({ option, minimum, maximum }) =>
      `${optionFieldsMessages['pt-BR'].checked[option]} precisa ser um número de ${String(minimum)} a ${String(maximum)}.`,
    'options.issue.percent': ({ option }) =>
      `${optionFieldsMessages['pt-BR'].checked[option]} precisa estar entre 0 e 100.`,
    'options.issue.whole': ({ option, minimum, maximum }) =>
      `${optionFieldsMessages['pt-BR'].checked[option]} precisa ser um número inteiro de ${String(minimum)} a ${String(maximum)}.`,
  },
};
