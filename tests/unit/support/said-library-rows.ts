import type { CoversMessageValues } from '@/domain/messages/covers';
import type { LibraryMessageValues } from '@/domain/messages/library';

import type { Rows } from './said-table';

/** What a library says of its links, and what is said of the covers a person gives (ADR 0053). */
export const libraryRows: Rows<LibraryMessageValues & CoversMessageValues> = {
  'library.links.title': [
    [
      { count: 1 },
      '1 folder in this library was not read',
      '1 pasta desta biblioteca não foi lida',
    ],
    [
      { count: 3 },
      '3 folders in this library were not read',
      '3 pastas desta biblioteca não foram lidas',
    ],
  ],
  'library.links.advice': [
    [
      { count: 1 },
      'It is a link, and mangabind does not follow links to a series. Put the real folder in the library, or add it on its own:',
      'É um link, e o mangabind não segue links para uma série. Coloque a pasta de verdade na biblioteca, ou adicione-a sozinha:',
    ],
    [
      { count: 2 },
      'They are links, and mangabind does not follow links to a series. Put the real folders in the library, or add each on its own:',
      'São links, e o mangabind não segue links para uma série. Coloque as pastas de verdade na biblioteca, ou adicione cada uma sozinha:',
    ],
  ],
  'library.links.names': [
    [{ names: ['Berserk'] }, 'Berserk', 'Berserk'],
    [{ names: ['A', 'B', 'C'] }, 'A, B, C', 'A, B, C'],
    [{ names: ['A', 'B', 'C', 'D', 'E'] }, 'A, B, C and 2 more', 'A, B, C e mais 2'],
  ],

  'covers.typesSentence': [
    [
      {},
      'A cover has to be a JPEG, PNG, WebP, GIF or BMP image.',
      'Uma capa precisa ser uma imagem JPEG, PNG, WebP, GIF ou BMP.',
    ],
  ],
  'covers.unreadableFile': [
    [
      {},
      'That file could not be read as an image, so it was not used.',
      'Não foi possível ler esse arquivo como imagem, então ele não foi usado.',
    ],
  ],
  'covers.noImageFound': [[{}, 'No image was found there.', 'Nenhuma imagem foi encontrada ali.']],
  'covers.kept': [
    [
      { count: 1 },
      '1 book keeps the cover chosen for it.',
      '1 livro mantém a capa escolhida para ele.',
    ],
    [
      { count: 2 },
      '2 books keep the cover chosen for them.',
      '2 livros mantêm a capa escolhida para eles.',
    ],
  ],
  'covers.imagesUnreadable': [
    [
      { count: 1, names: ['02.jpg'], more: 0 },
      '1 image could not be read (02.jpg), so the book it falls on keeps its first page.',
      '1 imagem não pôde ser lida (02.jpg), então o livro em que ela cai mantém a primeira página.',
    ],
    [
      { count: 5, names: ['a.jpg', 'b.jpg', 'c.jpg'], more: 2 },
      '5 images could not be read (a.jpg, b.jpg, c.jpg and 2 more), so the books they fall on keep their first pages.',
      '5 imagens não puderam ser lidas (a.jpg, b.jpg, c.jpg e mais 2), então os livros em que elas caem mantêm as primeiras páginas.',
    ],
  ],
  'covers.unused': [
    [
      { count: 1, books: 1 },
      '1 image was not used: there is 1 book.',
      '1 imagem não foi usada: há 1 livro.',
    ],
    [
      { count: 2, books: 3 },
      '2 images were not used: there are 3 books.',
      '2 imagens não foram usadas: há 3 livros.',
    ],
  ],
  'covers.fewImages': [
    [
      { images: 1, books: 3 },
      'There was 1 image for 3 books; the other books are unchanged.',
      'Havia 1 imagem para 3 livros; os outros livros não mudam.',
    ],
    [
      { images: 3, books: 5 },
      'There were 3 images for 5 books; the other books are unchanged.',
      'Havia 3 imagens para 5 livros; os outros livros não mudam.',
    ],
  ],
};
