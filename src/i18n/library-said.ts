import type { Language } from '@/domain/app-settings';
import type { CoversMessageValues } from '@/domain/messages/covers';
import type { LibraryMessageValues } from '@/domain/messages/library';

import { countOf } from './count';
import { namesOf, type SaidFor } from './say';

/** What a library says of its links, and what is said of the covers, in every language (ADR 0053). */
export const libraryCoversSaid: Readonly<
  Record<Language, SaidFor<LibraryMessageValues & CoversMessageValues>>
> = {
  en: {
    'library.links.title': ({ count }) =>
      count === 1
        ? '1 folder in this library was not read'
        : `${String(count)} folders in this library were not read`,
    'library.links.advice': ({ count }) =>
      count === 1
        ? 'It is a link, and mangabind does not follow links to a series. Put the real folder in the library, or add it on its own:'
        : 'They are links, and mangabind does not follow links to a series. Put the real folders in the library, or add each on its own:',
    'library.links.names': ({ names }) => namesOf(names, (more) => ` and ${String(more)} more`),

    'covers.typesSentence': () => 'A cover has to be a JPEG, PNG, WebP, GIF or BMP image.',
    'covers.unreadableFile': () => 'That file could not be read as an image, so it was not used.',
    'covers.noImageFound': () => 'No image was found there.',
    'covers.kept': ({ count }) =>
      `${String(count)} ${countOf(count, 'book keeps', 'books keep')} the cover chosen for ${countOf(count, 'it', 'them')}.`,
    'covers.imagesUnreadable': ({ count, names, more }) =>
      `${String(count)} ${countOf(count, 'image', 'images')} could not be read (${names.join(', ')}${
        more > 0 ? ` and ${String(more)} more` : ''
      }), so ${countOf(count, 'the book it falls on keeps its first page', 'the books they fall on keep their first pages')}.`,
    'covers.unused': ({ count, books }) =>
      `${String(count)} ${countOf(count, 'image was', 'images were')} not used: there ${countOf(books, 'is', 'are')} ${String(books)} ${countOf(books, 'book', 'books')}.`,
    'covers.fewImages': ({ images, books }) =>
      `There ${countOf(images, 'was', 'were')} ${String(images)} ${countOf(images, 'image', 'images')} for ${String(books)} ${countOf(books, 'book', 'books')}; the other books are unchanged.`,
  },
  'pt-BR': {
    'library.links.title': ({ count }) =>
      count === 1
        ? '1 pasta desta biblioteca não foi lida'
        : `${String(count)} pastas desta biblioteca não foram lidas`,
    'library.links.advice': ({ count }) =>
      count === 1
        ? 'É um link, e o mangabind não segue links para uma série. Coloque a pasta de verdade na biblioteca, ou adicione-a sozinha:'
        : 'São links, e o mangabind não segue links para uma série. Coloque as pastas de verdade na biblioteca, ou adicione cada uma sozinha:',
    'library.links.names': ({ names }) => namesOf(names, (more) => ` e mais ${String(more)}`),

    'covers.typesSentence': () => 'Uma capa precisa ser uma imagem JPEG, PNG, WebP, GIF ou BMP.',
    'covers.unreadableFile': () =>
      'Não foi possível ler esse arquivo como imagem, então ele não foi usado.',
    'covers.noImageFound': () => 'Nenhuma imagem foi encontrada ali.',
    'covers.kept': ({ count }) =>
      `${String(count)} ${countOf(count, 'livro mantém', 'livros mantêm')} a capa escolhida para ${countOf(count, 'ele', 'eles')}.`,
    'covers.imagesUnreadable': ({ count, names, more }) =>
      `${String(count)} ${countOf(count, 'imagem não pôde ser lida', 'imagens não puderam ser lidas')} (${names.join(', ')}${
        more > 0 ? ` e mais ${String(more)}` : ''
      }), então ${countOf(count, 'o livro em que ela cai mantém a primeira página', 'os livros em que elas caem mantêm as primeiras páginas')}.`,
    'covers.unused': ({ count, books }) =>
      `${String(count)} ${countOf(count, 'imagem não foi usada', 'imagens não foram usadas')}: há ${String(books)} ${countOf(books, 'livro', 'livros')}.`,
    'covers.fewImages': ({ images, books }) =>
      `Havia ${String(images)} ${countOf(images, 'imagem', 'imagens')} para ${String(books)} ${countOf(books, 'livro', 'livros')}; os outros livros não mudam.`,
  },
  ja: {
    'library.links.title': ({ count }) =>
      `このライブラリの ${String(count)} 個のフォルダーが読み込まれませんでした`,
    'library.links.advice': () =>
      'これらはリンクで、mangabind はシリーズへのリンクをたどりません。実際のフォルダーをライブラリに置くか、それぞれを個別に追加してください:',
    'library.links.names': ({ names }) =>
      namesOf(names, (more) => ` ほか ${String(more)} 個`, '、'),

    'covers.typesSentence': () => '表紙にできるのは、JPEG、PNG、WebP、GIF、BMP の画像です。',
    'covers.unreadableFile': () =>
      'そのファイルを画像として読み込めなかったため、使われませんでした。',
    'covers.noImageFound': () => 'そこには画像が見つかりませんでした。',
    'covers.kept': ({ count }) => `${String(count)} 冊の本は、選んだ表紙をそのまま使います。`,
    'covers.imagesUnreadable': ({ count, names, more }) =>
      `${String(count)} 個の画像を読み込めませんでした（${names.join('、')}${
        more > 0 ? ` ほか ${String(more)} 個` : ''
      }）。その画像が当たる本は、最初のページを表紙のままにします。`,
    'covers.unused': ({ count, books }) =>
      `${String(count)} 個の画像は使われませんでした。本は ${String(books)} 冊です。`,
    'covers.fewImages': ({ images, books }) =>
      `本 ${String(books)} 冊に対して画像は ${String(images)} 個でした。ほかの本は変わりません。`,
  },
};
