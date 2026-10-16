import type { Language } from '@/domain/app-settings';
import type { OptionName } from '@/domain/messages/notice';
import type { CheckedOption } from '@/domain/messages/options';
import type {
  AutoContrastMode,
  BorderMode,
  MangapressSettings,
  PageSizeMode,
} from '@/domain/output-profile';

/** A choice among a few, each with its name and what it does. */
interface Choices<Key extends string> {
  readonly names: Readonly<Record<Key, string>>;
  readonly help: Readonly<Record<Key, string>>;
}

/** A field that is a name and a line of what it is for. */
interface Described {
  readonly label: string;
  readonly description: string;
}

/**
 * The words of the fields of the conversion options (ADR 0052): the sections, each field with what
 * it is for, the names of the choices, and the names an option is called in a sentence about it.
 */
export interface OptionFieldsMessages {
  /** What a sentence says an option is called, when its saved value was reset. */
  readonly names: Readonly<Record<OptionName, string>>;
  /** What a sentence says an option is called, when the value typed for it is refused. */
  readonly checked: Readonly<Record<CheckedOption, string>>;
  readonly singleBook: { readonly title: string; readonly text: string };
  readonly eyebrow: {
    readonly basic: string;
    readonly advanced: string;
    readonly diagnostics: string;
  };
  readonly device: {
    readonly title: string;
    readonly description: string;
    readonly profile: {
      readonly label: string;
      readonly unavailable: string;
      readonly detail: (width: number, height: number, grays: number) => string;
    };
    readonly format: { readonly label: string };
    readonly customWidth: Described & { readonly placeholder: string };
    readonly customHeight: Described & { readonly placeholder: string };
    readonly noProcessing: Described;
    readonly noKepub: Described;
  };
  readonly reading: {
    readonly title: string;
    readonly description: string;
    readonly content: {
      readonly label: string;
      readonly pages: string;
      readonly webtoon: string;
      readonly pagesHelp: string;
      readonly webtoonHelp: string;
    };
    readonly mangaStyle: Described;
  };
  readonly spreads: {
    readonly title: string;
    readonly description: string;
    readonly wide: { readonly label: string } & Choices<MangapressSettings['splitter']>;
    readonly rotateFirst: Described;
    readonly noRotate: Described;
    readonly rotateRight: Described;
    readonly maximizeStrips: Described;
  };
  readonly size: {
    readonly title: string;
    readonly description: string;
    readonly pageSize: {
      readonly label: string;
      readonly webtoonEnlarge: string;
    } & Choices<PageSizeMode>;
    readonly borders: {
      readonly label: string;
      readonly names: Readonly<Record<BorderMode, string>>;
      /** An EPUB has a page background; the other formats have padding. */
      readonly epub: Readonly<Record<BorderMode, string>>;
      readonly padded: Readonly<Record<BorderMode, string>>;
    };
  };
  readonly cropping: {
    readonly title: string;
    readonly description: string;
    readonly enableFirst: string;
    readonly pages: {
      readonly label: string;
      readonly names: Readonly<Record<MangapressSettings['cropping'], string>>;
    };
    readonly power: Described;
    readonly minimum: Described;
    readonly preserve: Described;
    readonly interPanel: {
      readonly label: string;
      readonly description: string;
      readonly names: Readonly<Record<MangapressSettings['interPanelCrop'], string>>;
    };
  };
  readonly twoPage: {
    readonly title: string;
    readonly description: string;
    readonly spreadShift: Described;
    readonly onePage: Described;
    readonly invert: Described;
  };
  readonly color: {
    readonly title: string;
    readonly description: string;
    readonly pages: {
      readonly label: string;
      readonly grayscale: string;
      readonly color: string;
      readonly helpUntouched: string;
      readonly helpColor: string;
      readonly helpGray: string;
    };
    readonly autoContrast: {
      readonly label: string;
      readonly turnOnFirst: string;
    } & Choices<AutoContrastMode>;
    readonly rainbow: Described;
    readonly autoLevel: Described;
    readonly gamma: Described & { readonly placeholder: string };
  };
  readonly images: {
    readonly title: string;
    readonly description: string;
    readonly format: {
      readonly label: string;
      readonly jpeg: string;
      readonly png: string;
      readonly helpJpeg: string;
      readonly helpAllGrays: string;
      readonly helpDithered: string;
    };
    readonly jpegQuality: {
      readonly label: string;
      readonly hint: (percent: number) => string;
      readonly forColorPages: string;
      readonly coverOnly: string;
    };
    readonly noQuantize: Described;
    readonly pngLegacy: Described;
    readonly forcePngRgb: Described;
  };
  readonly cover: {
    readonly title: string;
    readonly description: string;
    readonly smartCrop: Described;
    readonly fill: Described;
  };
  readonly metadata: {
    readonly title: string;
    readonly description: string;
    readonly comicInfoTitle: Described & {
      readonly names: Readonly<Record<MangapressSettings['metadataTitle'], string>>;
    };
    readonly language: {
      readonly label: string;
      readonly forEpub: string;
      readonly stored: string;
    };
    readonly keepComicInfo: {
      readonly label: string;
      readonly cbz: string;
      readonly onlyCbz: string;
    };
  };
  readonly tool: {
    readonly title: string;
    readonly description: string;
    readonly quiet: Described;
  };
}

/** A language is added by one entry here, and the compiler says where the others are missing. */
export const optionFieldsMessages: Readonly<Record<Language, OptionFieldsMessages>> = {
  en: {
    names: {
      deviceProfile: 'device profile',
      noProcessing: 'no processing',
      noKepub: 'no kepub',
      quiet: 'quiet',
      webtoon: 'webtoon',
      mangaStyle: 'manga style',
      cropping: 'cropping',
      croppingPower: 'cropping power',
      croppingMinimum: 'cropping minimum',
      preserveMargin: 'preserve margin',
      splitter: 'splitter',
      noRotate: 'no rotate',
      rotateFirst: 'rotate first',
      maximizeStrips: 'maximize strips',
      upscale: 'upscale',
      stretch: 'stretch',
      wallpaper: 'wallpaper',
      whiteBorders: 'white borders',
      blackBorders: 'black borders',
      spreadShift: 'spread shift',
      onePageLandscape: 'one page landscape',
      invertDirection: 'invert direction',
      forceColor: 'force color',
      forcePng: 'force png',
      noQuantize: 'no quantize',
      pngLegacy: 'png legacy',
      forcePngRgb: 'force png rgb',
      jpegQuality: 'jpeg quality',
      rotateRight: 'rotate right',
      gamma: 'gamma',
      autoLevel: 'auto level',
      noAutoContrast: 'no auto contrast',
      colorAutoContrast: 'color auto contrast',
      interPanelCrop: 'inter panel crop',
      eraseRainbow: 'erase rainbow',
      smartCoverCrop: 'smart cover crop',
      coverFill: 'cover fill',
      metadataTitle: 'metadata title',
      keepComicInfo: 'keep comic info',
      language: 'language',
      customWidth: 'custom width',
      customHeight: 'custom height',
      combineIntoOneVolume: 'combine into one volume',
      customDeviceSize: 'custom device size',
      mode: 'mode',
      format: 'format',
      singleBook: 'single book',
      providerId: 'online source',
      outputFolder: 'save folder',
      lastPickerFolder: 'last folder',
      preferredNetworkInterface: 'sharing network',
    },
    checked: {
      croppingPower: 'Cropping power',
      croppingMinimum: 'Minimum retained area',
      preserveMargin: 'Preserved margin',
      jpegQuality: 'JPEG quality',
      gamma: 'Gamma',
      customWidth: 'Custom width',
      customHeight: 'Custom height',
    },
    singleBook: {
      title: 'Single book for the series',
      text: 'Active from the queue: the series will be produced as a single EPUB with volumes and chapters in the table of contents. Book format and process steps are locked.',
    },
    eyebrow: { basic: 'Basic', advanced: 'Advanced', diagnostics: 'Diagnostics' },
    device: {
      title: 'Device & output',
      description: 'Choose the reader target, book format, and optional resolution overrides.',
      profile: {
        label: 'Device profile',
        unavailable: 'Profiles unavailable',
        detail: (width, height, grays) =>
          `${String(width)} × ${String(height)} · ${String(grays)} gray levels`,
      },
      format: { label: 'Book format' },
      customWidth: {
        label: 'Custom width',
        description: 'Overrides the profile width. Required with height for the OTHER profile.',
        placeholder: 'Enter width',
      },
      customHeight: {
        label: 'Custom height',
        description: 'Overrides the profile height. Required with width for the OTHER profile.',
        placeholder: 'Enter height',
      },
      noProcessing: {
        label: 'Use the images as they are',
        description: 'Package the pages untouched: no cropping, resizing, grayscale or recoding.',
      },
      noKepub: {
        label: 'Name the book .epub',
        description: 'Instead of .kepub.epub, the name Kobo’s own reader looks for.',
      },
    },
    reading: {
      title: 'Reading',
      description: 'What the images are and which way they are read.',
      content: {
        label: 'Content',
        pages: 'Manga or comic pages',
        webtoon: 'Webtoon strips',
        pagesHelp: 'Each image is one page.',
        webtoonHelp: 'Each chapter is joined into one strip and cut into pages between panels.',
      },
      mangaStyle: {
        label: 'Manga reading order',
        description: 'Use right-to-left reading and spread-split order.',
      },
    },
    spreads: {
      title: 'Double-page spreads',
      description: 'What becomes of a page that is two pages wide.',
      wide: {
        label: 'Wide pages',
        names: {
          split: 'Split into two pages',
          rotate: 'Keep whole, as one page',
          both: 'Both: the halves, then the whole',
        },
        help: {
          split: 'Each half becomes a page of its own.',
          rotate: 'The spread is turned on its side to fill the screen.',
          both: 'The two halves, then the whole spread again.',
        },
      },
      rotateFirst: {
        label: 'Whole spread first',
        description: 'Put the whole spread before its two halves.',
      },
      noRotate: {
        label: 'Keep the whole spread upright',
        description: 'Not turned on its side: read it with the device in landscape.',
      },
      rotateRight: {
        label: 'Rotate clockwise',
        description: 'Rotate spreads clockwise instead of counter-clockwise.',
      },
      maximizeStrips: {
        label: 'Restack 4-panel strips as 2×2',
        description:
          'Stack the two halves of every page, for pages made of two tall strips. Replaces the handling of wide pages.',
      },
    },
    size: {
      title: 'Size and borders',
      description: 'How a page fills the screen and what surrounds it.',
      pageSize: {
        label: 'Page size',
        webtoonEnlarge: 'Webtoon strips are never enlarged.',
        names: {
          fit: 'Fit, never enlarge',
          enlarge: 'Fit, enlarging small pages',
          stretch: 'Stretch to the screen',
          fill: 'Crop to fill the screen',
        },
        help: {
          fit: 'Larger pages are shrunk to fit; smaller ones are left as they are.',
          enlarge: 'Every page is fitted to the screen, smaller ones enlarged.',
          stretch: 'Pages fill the screen exactly, without keeping their proportions.',
          fill: 'Pages are cropped until they fill the whole screen.',
        },
      },
      borders: {
        label: 'Borders',
        names: { automatic: 'Automatic', white: 'White', black: 'Black' },
        epub: {
          automatic: 'Each page gets the background its own edges have.',
          white: 'A white background behind every page, dark ones included.',
          black: 'A black background behind every page.',
        },
        padded: {
          automatic: 'Pages are padded to the screen with their own background color.',
          white: 'Pages are not padded with their background color.',
          black: 'Pages are padded to the screen with black.',
        },
      },
    },
    cropping: {
      title: 'Cropping',
      description: 'Remove the margins around a page and the empty space between its panels.',
      enableFirst: 'Enable page cropping to adjust this.',
      pages: {
        label: 'Page cropping',
        names: {
          disabled: 'Disabled',
          margins: 'Margins',
          'margins-and-page-numbers': 'Margins and page numbers',
        },
      },
      power: { label: 'Cropping power', description: 'Higher values crop through more.' },
      minimum: {
        label: 'Minimum retained area (%)',
        description: 'Only crop when this percentage of the page remains.',
      },
      preserve: {
        label: 'Preserved margin (%)',
        description: 'Back off the computed crop to retain some margin.',
      },
      interPanel: {
        label: 'Inter-panel cropping',
        description: 'Removes empty gutters inside webtoon-style pages.',
        names: {
          disabled: 'Disabled',
          horizontal: 'Horizontal gaps',
          both: 'Horizontal and vertical gaps',
        },
      },
    },
    twoPage: {
      title: 'Two-page view',
      description:
        "For readers that show two pages side by side, such as Kobo's and Kindle's own. KOReader ignores these.",
      spreadShift: {
        label: 'Start on the other side',
        description: 'Start the book on the other side, to line double-page spreads up.',
      },
      onePage: {
        label: 'One page in landscape',
        description: 'Show a single centered page instead of two.',
      },
      invert: {
        label: 'Invert page turns',
        description: 'Turn pages against the reading order.',
      },
    },
    color: {
      title: 'Color and tone',
      description: 'Whether color is kept, and how the tones of a page are corrected.',
      pages: {
        label: 'Color pages',
        grayscale: 'Convert to grayscale',
        color: 'Keep in color',
        helpUntouched: 'The pages stay as they are; only the cover follows this.',
        helpColor: 'Pages with real color stay in color; the others still become grayscale.',
        helpGray: 'Every page becomes grayscale.',
      },
      autoContrast: {
        label: 'Autocontrast',
        turnOnFirst: 'Turn autocontrast on to use black-point leveling.',
        names: {
          monochrome: 'Black-and-white pages only',
          off: 'Off',
          all: 'Color pages too',
        },
        help: {
          monochrome: 'Tones are stretched to full black and white; color pages are left alone.',
          off: 'Tones are left as they are.',
          all: 'Color pages have their tones stretched as well.',
        },
      },
      rainbow: {
        label: 'Reduce rainbow effect',
        description: 'Attenuate rainbow interference on color e-ink displays.',
      },
      autoLevel: {
        label: 'Auto-level black point',
        description: 'Set the most common dark pixel as the black point first.',
      },
      gamma: {
        label: 'Gamma',
        description: 'Leave empty for profile gamma; 1.0 leaves tones unchanged.',
        placeholder: '1.0',
      },
    },
    images: {
      title: 'Page images',
      description: 'The kind of file each page is saved as.',
      format: {
        label: 'Page format',
        jpeg: 'JPEG, full tone',
        png: 'PNG, reduced to the screen’s grays',
        helpJpeg: 'Smooth tones in small files. The usual choice.',
        helpAllGrays: 'All 256 grays, saved without loss.',
        helpDithered: 'Dithered to the grays the screen can show, saved without loss.',
      },
      jpegQuality: {
        label: 'JPEG quality',
        hint: (percent) => `Leave empty for the device profile default (${String(percent)}%).`,
        forColorPages: 'For the color pages, which stay JPEG.',
        coverOnly: 'Only the cover is a JPEG now.',
      },
      noQuantize: {
        label: 'Keep all 256 grays',
        description: 'Skip the reduction to the screen’s grays. Larger files.',
      },
      pngLegacy: {
        label: '8-bit PNG',
        description: 'For readers that cannot open the more compact kind of PNG. Larger files.',
      },
      forcePngRgb: {
        label: 'Color pages as PNG too',
        description: 'Pages kept in color are saved without loss as well. Much larger files.',
      },
    },
    cover: {
      title: 'Cover',
      description:
        'The cover a reader shows in its library, made from the first image of each book.',
      smartCrop: {
        label: 'Cut the front cover from a wide image',
        description: 'When the first image is a whole jacket or a spread, use only its front.',
      },
      fill: {
        label: 'Crop the cover to fill the screen',
        description: 'Instead of fitting inside it. Small covers are enlarged.',
      },
    },
    metadata: {
      title: 'Book metadata',
      description:
        "How source metadata is applied, and the language books are made in. A book's own title, author and language are set from its item in the queue.",
      comicInfoTitle: {
        label: 'ComicInfo title',
        description: "Controls how ComicInfo.xml's Title field is applied.",
        names: {
          'series-only': 'Use series, volume, and number',
          combine: 'Append the ComicInfo title',
          'title-only': 'Use the ComicInfo title only',
        },
      },
      language: {
        label: 'EPUB language',
        forEpub: "Used for EPUB output, unless a book's own details name another language.",
        stored: 'Stored for this profile and applied when EPUB is selected.',
      },
      keepComicInfo: {
        label: 'Keep ComicInfo.xml',
        cbz: 'Copy the original ComicInfo.xml into the converted CBZ.',
        onlyCbz: 'Available only for CBZ output.',
      },
    },
    tool: {
      title: 'Tool behavior',
      description: 'Controls intended for troubleshooting and repeatable profile parity.',
      quiet: {
        label: 'Quiet mode',
        description:
          'The GUI already uses structured events, which suppress routine console chatter; this setting preserves exact --quiet parity in saved profiles.',
      },
    },
  },
  'pt-BR': {
    names: {
      deviceProfile: 'perfil do dispositivo',
      noProcessing: 'usar as imagens como estão',
      noKepub: 'nomear o livro como .epub',
      quiet: 'modo silencioso',
      webtoon: 'conteúdo',
      mangaStyle: 'ordem de leitura de mangá',
      cropping: 'corte das páginas',
      croppingPower: 'intensidade do corte',
      croppingMinimum: 'área mínima mantida',
      preserveMargin: 'margem preservada',
      splitter: 'páginas largas',
      noRotate: 'manter a página dupla em pé',
      rotateFirst: 'página dupla inteira primeiro',
      maximizeStrips: 'reempilhar tiras',
      upscale: 'tamanho da página',
      stretch: 'tamanho da página',
      wallpaper: 'tamanho da página',
      whiteBorders: 'bordas',
      blackBorders: 'bordas',
      spreadShift: 'começar do outro lado',
      onePageLandscape: 'uma página na horizontal',
      invertDirection: 'inverter a virada de página',
      forceColor: 'páginas coloridas',
      forcePng: 'formato da página',
      noQuantize: 'manter os 256 cinzas',
      pngLegacy: 'PNG de 8 bits',
      forcePngRgb: 'páginas coloridas também em PNG',
      jpegQuality: 'qualidade do JPEG',
      rotateRight: 'girar no sentido horário',
      gamma: 'gama',
      autoLevel: 'nivelar o ponto preto',
      noAutoContrast: 'contraste automático',
      colorAutoContrast: 'contraste automático',
      interPanelCrop: 'corte entre quadros',
      eraseRainbow: 'efeito arco-íris',
      smartCoverCrop: 'recortar a capa frontal',
      coverFill: 'cortar a capa para preencher a tela',
      metadataTitle: 'título do ComicInfo',
      keepComicInfo: 'manter o ComicInfo.xml',
      language: 'idioma do EPUB',
      customWidth: 'largura personalizada',
      customHeight: 'altura personalizada',
      combineIntoOneVolume: 'juntar em um volume só',
      customDeviceSize: 'tamanho personalizado do dispositivo',
      mode: 'processo',
      format: 'formato',
      singleBook: 'livro único',
      providerId: 'fonte online',
      outputFolder: 'pasta para salvar',
      lastPickerFolder: 'última pasta',
      preferredNetworkInterface: 'rede de compartilhamento',
    },
    checked: {
      croppingPower: 'Intensidade do corte',
      croppingMinimum: 'Área mínima mantida',
      preserveMargin: 'Margem preservada',
      jpegQuality: 'Qualidade do JPEG',
      gamma: 'Gama',
      customWidth: 'Largura personalizada',
      customHeight: 'Altura personalizada',
    },
    singleBook: {
      title: 'Um livro para a série',
      text: 'Ativo na fila: a série será gerada como um único EPUB, com volumes e capítulos no sumário. O formato do livro e as etapas do processo ficam travados.',
    },
    eyebrow: { basic: 'Básico', advanced: 'Avançado', diagnostics: 'Diagnóstico' },
    device: {
      title: 'Dispositivo e saída',
      description:
        'Escolha o leitor de destino, o formato do livro e, se quiser, uma resolução própria.',
      profile: {
        label: 'Perfil do dispositivo',
        unavailable: 'Perfis indisponíveis',
        detail: (width, height, grays) =>
          `${String(width)} × ${String(height)} · ${String(grays)} níveis de cinza`,
      },
      format: { label: 'Formato do livro' },
      customWidth: {
        label: 'Largura personalizada',
        description:
          'Substitui a largura do perfil. Obrigatória, junto com a altura, no perfil OTHER.',
        placeholder: 'Informe a largura',
      },
      customHeight: {
        label: 'Altura personalizada',
        description:
          'Substitui a altura do perfil. Obrigatória, junto com a largura, no perfil OTHER.',
        placeholder: 'Informe a altura',
      },
      noProcessing: {
        label: 'Usar as imagens como estão',
        description:
          'Empacota as páginas sem tocar nelas: sem corte, redimensionamento, tons de cinza nem recodificação.',
      },
      noKepub: {
        label: 'Nomear o livro como .epub',
        description: 'Em vez de .kepub.epub, o nome que o leitor próprio da Kobo procura.',
      },
    },
    reading: {
      title: 'Leitura',
      description: 'O que são as imagens e em que sentido são lidas.',
      content: {
        label: 'Conteúdo',
        pages: 'Páginas de mangá ou quadrinhos',
        webtoon: 'Tiras de webtoon',
        pagesHelp: 'Cada imagem é uma página.',
        webtoonHelp: 'Cada capítulo é unido em uma tira só e cortado em páginas entre os quadros.',
      },
      mangaStyle: {
        label: 'Ordem de leitura de mangá',
        description:
          'Usa a leitura da direita para a esquerda e a ordem de divisão das páginas duplas.',
      },
    },
    spreads: {
      title: 'Páginas duplas',
      description: 'O que acontece com uma página que tem a largura de duas.',
      wide: {
        label: 'Páginas largas',
        names: {
          split: 'Dividir em duas páginas',
          rotate: 'Manter inteira, como uma página',
          both: 'As duas: as metades e depois a inteira',
        },
        help: {
          split: 'Cada metade vira uma página própria.',
          rotate: 'A página dupla é girada de lado para preencher a tela.',
          both: 'As duas metades e, depois, a página dupla inteira de novo.',
        },
      },
      rotateFirst: {
        label: 'Página dupla inteira primeiro',
        description: 'Coloca a página dupla inteira antes das suas duas metades.',
      },
      noRotate: {
        label: 'Manter a página dupla inteira em pé',
        description: 'Sem girar de lado: leia com o dispositivo na horizontal.',
      },
      rotateRight: {
        label: 'Girar no sentido horário',
        description: 'Gira as páginas duplas no sentido horário, em vez do anti-horário.',
      },
      maximizeStrips: {
        label: 'Reempilhar tiras de 4 quadros em 2×2',
        description:
          'Empilha as duas metades de cada página, para páginas feitas de duas tiras altas. Substitui o tratamento das páginas largas.',
      },
    },
    size: {
      title: 'Tamanho e bordas',
      description: 'Como uma página preenche a tela e o que a cerca.',
      pageSize: {
        label: 'Tamanho da página',
        webtoonEnlarge: 'Tiras de webtoon nunca são ampliadas.',
        names: {
          fit: 'Ajustar, sem ampliar',
          enlarge: 'Ajustar, ampliando páginas pequenas',
          stretch: 'Esticar até a tela',
          fill: 'Cortar para preencher a tela',
        },
        help: {
          fit: 'Páginas maiores são reduzidas para caber; as menores ficam como estão.',
          enlarge: 'Todas as páginas são ajustadas à tela, e as menores são ampliadas.',
          stretch: 'As páginas preenchem a tela exatamente, sem manter as proporções.',
          fill: 'As páginas são cortadas até preencher a tela toda.',
        },
      },
      borders: {
        label: 'Bordas',
        names: { automatic: 'Automáticas', white: 'Brancas', black: 'Pretas' },
        epub: {
          automatic: 'Cada página recebe o fundo que as suas próprias bordas têm.',
          white: 'Um fundo branco atrás de todas as páginas, inclusive as escuras.',
          black: 'Um fundo preto atrás de todas as páginas.',
        },
        padded: {
          automatic: 'As páginas são preenchidas até a tela com a cor do próprio fundo.',
          white: 'As páginas não são preenchidas com a cor do próprio fundo.',
          black: 'As páginas são preenchidas até a tela com preto.',
        },
      },
    },
    cropping: {
      title: 'Corte',
      description: 'Remove as margens ao redor de uma página e o espaço vazio entre os quadros.',
      enableFirst: 'Ative o corte das páginas para ajustar isto.',
      pages: {
        label: 'Corte das páginas',
        names: {
          disabled: 'Desativado',
          margins: 'Margens',
          'margins-and-page-numbers': 'Margens e números de página',
        },
      },
      power: { label: 'Intensidade do corte', description: 'Valores maiores cortam mais.' },
      minimum: {
        label: 'Área mínima mantida (%)',
        description: 'Só corta quando esta porcentagem da página permanece.',
      },
      preserve: {
        label: 'Margem preservada (%)',
        description: 'Recua o corte calculado para manter uma parte da margem.',
      },
      interPanel: {
        label: 'Corte entre quadros',
        description: 'Remove os espaços vazios dentro de páginas no estilo webtoon.',
        names: {
          disabled: 'Desativado',
          horizontal: 'Espaços horizontais',
          both: 'Espaços horizontais e verticais',
        },
      },
    },
    twoPage: {
      title: 'Visão de duas páginas',
      description:
        'Para leitores que mostram duas páginas lado a lado, como os próprios da Kobo e da Kindle. O KOReader ignora estas opções.',
      spreadShift: {
        label: 'Começar do outro lado',
        description: 'Começa o livro do outro lado, para alinhar as páginas duplas.',
      },
      onePage: {
        label: 'Uma página na horizontal',
        description: 'Mostra uma única página centralizada em vez de duas.',
      },
      invert: {
        label: 'Inverter a virada de página',
        description: 'Vira as páginas contra a ordem de leitura.',
      },
    },
    color: {
      title: 'Cor e tom',
      description: 'Se a cor é mantida e como os tons de uma página são corrigidos.',
      pages: {
        label: 'Páginas coloridas',
        grayscale: 'Converter para tons de cinza',
        color: 'Manter em cores',
        helpUntouched: 'As páginas ficam como estão; só a capa segue isto.',
        helpColor:
          'Páginas com cor de verdade ficam coloridas; as outras ainda viram tons de cinza.',
        helpGray: 'Todas as páginas viram tons de cinza.',
      },
      autoContrast: {
        label: 'Contraste automático',
        turnOnFirst: 'Ligue o contraste automático para usar o nivelamento do ponto preto.',
        names: {
          monochrome: 'Só páginas em preto e branco',
          off: 'Desligado',
          all: 'Também páginas coloridas',
        },
        help: {
          monochrome:
            'Os tons são esticados até o preto e o branco totais; as páginas coloridas não são mexidas.',
          off: 'Os tons ficam como estão.',
          all: 'As páginas coloridas também têm os tons esticados.',
        },
      },
      rainbow: {
        label: 'Reduzir o efeito arco-íris',
        description: 'Atenua a interferência de arco-íris em telas e-ink coloridas.',
      },
      autoLevel: {
        label: 'Nivelar o ponto preto automaticamente',
        description: 'Define primeiro o pixel escuro mais comum como o ponto preto.',
      },
      gamma: {
        label: 'Gama',
        description: 'Deixe vazio para usar a gama do perfil; 1.0 não altera os tons.',
        placeholder: '1.0',
      },
    },
    images: {
      title: 'Imagens das páginas',
      description: 'O tipo de arquivo em que cada página é salva.',
      format: {
        label: 'Formato da página',
        jpeg: 'JPEG, tons completos',
        png: 'PNG, reduzido aos cinzas da tela',
        helpJpeg: 'Tons suaves em arquivos pequenos. A escolha habitual.',
        helpAllGrays: 'Todos os 256 cinzas, salvos sem perdas.',
        helpDithered: 'Com pontilhado para os cinzas que a tela mostra, salvos sem perdas.',
      },
      jpegQuality: {
        label: 'Qualidade do JPEG',
        hint: (percent) =>
          `Deixe vazio para o padrão do perfil do dispositivo (${String(percent)}%).`,
        forColorPages: 'Para as páginas coloridas, que continuam em JPEG.',
        coverOnly: 'Agora só a capa é um JPEG.',
      },
      noQuantize: {
        label: 'Manter os 256 cinzas',
        description: 'Pula a redução aos cinzas da tela. Arquivos maiores.',
      },
      pngLegacy: {
        label: 'PNG de 8 bits',
        description: 'Para leitores que não abrem o tipo mais compacto de PNG. Arquivos maiores.',
      },
      forcePngRgb: {
        label: 'Páginas coloridas também em PNG',
        description:
          'As páginas mantidas em cores também são salvas sem perdas. Arquivos muito maiores.',
      },
    },
    cover: {
      title: 'Capa',
      description:
        'A capa que o leitor mostra na sua biblioteca, feita a partir da primeira imagem de cada livro.',
      smartCrop: {
        label: 'Recortar a capa frontal de uma imagem larga',
        description:
          'Quando a primeira imagem é uma sobrecapa inteira ou uma página dupla, usa só a frente dela.',
      },
      fill: {
        label: 'Cortar a capa para preencher a tela',
        description: 'Em vez de caber dentro dela. Capas pequenas são ampliadas.',
      },
    },
    metadata: {
      title: 'Metadados do livro',
      description:
        'Como os metadados de origem são aplicados e o idioma em que os livros são feitos. O título, o autor e o idioma de cada livro são definidos no item dele na fila.',
      comicInfoTitle: {
        label: 'Título do ComicInfo',
        description: 'Controla como o campo Title do ComicInfo.xml é aplicado.',
        names: {
          'series-only': 'Usar série, volume e número',
          combine: 'Acrescentar o título do ComicInfo',
          'title-only': 'Usar só o título do ComicInfo',
        },
      },
      language: {
        label: 'Idioma do EPUB',
        forEpub:
          'Usado nos arquivos EPUB, a menos que os detalhes do próprio livro indiquem outro idioma.',
        stored: 'Guardado neste perfil e aplicado quando o EPUB é escolhido.',
      },
      keepComicInfo: {
        label: 'Manter o ComicInfo.xml',
        cbz: 'Copia o ComicInfo.xml original para o CBZ convertido.',
        onlyCbz: 'Disponível só para saída em CBZ.',
      },
    },
    tool: {
      title: 'Comportamento das ferramentas',
      description: 'Controles para diagnóstico de problemas e para repetir o mesmo perfil.',
      quiet: {
        label: 'Modo silencioso',
        description:
          'A interface já usa eventos estruturados, que dispensam a conversa rotineira do console; esta opção mantém a equivalência exata com --quiet nos perfis salvos.',
      },
    },
  },
};
