import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { LibraryTitle } from '@/domain/input-queue';
import { createMappingDraft } from '@/domain/mapping';
import { message, raw } from '@/domain/message';
import { defaultMangapressSettings } from '@/domain/output-profile';
import { AuthorLookupPanel } from '@/renderer/components/details/author-lookup';
import { BookCovers } from '@/renderer/components/details/book-covers';
import { ItemsWithOptionsNotice } from '@/renderer/components/settings/items-with-options-notice';
import { BookDetailsScreen } from '@/renderer/screens/book-details-screen';
import { ConversionOptionsScreen } from '@/renderer/screens/conversion-options-screen';
import { ItemOptionsScreen } from '@/renderer/screens/item-options-screen';
import { LibraryScreen } from '@/renderer/screens/library-screen';
import type { MetadataProviderDescriptor } from '@/shared/workflow-contract';

import { inPortuguese } from './support/i18n';

const chapters = [
  { id: 'c1', name: 'Capítulo 1', path: '/m/1', pageCount: 2, chapter: 1 },
  { id: 'c2', name: 'Capítulo 2', path: '/m/2', pageCount: 2, chapter: 2 },
] as const;
const volume = { name: 'Vol.01.cbz', pageCount: 4 };

const titles: readonly LibraryTitle[] = [
  {
    title: 'Inteiro',
    draft: createMappingDraft({
      mangaTitle: 'Inteiro',
      chapters,
      volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
    }),
    volumes: [volume],
  },
  {
    title: 'Parcial',
    draft: createMappingDraft({
      mangaTitle: 'Parcial',
      chapters,
      volumes: [{ id: 'v1', number: '1', chapterIds: ['c1'] }],
    }),
    volumes: [volume],
  },
  { title: 'Solto', draft: createMappingDraft({ mangaTitle: 'Solto', chapters }), volumes: [] },
  {
    title: 'Gravado',
    draft: createMappingDraft({ mangaTitle: 'Gravado', chapters }),
    volumes: [volume],
    outcome: { status: 'done' },
  },
  {
    title: 'Quebrado',
    draft: createMappingDraft({ mangaTitle: 'Quebrado', chapters }),
    volumes: [volume],
    outcome: { status: 'failed', message: message('failure.titleNotConverted', {}) },
  },
];

const mangaDex: MetadataProviderDescriptor = {
  id: 'mangadex',
  displayName: 'MangaDex',
  homepage: 'https://mangadex.org',
  description: raw('Community catalogue of manga'),
};

describe('the screen of a library, in Portuguese', () => {
  it('says what each title needs and what became of it, with the plural of the language', () => {
    render(
      inPortuguese(
        <LibraryScreen
          name="Biblioteca"
          onBack={vi.fn()}
          onEdit={vi.fn()}
          onEditDetails={vi.fn()}
          onEditOptions={vi.fn()}
          titles={titles}
        />,
      ),
    );

    expect(screen.getByRole('button', { name: 'Fila' })).toBeVisible();
    expect(
      screen.getByText(
        '5 títulos. Um título sem volumes fica de fora do processamento até você agrupá-lo.',
      ),
    ).toBeVisible();
    const list = screen.getByRole('list', { name: 'Títulos' });
    const row = (name: string): HTMLElement => within(list).getByText(name).closest('li')!;
    expect(row('Inteiro')).toHaveTextContent('2 capítulos');
    expect(row('Inteiro')).toHaveTextContent('1 volume');
    expect(row('Parcial')).toHaveTextContent('2 capítulos · 1 capítulo ficou de fora');
    expect(row('Solto')).toHaveTextContent('Precisa de volumes');
    expect(row('Gravado')).toHaveTextContent('Salvo');
    expect(row('Quebrado')).toHaveTextContent('Falhou');
    expect(row('Quebrado')).toHaveTextContent('Não foi possível converter.');
  });

  it('names the buttons of a title in the language, and says when something is set', () => {
    render(
      inPortuguese(
        <LibraryScreen
          name="Biblioteca"
          onBack={vi.fn()}
          onEdit={vi.fn()}
          onEditDetails={vi.fn()}
          onEditOptions={vi.fn()}
          titles={[{ ...titles[0]!, details: { author: 'Alguém' }, options: { format: 'pdf' } }]}
        />,
      ),
    );

    expect(screen.getByRole('button', { name: 'Editar os volumes de Inteiro' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Editar os detalhes de Inteiro' })).toHaveAttribute(
      'title',
      'Editar título, autor e idioma (definidos)',
    );
    expect(
      screen.getByRole('button', { name: 'Editar as opções de conversão de Inteiro' }),
    ).toHaveAttribute('title', 'Editar as opções de conversão deste título (definidas)');
  });

  it('says the single book mode and the links that were not read, by the codes of the language', () => {
    render(
      inPortuguese(
        <LibraryScreen
          name="Biblioteca"
          onBack={vi.fn()}
          onEdit={vi.fn()}
          singleBook
          skippedLinks={['A', 'B', 'C', 'D', 'E']}
          titles={[]}
        />,
      ),
    );

    expect(screen.getByRole('status', { name: 'Modo de livro único' })).toHaveTextContent(
      'Cada título da biblioteca será gerado como um livro único próprio.',
    );
    const links = screen.getByRole('status', {
      name: '5 pastas desta biblioteca não foram lidas',
    });
    expect(links).toHaveTextContent('São links, e o mangabind não segue links para uma série.');
    expect(links).toHaveTextContent('A, B, C e mais 2.');
  });
});

describe('the details of a book, in Portuguese', () => {
  const props = {
    backLabel: 'Fila',
    defaultLanguage: 'en-US',
    defaultTitle: 'Chainsaw Man',
    details: {},
    format: 'epub' as const,
    name: 'Chainsaw Man',
    onBack: vi.fn(),
    onChange: vi.fn(),
  };

  it('says what each field is for, and what the book will be titled', () => {
    render(inPortuguese(<BookDetailsScreen {...props} />));

    expect(screen.getByText('Detalhes do livro')).toBeVisible();
    expect(
      screen.getByText(
        'Todos os campos são opcionais. O que você deixar vazio usa o valor padrão.',
      ),
    ).toBeVisible();
    expect(screen.getByLabelText('Título do livro')).toHaveAccessibleDescription(
      'O título que o livro terá no seu leitor.',
    );
    expect(screen.getByLabelText('Autor')).toHaveAttribute(
      'placeholder',
      'Deixe em branco se não souber',
    );
    expect(screen.getByLabelText('Idioma')).toHaveAccessibleDescription('Usado nos arquivos EPUB.');
    expect(screen.getByText('O livro terá o título')).toBeVisible();
  });

  it('says it of a series, with how many more books there are', () => {
    render(inPortuguese(<BookDetailsScreen {...props} volumes={[1, 2, 3, 4, 5]} />));

    expect(screen.getByLabelText('Título da série')).toHaveAccessibleDescription(
      'Cada volume recebe este título e o seu número.',
    );
    expect(screen.getByText('Os livros terão o título')).toBeVisible();
    const titled = screen.getByRole('list', { name: 'Títulos dos livros' });
    expect(within(titled).getAllByRole('listitem')).toHaveLength(4);
    expect(within(titled).getByText('…e mais 2, um para cada volume restante.')).toBeVisible();
  });

  it('says what a language that is not a tag, and one the folders declare, say', async () => {
    const user = userEvent.setup();
    render(inPortuguese(<BookDetailsScreen {...props} declaredLanguage="ja" />));

    expect(screen.getByLabelText('Idioma')).toHaveAccessibleDescription(
      'Os nomes das pastas indicam ja.',
    );
    await user.click(screen.getByRole('button', { name: 'Usar ja' }));
    await user.clear(screen.getByLabelText('Idioma'));
    await user.type(screen.getByLabelText('Idioma'), 'x');

    expect(screen.getByText(/Use uma etiqueta de idioma como en-US ou pt-BR/u)).toBeVisible();
  });

  it('says that the folders declare a language and that only an EPUB carries one', () => {
    render(inPortuguese(<BookDetailsScreen {...props} declaredLanguage="ja" format="cbz" />));

    expect(screen.getByLabelText('Idioma')).toHaveAccessibleDescription(
      'Os nomes das pastas indicam ja, mas só os arquivos EPUB têm idioma.',
    );
    expect(screen.queryByRole('button', { name: /^Usar / })).not.toBeInTheDocument();
  });

  it('says that a CBZ keeps no author and that a PDF has no cover', () => {
    const { rerender } = render(inPortuguese(<BookDetailsScreen {...props} format="cbz" />));
    expect(
      screen.getByText(
        'Arquivos CBZ não guardam o autor. Ele só fica no catálogo que o Manga2Ink mostra.',
      ),
    ).toBeVisible();
    expect(screen.getByLabelText('Idioma')).toHaveAccessibleDescription(
      'Só os arquivos EPUB têm idioma.',
    );

    rerender(
      inPortuguese(
        <BookDetailsScreen
          {...props}
          covers={{
            attached: [],
            onChoose: vi.fn(),
            onChooseFolder: vi.fn(),
            onDropFiles: vi.fn(),
            onRemove: vi.fn(),
          }}
          format="pdf"
        />,
      ),
    );
    expect(
      screen.getByText(
        'Um PDF não tem capa. O que for definido aqui fica guardado para os outros formatos.',
      ),
    ).toBeVisible();
  });
});

describe('the covers of a book, in Portuguese', () => {
  const actions = () => ({
    onChoose: vi.fn(),
    onChooseFolder: vi.fn(),
    onDropFiles: vi.fn(),
    onRemove: vi.fn(),
  });

  it('says what a book without a cover uses, and what a cover is', () => {
    render(
      inPortuguese(
        <BookCovers
          {...actions()}
          attached={[
            { slot: 2, name: '02.jpg', origin: 'folder' },
            { slot: 3, name: 'minha.png', origin: 'chosen' },
          ]}
          books={[
            { slot: 1, title: 'Série - Vol.1' },
            { slot: 2, title: 'Série - Vol.2' },
            { slot: 3, title: 'Série - Vol.3' },
          ]}
        />,
      ),
    );

    expect(screen.getByRole('heading', { name: 'Capas' })).toBeVisible();
    expect(screen.getByText(/Um livro sem capa própria usa a primeira página\./u)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Adicionar capas de uma pasta…' })).toBeVisible();
    const list = screen.getByRole('list', { name: 'Livros e suas capas' });
    expect(within(list).getByText('Primeira página')).toBeVisible();
    expect(within(list).getByText('02.jpg · de uma pasta')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Escolher uma capa para Série - Vol.1' }),
    ).toHaveTextContent('Escolher capa…');
    expect(
      screen.getByRole('button', { name: 'Trocar a capa de Série - Vol.2' }),
    ).toHaveTextContent('Trocar…');
    expect(screen.getByRole('button', { name: 'Remover a capa de Série - Vol.3' })).toBeVisible();
  });

  it('says what a series with no volumes yet says, and what the last change left to say', () => {
    const { rerender } = render(
      inPortuguese(<BookCovers {...actions()} attached={[]} books={[]} />),
    );
    expect(
      screen.getByText('Quando os volumes forem definidos, cada um poderá ter uma capa.'),
    ).toBeVisible();

    rerender(
      inPortuguese(
        <BookCovers
          {...actions()}
          attached={[]}
          books={[{ slot: 'book', title: 'Livro' }]}
          note={[
            message('covers.kept', { count: 1 }),
            message('covers.unused', { count: 2, books: 3 }),
          ]}
        />,
      ),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      '1 livro mantém a capa escolhida para ele. 2 imagens não foram usadas: há 3 livros.',
    );
  });
});

describe('the lookup of an author, in Portuguese', () => {
  const lookup = {
    providers: [mangaDex],
    selectedId: undefined as string | undefined,
    onSelect: vi.fn(),
    onOpenHomepage: vi.fn(),
    onSearch: vi.fn(() =>
      Promise.resolve([
        { id: 'a', title: 'Chainsaw Man', provider: 'mangadex', authors: ['Fujimoto'], year: 2018 },
        { id: 'b', title: 'Chainsaw Man (spin-off)', provider: 'mangadex' },
      ]),
    ),
  };

  it('says how to pick a source, what a search sends and what it found', async () => {
    const user = userEvent.setup();
    const onUse = vi.fn();
    const { rerender } = render(
      inPortuguese(
        <AuthorLookupPanel id="lookup" lookup={lookup} onUse={onUse} title="Chainsaw Man" />,
      ),
    );
    expect(
      screen.getByText(
        'Escolha uma fonte para consultar quem escreveu a obra. Nada é enviado a lugar nenhum até você buscar.',
      ),
    ).toBeVisible();

    rerender(
      inPortuguese(
        <AuthorLookupPanel
          id="lookup"
          lookup={{ ...lookup, selectedId: 'mangadex' }}
          onUse={onUse}
          title="Chainsaw Man"
        />,
      ),
    );
    expect(screen.getByText('Dados de autor de')).toBeVisible();
    expect(
      screen.getByText(
        'Vai buscar “Chainsaw Man” em MangaDex. Só nomes de autores e anos são usados, e nada é baixado de lá.',
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    const matches = await screen.findByRole('list', { name: 'Resultados' });
    expect(within(matches).getByText('Fujimoto · 2018')).toBeVisible();
    expect(within(matches).getByText('Nenhum autor informado')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Usar Fujimoto de Chainsaw Man' }));
    expect(onUse).toHaveBeenCalledWith('Fujimoto');
  });

  it('says the failure of a search that came as a code', async () => {
    const user = userEvent.setup();
    const { SaidError } = await import('@/renderer/lib/said-error');
    render(
      inPortuguese(
        <AuthorLookupPanel
          id="lookup"
          lookup={{
            ...lookup,
            selectedId: 'mangadex',
            onSearch: () => Promise.reject(new SaidError(raw('MangaDex não respondeu.'))),
          }}
          onUse={vi.fn()}
          title="Chainsaw Man"
        />,
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Buscar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('MangaDex não respondeu.');
  });
});

describe('the pages of the conversion options, in Portuguese', () => {
  const profiles = [
    {
      code: 'KPW6',
      name: 'Kindle Paperwhite 6',
      width: 1272,
      height: 1696,
      grayLevels: 16,
      family: 'kindle',
    },
  ];

  it('says what the options of the queue are for, and how many items have their own', async () => {
    const user = userEvent.setup();
    const onClearItemOptions = vi.fn();
    render(
      inPortuguese(
        <ConversionOptionsScreen
          format="epub"
          itemsWithOptions={3}
          onBack={vi.fn()}
          onClearItemOptions={onClearItemOptions}
          onFormat={vi.fn()}
          onNotify={vi.fn()}
          onReset={vi.fn()}
          onSettings={vi.fn()}
          profiles={profiles}
          settings={defaultMangapressSettings}
          singleBook={false}
        />,
      ),
    );

    expect(screen.getByRole('heading', { name: 'Opções de conversão' })).toHaveFocus();
    expect(screen.getByRole('button', { name: 'Voltar' })).toBeVisible();
    expect(screen.getAllByText('Avançado').length).toBeGreaterThan(0);
    expect(screen.getByText(/Suas escolhas ficam guardadas para a próxima vez\./u)).toBeVisible();
    const group = screen.getByRole('group', { name: 'Itens com opções próprias' });
    expect(group).toHaveTextContent('3 itens da fila são convertidos com opções próprias.');
    expect(group).toHaveTextContent('Eles mantêm o que definiram');

    await user.click(screen.getByRole('button', { name: 'Usar as opções da fila em todos' }));
    expect(onClearItemOptions).toHaveBeenCalledOnce();
  });

  it('says that the items follow the queue again, in the singular and the plural', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      inPortuguese(<ItemsWithOptionsNotice count={1} onClear={vi.fn()} />),
    );
    expect(screen.getByRole('group', { name: 'Itens com opções próprias' })).toHaveTextContent(
      '1 item da fila é convertido com opções próprias.',
    );

    await user.click(screen.getByRole('button', { name: 'Usar as opções da fila em todos' }));
    rerender(inPortuguese(<ItemsWithOptionsNotice count={0} onClear={vi.fn()} />));
    expect(screen.getByRole('status')).toHaveTextContent('1 item agora segue as opções da fila.');
  });

  it('says that an item has its own options or follows the queue, and names the page for it', () => {
    const { rerender } = render(
      inPortuguese(
        <ItemOptionsScreen
          backLabel="Fila"
          format="epub"
          hasOwnOptions={false}
          name="Chainsaw Man"
          onBack={vi.fn()}
          onChange={vi.fn()}
          onNotify={vi.fn()}
          onUseQueueOptions={vi.fn()}
          profiles={profiles}
          queue={{ settings: defaultMangapressSettings, format: 'epub' }}
          settings={defaultMangapressSettings}
          singleBook={false}
        />,
      ),
    );

    expect(screen.getByText('Avançado · só este item')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Opções de Chainsaw Man' })).toHaveFocus();
    expect(screen.getByText('Este item usa as opções da fila.')).toBeVisible();
    expect(screen.getByRole('button', { name: /Usar as opções da fila/u })).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    rerender(
      inPortuguese(
        <ItemOptionsScreen
          backLabel="Fila"
          format="epub"
          hasOwnOptions
          name="Chainsaw Man"
          onBack={vi.fn()}
          onChange={vi.fn()}
          onNotify={vi.fn()}
          onUseQueueOptions={vi.fn()}
          profiles={profiles}
          queue={{ settings: defaultMangapressSettings, format: 'epub' }}
          settings={defaultMangapressSettings}
          singleBook={false}
        />,
      ),
    );
    expect(screen.getByText('Este item tem opções próprias.')).toBeVisible();
  });
});
