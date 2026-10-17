import type { Language } from '@/domain/app-settings';
import type { KnownWarningCode, WarningMessageValues } from '@/domain/messages/warnings';

import type { SaidFor } from './say';

/** A heading and the advice that goes with it, for each warning the app has words for. */
interface WarningWords {
  readonly title: string;
  readonly advice: string;
}

type WarningWordsFor = Readonly<Record<KnownWarningCode, WarningWords>>;

/**
 * The heading and the advice of each warning, in every language. It is shaped as the catalogs are, an
 * entry for each language at the top, so that the check of the guides finds what each language says.
 */
const warningWords: Readonly<Record<Language, WarningWordsFor>> = {
  en: {
    images_smaller_than_device: {
      title: 'Pages smaller than the screen',
      advice:
        'More than a quarter of the pages are smaller than the screen and nothing enlarges them. Choose “Fit, enlarging small pages” under Page size to make them easier to read.',
    },
    source_already_converted: {
      title: 'Pages already converted once',
      advice:
        'These pages look like Kindle Comic Converter already converted them; converting again lowers their quality. Use the original files if you have them.',
    },
    skipped_non_images: {
      title: 'Files that are not images were left out',
      advice: 'The input holds files that are not page images. They are not in the book.',
    },
    spread_labels_ignored: {
      title: 'A .json file beside the book was not used',
      advice: 'It is not a list of spread labels, so the book was made without it.',
    },
    spread_labels_skipped: {
      title: 'Some labelled spreads were not joined',
      advice: 'A labelled position had no page to be joined with. The other spreads were joined.',
    },
    output_collision: {
      title: 'Saved under another name',
      advice: 'The book would have replaced its own source, so it was given another name.',
    },
    page_truncated: {
      title: 'Pages that end early have a blank part',
      advice:
        'A page’s file ends before its image does, which is usually a download that stopped. The book keeps what could be read, and the rest of that page is blank. Download the chapter again to get the whole page.',
    },
    chapter_conflict: {
      title: 'Chapters with more than one copy were left out',
      advice:
        'A chapter that is in the folder more than once cannot be told from its copy, so none of its copies is in the book. Remove all but one copy from the folder and convert again.',
    },
    chapter_gap: {
      title: 'Chapters are missing inside a volume',
      advice:
        'Some chapter numbers are missing between the first and the last chapter of a volume. If they are not in the folder, the book goes without them.',
    },
    empty_chapter: {
      title: 'Chapters with no pages were left out',
      advice: 'A chapter in the input holds no pages, so it is not in the book.',
    },
    link_skipped: {
      title: 'Links that lead outside the folder were left out',
      advice:
        'A file in the folder is a link that does not lead to a file inside it (it leads outside the folder, to a folder, or to nothing), so it was not copied into the book: a folder that came from someone else could otherwise put a file of yours into it. If the page is meant to be there, put a copy of the file in the folder and convert again.',
    },
    unsupported_page_files: {
      title: 'Files in a chapter that are not page images were left out',
      advice:
        'A chapter holds files whose names do not say they are images (JPEG, PNG, WebP, GIF, BMP, AVIF, JPEG XL or TIFF), so they are not pages of the book. If one of them is a page, give it the extension of its format and convert again.',
    },
    page_entries_too_large: {
      title: 'Pages that expand to too much were left out',
      advice:
        'A page in a .cbz chapter says it expands to far more than a page can be (over 256 MiB, or over a thousand times its size in the archive), which is how a file made to fill the memory of a computer looks, so it is not in the book. If it is a real page, save it again as an ordinary image and convert again.',
    },
  },
  'pt-BR': {
    images_smaller_than_device: {
      title: 'Páginas menores que a tela',
      advice:
        'Mais de um quarto das páginas é menor que a tela e nada as amplia. Escolha “Ajustar, ampliando páginas pequenas” em Tamanho da página para facilitar a leitura.',
    },
    source_already_converted: {
      title: 'Páginas já convertidas uma vez',
      advice:
        'Estas páginas parecem já ter sido convertidas pelo Kindle Comic Converter; converter de novo reduz a qualidade delas. Use os arquivos originais, se os tiver.',
    },
    skipped_non_images: {
      title: 'Arquivos que não são imagens ficaram de fora',
      advice: 'A entrada tem arquivos que não são imagens de página. Eles não estão no livro.',
    },
    spread_labels_ignored: {
      title: 'Um arquivo .json ao lado do livro não foi usado',
      advice: 'Ele não é uma lista de rótulos de páginas duplas, então o livro foi feito sem ele.',
    },
    spread_labels_skipped: {
      title: 'Algumas páginas duplas marcadas não foram unidas',
      advice:
        'Uma posição marcada não tinha página para ser unida. As outras páginas duplas foram unidas.',
    },
    output_collision: {
      title: 'Salvo com outro nome',
      advice: 'O livro substituiria o próprio arquivo de origem, então recebeu outro nome.',
    },
    page_truncated: {
      title: 'Páginas que terminam antes do fim têm uma parte em branco',
      advice:
        'O arquivo de uma página termina antes da imagem, o que costuma ser um download interrompido. O livro mantém o que foi possível ler, e o resto dessa página fica em branco. Baixe o capítulo de novo para obter a página inteira.',
    },
    chapter_conflict: {
      title: 'Capítulos com mais de uma cópia ficaram de fora',
      advice:
        'Um capítulo que aparece mais de uma vez na pasta não pode ser distinguido da sua cópia, então nenhuma das cópias está no livro. Deixe só uma cópia na pasta e converta de novo.',
    },
    chapter_gap: {
      title: 'Faltam capítulos dentro de um volume',
      advice:
        'Faltam alguns números de capítulo entre o primeiro e o último capítulo de um volume. Se eles não estiverem na pasta, o livro fica sem eles.',
    },
    empty_chapter: {
      title: 'Capítulos sem páginas ficaram de fora',
      advice: 'Um capítulo da entrada não tem páginas, então não está no livro.',
    },
    link_skipped: {
      title: 'Links que levam para fora da pasta ficaram de fora',
      advice:
        'Um arquivo da pasta é um link que não leva a um arquivo dentro dela (leva para fora da pasta, para uma pasta ou para nada), então não foi copiado para o livro: uma pasta vinda de outra pessoa poderia, de outro modo, colocar um arquivo seu nele. Se a página deveria estar lá, coloque uma cópia do arquivo na pasta e converta de novo.',
    },
    unsupported_page_files: {
      title: 'Arquivos de um capítulo que não são imagens de página ficaram de fora',
      advice:
        'Um capítulo tem arquivos cujos nomes não indicam que são imagens (JPEG, PNG, WebP, GIF, BMP, AVIF, JPEG XL ou TIFF), então não são páginas do livro. Se algum deles for uma página, dê a ele a extensão do seu formato e converta de novo.',
    },
    page_entries_too_large: {
      title: 'Páginas que se expandem demais ficaram de fora',
      advice:
        'Uma página de um capítulo .cbz diz que se expande para muito mais do que uma página pode ser (mais de 256 MiB, ou mais de mil vezes o seu tamanho no arquivo), que é a aparência de um arquivo feito para encher a memória de um computador, então não está no livro. Se for uma página de verdade, salve-a de novo como uma imagem comum e converta de novo.',
    },
  },
};

/** What the results say of the warnings the tools gave the books, in every language (ADR 0053). */
export const warningSaid: Readonly<Record<Language, SaidFor<WarningMessageValues>>> = {
  en: {
    'warning.title': ({ code }) => warningWords.en[code].title,
    'warning.advice': ({ code }) => warningWords.en[code].advice,
    'warning.unknownTitle': () => 'A note from mangapress',
    'warning.inAll': ({ count }) => `In all ${String(count)} books.`,
    'warning.inOne': ({ first }) => `In ${first}.`,
    'warning.inTwo': ({ first, second }) => `In ${first} and ${second}.`,
    'warning.inMore': ({ first, second, more }) =>
      `In ${first}, ${second} and ${String(more)} more.`,
  },
  'pt-BR': {
    'warning.title': ({ code }) => warningWords['pt-BR'][code].title,
    'warning.advice': ({ code }) => warningWords['pt-BR'][code].advice,
    'warning.unknownTitle': () => 'Uma observação do mangapress',
    'warning.inAll': ({ count }) => `Em todos os ${String(count)} livros.`,
    'warning.inOne': ({ first }) => `Em ${first}.`,
    'warning.inTwo': ({ first, second }) => `Em ${first} e ${second}.`,
    'warning.inMore': ({ first, second, more }) => `Em ${first}, ${second} e mais ${String(more)}.`,
  },
};
