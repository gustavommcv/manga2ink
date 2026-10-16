import type { OptionsMessageValues } from '@/domain/messages/options';

import type { Rows } from './said-table';

/** Why a conversion option has no effect, and what is wrong with a typed value (ADR 0053). */
export const optionsRows: Rows<OptionsMessageValues> = {
  'options.lock.webtoon': [
    [{}, 'Not used for webtoon strips.', 'Não é usado em tiras de webtoon.'],
  ],
  'options.lock.strips': [
    [{}, 'Replaced by restacking strips.', 'Substituído pela reempilhagem das tiras.'],
  ],
  'options.lock.untouched': [
    [
      {},
      'Not used while the images are left as they are.',
      'Não é usado enquanto as imagens ficam como estão.',
    ],
  ],
  'options.lock.pngOnly': [[{}, 'Only for PNG pages.', 'Só para páginas em PNG.']],
  'options.lock.epubOnly': [[{}, 'Only an EPUB carries these.', 'Só um EPUB leva estas opções.']],
  'options.lock.bordersWebtoon': [
    [{}, 'Always white for webtoon strips.', 'Sempre brancas em tiras de webtoon.'],
  ],
  'options.lock.bothVersions': [
    [{}, 'Only when both versions are made.', 'Só quando as duas versões são feitas.'],
  ],
  'options.lock.wholeSpreadKept': [
    [{}, 'Only when the whole spread is kept.', 'Só quando a página dupla inteira é mantida.'],
  ],
  'options.lock.spreadUpright': [
    [
      {},
      'Nothing is rotated while the whole spread stays upright.',
      'Nada é girado enquanto a página dupla inteira fica em pé.',
    ],
  ],
  'options.lock.noJpeg': [[{}, 'Nothing is saved as JPEG.', 'Nada é salvo como JPEG.']],
  'options.lock.alreadyEightBit': [
    [
      {},
      'Already 8-bit while all 256 grays are kept.',
      'Já é de 8 bits enquanto os 256 cinzas são mantidos.',
    ],
  ],
  'options.lock.alwaysEightBitPdf': [[{}, 'Always 8-bit in a PDF.', 'Sempre de 8 bits em um PDF.']],
  'options.lock.colorKept': [
    [
      {},
      'Only when color pages are kept in color.',
      'Só quando as páginas coloridas são mantidas em cores.',
    ],
  ],
  'options.lock.pdfNoCover': [[{}, 'A PDF has no cover.', 'Um PDF não tem capa.']],
  'options.lock.cbzCoverCut': [
    [
      {},
      'A CBZ has a cover only when one is cut from a wide image.',
      'Um CBZ só tem capa quando ela é recortada de uma imagem larga.',
    ],
  ],
  'options.lock.koboEpub': [[{}, 'Only for a Kobo’s EPUB.', 'Só para o EPUB de um Kobo.']],
  'options.lock.customNamesEpub': [
    [
      {},
      'A custom size already names the book .epub.',
      'Um tamanho personalizado já nomeia o livro como .epub.',
    ],
  ],

  'options.issue.chooseDevice': [
    [{}, 'Choose a device profile.', 'Escolha um perfil de dispositivo.'],
  ],
  'options.issue.customSizeBoth': [
    [
      {},
      'The custom device profile needs both a width and height.',
      'O perfil de dispositivo personalizado precisa de largura e altura.',
    ],
  ],
  'options.issue.languageCode': [
    [{}, 'Enter an EPUB language code.', 'Informe um código de idioma para o EPUB.'],
  ],
  'options.issue.number': [
    [
      { option: 'gamma', minimum: 0.1, maximum: 4 },
      'Gamma must be a number from 0.1 to 4.',
      'Gama precisa ser um número de 0.1 a 4.',
    ],
    [
      { option: 'croppingPower', minimum: 0, maximum: 10 },
      'Cropping power must be a number from 0 to 10.',
      'Intensidade do corte precisa ser um número de 0 a 10.',
    ],
  ],
  'options.issue.percent': [
    [
      { option: 'croppingMinimum' },
      'Minimum retained area must be between 0 and 100.',
      'Área mínima mantida precisa estar entre 0 e 100.',
    ],
    [
      { option: 'preserveMargin' },
      'Preserved margin must be between 0 and 100.',
      'Margem preservada precisa estar entre 0 e 100.',
    ],
  ],
  'options.issue.whole': [
    [
      { option: 'jpegQuality', minimum: 1, maximum: 100 },
      'JPEG quality must be a whole number from 1 to 100.',
      'Qualidade do JPEG precisa ser um número inteiro de 1 a 100.',
    ],
    [
      { option: 'customWidth', minimum: 1, maximum: 20000 },
      'Custom width must be a whole number from 1 to 20000.',
      'Largura personalizada precisa ser um número inteiro de 1 a 20000.',
    ],
    [
      { option: 'customHeight', minimum: 1, maximum: 20000 },
      'Custom height must be a whole number from 1 to 20000.',
      'Altura personalizada precisa ser um número inteiro de 1 a 20000.',
    ],
  ],
};
