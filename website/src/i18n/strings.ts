// The words the components of the site write themselves, in each language of the site: the words of a
// caption, a table head, a download button. The words of the pages are in the pages. A language is
// added by writing its catalog here and its entry in `languages` (site.config.mjs); a page of a language
// without a catalog stops the build, so a language cannot be half added.

export interface Strings {
  /** The language the numbers are written in, for `Intl`. */
  numberLocale: string;
  brandLogo: { openFullSize: string };
  tutorialImage: { openFullSize: string };
  releaseDownloads: {
    latest: string;
    prerelease: string;
    notes: string;
    /** The text of each download button, by the key of the file in the release. */
    buttons: Record<
      'windowsInstaller' | 'windowsPortable' | 'macOS' | 'debian' | 'fedora' | 'arch',
      string
    >;
  };
  optionCredit: {
    art: string;
    by: string;
    converted: (mangapress: string) => string;
  };
  optionExample: {
    openLarger: string;
    notConverted: string;
    noFlag: string;
    /** `3 pages` or `1 page`, as the caption of a picture of several pages starts. */
    pageCount: (count: number) => string;
    tone: (darkest: number, mean: number) => string;
    screenNote: (screen: string) => string;
  };
  optionSizes: {
    setting: string;
    flag: string;
    noFlag: string;
    unchanged: string;
    region: (files: boolean) => string;
    size: (files: boolean) => string;
    kept: (files: boolean) => string;
    caption: (files: boolean, width: number, height: number) => string;
  };
  optionBook: {
    setting: string;
    flag: string;
    noFlag: string;
    missing: string;
    no: string;
    notRead: string;
    gray: string;
    color: string;
    copy: string;
    changed: string;
    ltr: string;
    rtl: string;
    page: string;
    pages: string;
    region: string;
    caption: (mangapress: string) => string;
    heads: Record<
      | 'title'
      | 'author'
      | 'language'
      | 'direction'
      | 'fileName'
      | 'comicInfo'
      | 'pages'
      | 'source'
      | 'firstPage'
      | 'cover',
      string
    >;
  };
}

const english: Strings = {
  numberLocale: 'en',
  brandLogo: { openFullSize: 'Open full-size logo' },
  tutorialImage: { openFullSize: 'Open full-size image' },
  releaseDownloads: {
    latest: 'Latest available version:',
    prerelease: ' (pre-release)',
    notes: 'Release notes',
    buttons: {
      windowsInstaller: 'Download installer (.exe)',
      windowsPortable: 'Download portable (.zip)',
      macOS: 'Download for Apple Silicon (.zip)',
      debian: 'Debian / Ubuntu (.deb)',
      fedora: 'Fedora (.rpm)',
      arch: 'Arch Linux (.pkg.tar.zst)',
    },
  },
  optionCredit: {
    art: 'Art:',
    by: ' by ',
    converted: (mangapress) => `. Converted with mangapress ${mangapress}.`,
  },
  optionExample: {
    openLarger: 'Open the larger image',
    notConverted: 'not converted',
    noFlag: 'no flag',
    pageCount: (count) => `${count} ${count === 1 ? 'page' : 'pages'}`,
    tone: (darkest, mean) => `Darkest pixel ${darkest}, average brightness ${mean} of 255`,
    screenNote: (screen) => `The gray is the screen around the page: ${screen} pixels.`,
  },
  optionSizes: {
    setting: 'Setting',
    flag: 'On the command line',
    noFlag: 'no flag',
    unchanged: 'the input, unchanged',
    region: (files) => (files ? 'measured file sizes' : 'measured sizes'),
    size: (files) => (files ? 'Page' : 'Page size'),
    kept: (files) => (files ? 'File size' : 'Of the page kept'),
    caption: (files, width, height) =>
      files
        ? `Source page: ${width} × ${height} px. The sizes are those of the file of the page mangapress wrote.`
        : `Source page: ${width} × ${height} px. The pages are not enlarged, so the size shows what was cropped.`,
  },
  optionBook: {
    setting: 'Setting',
    flag: 'On the command line',
    noFlag: 'no flag',
    missing: 'not in the book',
    no: 'no',
    notRead: 'not read',
    gray: 'gray',
    color: 'color',
    copy: 'yes, the input’s own, unchanged',
    changed: 'yes, changed',
    ltr: 'left to right (ltr)',
    rtl: 'right to left (rtl)',
    page: 'page',
    pages: 'pages',
    region: 'measured values',
    caption: (mangapress) =>
      `Measured with mangapress ${mangapress}: each value is read back from the book it wrote.`,
    heads: {
      title: 'Book title',
      author: 'Author',
      language: 'Language',
      direction: 'Reading direction',
      fileName: 'File name',
      comicInfo: 'ComicInfo.xml in the book',
      pages: 'Pages',
      source: 'First image',
      firstPage: 'First page of the book',
      cover: 'Cover',
    },
  },
};

const portuguese: Strings = {
  numberLocale: 'pt-BR',
  brandLogo: { openFullSize: 'Abrir logo em tamanho original' },
  tutorialImage: { openFullSize: 'Abrir imagem em tamanho original' },
  releaseDownloads: {
    latest: 'Última versão disponível:',
    prerelease: ' (pré-release)',
    notes: 'Notas da versão',
    buttons: {
      windowsInstaller: 'Baixar instalador (.exe)',
      windowsPortable: 'Baixar versão portátil (.zip)',
      macOS: 'Baixar para Apple Silicon (.zip)',
      debian: 'Debian / Ubuntu (.deb)',
      fedora: 'Fedora (.rpm)',
      arch: 'Arch Linux (.pkg.tar.zst)',
    },
  },
  optionCredit: {
    art: 'Arte:',
    by: ', de ',
    converted: (mangapress) => `. Convertida com o mangapress ${mangapress}.`,
  },
  optionExample: {
    openLarger: 'Abrir imagem em tamanho maior',
    notConverted: 'sem conversão',
    noFlag: 'sem flag',
    pageCount: (count) => `${count} ${count === 1 ? 'página' : 'páginas'}`,
    tone: (darkest, mean) => `Pixel mais escuro ${darkest}, brilho médio ${mean} de 255`,
    screenNote: (screen) => `O cinza é a tela em volta da página: ${screen} pixels.`,
  },
  optionSizes: {
    setting: 'Opção',
    flag: 'No terminal',
    noFlag: 'sem flag',
    unchanged: 'a própria entrada, sem mudança',
    region: (files) => (files ? 'tamanhos de arquivo medidos' : 'tamanhos medidos'),
    size: (files) => (files ? 'Página' : 'Tamanho da página'),
    kept: (files) => (files ? 'Tamanho do arquivo' : 'Fica da página'),
    caption: (files, width, height) =>
      files
        ? `Página de origem: ${width} × ${height} px. Os tamanhos são os do arquivo da página que o mangapress gravou.`
        : `Página de origem: ${width} × ${height} px. As páginas não são ampliadas, então o tamanho mostra o que foi cortado.`,
  },
  optionBook: {
    setting: 'Opção',
    flag: 'No terminal',
    noFlag: 'sem flag',
    missing: 'não consta do livro',
    no: 'não',
    notRead: 'não lido',
    gray: 'cinza',
    color: 'colorida',
    copy: 'sim, a da entrada, sem mudança',
    changed: 'sim, alterada',
    ltr: 'da esquerda para a direita (ltr)',
    rtl: 'da direita para a esquerda (rtl)',
    page: 'página',
    pages: 'páginas',
    region: 'valores medidos',
    caption: (mangapress) =>
      `Medido com o mangapress ${mangapress}: cada valor é lido de volta do livro que ele gravou.`,
    heads: {
      title: 'Título do livro',
      author: 'Autor',
      language: 'Idioma',
      direction: 'Direção de leitura',
      fileName: 'Nome do arquivo',
      comicInfo: 'ComicInfo.xml no livro',
      pages: 'Páginas',
      source: 'Primeira imagem',
      firstPage: 'Primeira página do livro',
      cover: 'Capa',
    },
  },
};

const catalogs: Record<string, Strings> = { en: english, 'pt-BR': portuguese };

/** The words of the components in a language of the site (`Astro.locals.starlightRoute.lang`). */
export function stringsFor(lang: string): Strings {
  const catalog = catalogs[lang];
  if (!catalog) throw new Error(`The components have no words for the language ${lang}.`);
  return catalog;
}
