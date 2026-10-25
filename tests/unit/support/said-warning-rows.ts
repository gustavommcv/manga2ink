import type { WarningMessageValues } from '@/domain/messages/warnings';

import type { Rows } from './said-table';

/** What the results say of the warnings the tools gave the books (ADR 0053). */
export const warningRows: Rows<WarningMessageValues> = {
  'warning.title': [
    [
      { code: 'images_smaller_than_device' },
      'Pages smaller than the screen',
      'Páginas menores que a tela',
    ],
    [
      { code: 'source_already_converted' },
      'Pages already converted once',
      'Páginas já convertidas uma vez',
    ],
    [
      { code: 'skipped_non_images' },
      'Files that are not images were left out',
      'Arquivos que não são imagens ficaram de fora',
    ],
    [
      { code: 'spread_labels_ignored' },
      'A .json file beside the book was not used',
      'Um arquivo .json ao lado do livro não foi usado',
    ],
    [
      { code: 'spread_labels_skipped' },
      'Some labelled spreads were not joined',
      'Algumas páginas duplas marcadas não foram unidas',
    ],
    [{ code: 'output_collision' }, 'Saved under another name', 'Salvo com outro nome'],
    [
      { code: 'page_truncated' },
      'Pages that end early have a blank part',
      'Páginas que terminam antes do fim têm uma parte em branco',
    ],
    [
      { code: 'chapter_conflict' },
      'Chapters with more than one copy were left out',
      'Capítulos com mais de uma cópia ficaram de fora',
    ],
    [
      { code: 'chapter_gap' },
      'Chapters are missing inside a volume',
      'Faltam capítulos dentro de um volume',
    ],
    [
      { code: 'empty_chapter' },
      'Chapters with no pages were left out',
      'Capítulos sem páginas ficaram de fora',
    ],
    [
      { code: 'link_skipped' },
      'Links that lead outside the folder were left out',
      'Links que levam para fora da pasta ficaram de fora',
    ],
    [
      { code: 'unsupported_page_files' },
      'Files in a chapter that are not page images were left out',
      'Arquivos de um capítulo que não são imagens de página ficaram de fora',
    ],
    [
      { code: 'page_entries_too_large' },
      'Pages that expand to too much were left out',
      'Páginas que se expandem demais ficaram de fora',
    ],
    [
      { code: 'mapping_not_kept' },
      'The volumes you edited were not kept with the folder',
      'Os volumes que você editou não foram guardados com a pasta',
    ],
  ],
  'warning.advice': [
    [
      { code: 'images_smaller_than_device' },
      'More than a quarter of the pages are smaller than the screen and nothing enlarges them. Choose “Fit, enlarging small pages” under Page size to make them easier to read.',
      'Mais de um quarto das páginas é menor que a tela e nada as amplia. Escolha “Ajustar, ampliando páginas pequenas” em Tamanho da página para facilitar a leitura.',
    ],
    [
      { code: 'source_already_converted' },
      'These pages look like Kindle Comic Converter already converted them; converting again lowers their quality. Use the original files if you have them.',
      'Estas páginas parecem já ter sido convertidas pelo Kindle Comic Converter; converter de novo reduz a qualidade delas. Use os arquivos originais, se os tiver.',
    ],
    [
      { code: 'skipped_non_images' },
      'The input holds files that are not page images. They are not in the book.',
      'A entrada tem arquivos que não são imagens de página. Eles não estão no livro.',
    ],
    [
      { code: 'spread_labels_ignored' },
      'It is not a list of spread labels, so the book was made without it.',
      'Ele não é uma lista de rótulos de páginas duplas, então o livro foi feito sem ele.',
    ],
    [
      { code: 'spread_labels_skipped' },
      'A labelled position had no page to be joined with. The other spreads were joined.',
      'Uma posição marcada não tinha página para ser unida. As outras páginas duplas foram unidas.',
    ],
    [
      { code: 'output_collision' },
      'The book would have replaced its own source, so it was given another name.',
      'O livro substituiria o próprio arquivo de origem, então recebeu outro nome.',
    ],
    [
      { code: 'page_truncated' },
      'A page’s file ends before its image does, which is usually a download that stopped. The book keeps what could be read, and the rest of that page is blank. Download the chapter again to get the whole page.',
      'O arquivo de uma página termina antes da imagem, o que costuma ser um download interrompido. O livro mantém o que foi possível ler, e o resto dessa página fica em branco. Baixe o capítulo de novo para obter a página inteira.',
    ],
    [
      { code: 'chapter_conflict' },
      'A chapter that is in the folder more than once cannot be told from its copy, so none of its copies is in the book. Add the folder on its own and open “Edit books and volumes” to say which copy to use, or remove all but one copy from the folder, and convert again.',
      'Um capítulo que aparece mais de uma vez na pasta não pode ser distinguido da sua cópia, então nenhuma das cópias está no livro. Adicione a pasta sozinha e abra “Editar livros e volumes” para dizer qual cópia usar, ou deixe só uma cópia na pasta, e converta de novo.',
    ],
    [
      { code: 'chapter_gap' },
      'Some chapter numbers are missing between the first and the last chapter of a volume. If they are not in the folder, the book goes without them.',
      'Faltam alguns números de capítulo entre o primeiro e o último capítulo de um volume. Se eles não estiverem na pasta, o livro fica sem eles.',
    ],
    [
      { code: 'empty_chapter' },
      'A chapter in the input holds no pages, so it is not in the book.',
      'Um capítulo da entrada não tem páginas, então não está no livro.',
    ],
    [
      { code: 'link_skipped' },
      'A file in the folder is a link that does not lead to a file inside it (it leads outside the folder, to a folder, or to nothing), so it was not copied into the book: a folder that came from someone else could otherwise put a file of yours into it. If the page is meant to be there, put a copy of the file in the folder and convert again.',
      'Um arquivo da pasta é um link que não leva a um arquivo dentro dela (leva para fora da pasta, para uma pasta ou para nada), então não foi copiado para o livro: uma pasta vinda de outra pessoa poderia, de outro modo, colocar um arquivo seu nele. Se a página deveria estar lá, coloque uma cópia do arquivo na pasta e converta de novo.',
    ],
    [
      { code: 'unsupported_page_files' },
      'A chapter holds files whose names do not say they are images (JPEG, PNG, WebP, GIF, BMP, AVIF, JPEG XL or TIFF), so they are not pages of the book. If one of them is a page, give it the extension of its format and convert again.',
      'Um capítulo tem arquivos cujos nomes não indicam que são imagens (JPEG, PNG, WebP, GIF, BMP, AVIF, JPEG XL ou TIFF), então não são páginas do livro. Se algum deles for uma página, dê a ele a extensão do seu formato e converta de novo.',
    ],
    [
      { code: 'page_entries_too_large' },
      'A page in a .cbz chapter says it expands to far more than a page can be (over 256 MiB, or over a thousand times its size in the archive), which is how a file made to fill the memory of a computer looks, so it is not in the book. If it is a real page, save it again as an ordinary image and convert again.',
      'Uma página de um capítulo .cbz diz que se expande para muito mais do que uma página pode ser (mais de 256 MiB, ou mais de mil vezes o seu tamanho no arquivo), que é a aparência de um arquivo feito para encher a memória de um computador, então não está no livro. Se for uma página de verdade, salve-a de novo como uma imagem comum e converta de novo.',
    ],
    [
      { code: 'mapping_not_kept' },
      'The books follow your volumes, but they could not be saved in the folder’s mangabind.json: the folder cannot be written, or its mangabind.json is not valid JSON. The next time you add the folder, you will have to edit its volumes again.',
      'Os livros seguem os seus volumes, mas eles não puderam ser salvos no mangabind.json da pasta: a pasta não permite gravação, ou o mangabind.json dela não é um JSON válido. Da próxima vez que adicionar a pasta, você vai precisar editar os volumes de novo.',
    ],
  ],
  'warning.unknownTitle': [[{}, 'A note from mangaprep', 'Uma observação do mangaprep']],
  'warning.inAll': [[{ count: 3 }, 'In all 3 books.', 'Em todos os 3 livros.']],
  'warning.inOne': [[{ first: 'One.epub' }, 'In One.epub.', 'Em One.epub.']],
  'warning.inTwo': [
    [
      { first: 'One.epub', second: 'Two.epub' },
      'In One.epub and Two.epub.',
      'Em One.epub e Two.epub.',
    ],
  ],
  'warning.inMore': [
    [
      { first: 'One.epub', second: 'Two.epub', more: 3 },
      'In One.epub, Two.epub and 3 more.',
      'Em One.epub, Two.epub e mais 3.',
    ],
  ],
};
