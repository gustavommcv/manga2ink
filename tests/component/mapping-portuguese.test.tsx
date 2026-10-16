import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createMappingDraft } from '@/domain/mapping';
import { message, raw } from '@/domain/message';
import { ChaptersFrom } from '@/renderer/components/mapping/chapters-from';
import { MappingEditor } from '@/renderer/components/mapping/mapping-editor';
import { ProviderPicker } from '@/renderer/components/mapping/provider-picker';
import { NoMatchesNotice } from '@/renderer/components/shared/no-matches-notice';
import { SaidError } from '@/renderer/lib/said-error';
import type { MetadataProviderDescriptor } from '@/shared/workflow-contract';

import { inPortuguese } from './support/i18n';

const chapters = [
  { id: 'c1', name: 'Capítulo 1', path: '1.cbz', pageCount: 20, chapter: 1 },
  { id: 'c2', name: 'Capítulo 2', path: '2.cbz', pageCount: 1, chapter: 2 },
  { id: 'c3', name: 'Capítulo 3', path: '3.cbz', pageCount: 24, chapter: 3 },
] as const;

const mangaDex: MetadataProviderDescriptor = {
  id: 'mangadex',
  displayName: 'MangaDex',
  homepage: 'https://mangadex.org',
  description: 'Community catalogue of manga',
};

const manual = createMappingDraft({ mangaTitle: 'Chainsaw Man', chapters });

describe('the editor of the mapping, in Portuguese', () => {
  it('says what it is, where the grouping came from and what to do, in the words of the language', () => {
    render(inPortuguese(<MappingEditor initialDraft={manual} onConfirm={vi.fn()} />));

    expect(
      screen.getByRole('heading', { name: 'Organizar Chainsaw Man em volumes' }),
    ).toHaveFocus();
    expect(screen.getByText('Mapeamento de capítulos')).toBeVisible();
    expect(screen.getByText('Mapeamento manual · Offline')).toBeVisible();
    expect(
      screen.getByText(/Selecione capítulos, atribua-os a um volume e resolva os conflitos/u),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Desfazer a última edição do mapeamento' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Refazer a última edição do mapeamento' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Desfazer todas as edições do mapeamento' }),
    ).toBeDisabled();
  });

  it('names a manga that has no title, and the origin of a suggestion by the source', () => {
    render(
      inPortuguese(
        <MappingEditor
          initialDraft={createMappingDraft({
            mangaTitle: '',
            chapters,
            source: { provider: 'mangadex', id: 'work' },
          })}
          metadataProviders={[mangaDex]}
          onSearchMetadata={() => Promise.resolve([])}
          onSuggestVolumes={() => Promise.resolve({ volumes: [] })}
        />,
      ),
    );

    expect(
      screen.getByRole('heading', { name: 'Organizar mangá sem título em volumes' }),
    ).toBeVisible();
    expect(screen.getByText('Sugerido por MangaDex')).toBeVisible();
  });

  it('says the chapters, the pages, the selection and the volume of each, with the plural of the language', async () => {
    const user = userEvent.setup();
    render(inPortuguese(<MappingEditor initialDraft={manual} onConfirm={vi.fn()} />));

    expect(screen.getByRole('heading', { name: 'Capítulos' })).toBeVisible();
    expect(screen.getByText('0 de 3 selecionados')).toBeVisible();
    expect(screen.getByText('1 página')).toBeVisible();
    expect(screen.getByText('20 páginas')).toBeVisible();
    expect(screen.getAllByText('Sem volume')).toHaveLength(3);

    await user.click(screen.getByRole('checkbox', { name: 'Selecionar Capítulo 1' }));
    expect(screen.getByText('1 de 3 selecionado')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Selecionar tudo' }));
    expect(screen.getByText('3 de 3 selecionados')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Limpar a seleção' })).toBeVisible();
  });

  it('builds a volume and moves the chapters into it, saying each step in Portuguese', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(inPortuguese(<MappingEditor initialDraft={manual} onConfirm={onConfirm} />));

    expect(screen.getByRole('button', { name: 'Criar o primeiro volume' })).toHaveTextContent(
      'Criar o volume 1',
    );
    expect(screen.getByText('Ainda não há volumes.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Criar o primeiro volume' }));
    await user.click(screen.getByRole('button', { name: 'Selecionar tudo' }));
    await user.click(screen.getByRole('button', { name: 'Atribuir selecionados' }));

    expect(screen.getByText('1 criado')).toBeVisible();
    expect(screen.getByText('3 capítulos')).toBeVisible();
    expect(screen.getAllByText('Volume 1').length).toBeGreaterThan(0);
    expect(screen.getByText('Todos os capítulos estão prontos para agrupar.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Confirmar mapeamento' }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByText('Mapeamento confirmado.')).toBeVisible();
  });

  it('says what an edit that was refused says, from the code, and what is to be fixed', async () => {
    const user = userEvent.setup();
    render(inPortuguese(<MappingEditor initialDraft={manual} onConfirm={vi.fn()} />));
    await user.click(screen.getByRole('button', { name: 'Criar o primeiro volume' }));

    await user.clear(screen.getByRole('textbox', { name: 'Número do novo volume' }));
    await user.type(screen.getByRole('textbox', { name: 'Número do novo volume' }), 'abc');
    await user.click(screen.getByRole('button', { name: 'Adicionar volume' }));

    expect(screen.getByText('Número de volume inválido: abc')).toBeVisible();

    const warnings = screen.getByRole('group', { name: 'Avisos do mapeamento' });
    expect(within(warnings).getByText('Confira estes capítulos')).toBeVisible();
    expect(
      within(warnings).getByText('3 capítulos não estão atribuídos a um volume.'),
    ).toBeVisible();
    expect(screen.getByRole('alert', { name: 'Erros do mapeamento' })).toHaveTextContent(
      'Corrija antes de continuar',
    );
    expect(screen.getByRole('alert', { name: 'Erros do mapeamento' })).toHaveTextContent(
      'O volume 1 não tem capítulos.',
    );
  });

  it('says a volume refused to be split or merged, and the buttons of a volume with chapters', async () => {
    const user = userEvent.setup();
    render(
      inPortuguese(
        <MappingEditor
          initialDraft={createMappingDraft({
            mangaTitle: 'Chainsaw Man',
            chapters,
            volumes: [
              { id: 'v1', number: '1', chapterIds: ['c1', 'c2'] },
              { id: 'v2', number: '2', chapterIds: ['c3'] },
            ],
          })}
          onConfirm={vi.fn()}
          startedFrom="mangabind"
        />,
      ),
    );

    expect(screen.getByText('Agrupado pelo mangabind · Offline')).toBeVisible();
    expect(screen.getByText('Mapeamento de capítulos proposto')).toBeVisible();
    expect(screen.getByText('2 volumes · 3 de 3 capítulos atribuídos')).toBeVisible();
    expect(
      screen.getByText('2 capítulos · primeiro: Capítulo 1 · último: Capítulo 2'),
    ).toBeVisible();
    expect(screen.getByText('1 capítulo · Capítulo 3')).toBeVisible();
    expect(screen.getByText('Revise esta proposta antes de continuar.')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Editar o mapeamento' }));

    expect(screen.getByRole('button', { name: 'Dividir o volume 1' })).toBeVisible();
    expect(screen.getByLabelText('Dividir antes de')).toBeVisible();
    expect(
      screen.getByText('Este capítulo e todos os seguintes passam para um novo volume.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Remover o volume 2' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Juntar ao volume 1' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mostrar o resumo do mapeamento' })).toBeVisible();
  });

  it('says it could not be saved with the reason that came as a code, and without one when it did not', async () => {
    const user = userEvent.setup();
    const onConfirm = vi
      .fn()
      .mockImplementationOnce(() => {
        throw new SaidError(message('workflow.mappingNotSaved', {}));
      })
      .mockImplementationOnce(() => {
        throw new Error('The folder is read-only.');
      });
    render(
      inPortuguese(
        <MappingEditor
          initialDraft={createMappingDraft({
            mangaTitle: 'Chainsaw Man',
            chapters,
            volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2', 'c3'] }],
          })}
          onConfirm={onConfirm}
          startedFrom="mangabind"
        />,
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Confirmar mapeamento' }));
    expect(
      screen.getByText(/Não foi possível salvar o mangabind\.json na pasta de origem/u),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Confirmar mapeamento' }));
    expect(screen.getByText('Não foi possível guardar o mapeamento.')).toBeVisible();
  });

  it('explains the single book and skipping the grouping, quoting the control it cannot offer', () => {
    render(
      inPortuguese(
        <MappingEditor
          initialDraft={manual}
          onConfirm={vi.fn()}
          onSkipGrouping={vi.fn()}
          singleBook
        />,
      ),
    );

    expect(screen.getByRole('status', { name: 'Um livro para a série' })).toHaveTextContent(
      'Os volumes mapeados serão as entradas de primeiro nível do sumário do EPUB único',
    );
    expect(screen.getByRole('button', { name: 'Pular o agrupamento' })).toBeDisabled();
    expect(
      screen.getByText('O modo de livro único exige agrupar os capítulos em volumes.'),
    ).toBeVisible();
  });
});

describe('where the chapters come from, in Portuguese', () => {
  const online = {
    providers: [mangaDex],
    selectedId: undefined,
    onSelect: vi.fn(),
    onOpenHomepage: vi.fn(),
    mangaTitle: 'Chainsaw Man',
    language: 'ja',
    onSearch: () => Promise.resolve([]),
    onSuggest: () => Promise.resolve({ volumes: [] }),
    onApply: vi.fn(),
  };

  it('names the tabs, and says what the names gave or that they gave nothing', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      inPortuguese(
        <ChaptersFrom
          names={{ volumes: 2, chapters: 8, changed: false, onStartOver: vi.fn() }}
          online={online}
        />,
      ),
    );

    const tabs = screen.getByRole('tablist', { name: 'Capítulos vindos de' });
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Nomes dos arquivos', 'Fonte online', 'Manual']);
    expect(
      screen.getByText('2 volumes foram lidos dos nomes de 8 capítulos, sem usar a internet.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /Recomeçar a partir dos nomes/u })).toBeDisabled();

    rerender(
      inPortuguese(
        <ChaptersFrom names={{ volumes: 1, chapters: 1, changed: false, onStartOver: vi.fn() }} />,
      ),
    );
    expect(
      screen.getByText('1 volume foi lido dos nomes de 1 capítulo, sem usar a internet.'),
    ).toBeVisible();

    rerender(
      inPortuguese(
        <ChaptersFrom
          names={{ volumes: 0, chapters: 3, changed: false, onStartOver: vi.fn() }}
          online={online}
        />,
      ),
    );
    expect(
      screen.getByText(
        'Não há agrupamento pelos nomes dos arquivos aqui. Use uma fonte online ou agrupe os capítulos você mesmo.',
      ),
    ).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Manual' }));
    expect(screen.getByText(/Selecione capítulos ou um intervalo/u)).toBeVisible();
  });

  it('quotes the tab by its name in Portuguese, when it tells where else to look', async () => {
    const user = userEvent.setup();
    render(
      inPortuguese(
        <ChaptersFrom
          missingNamesGrouping
          names={{ volumes: 0, chapters: 3, changed: false, onStartOver: vi.fn() }}
          online={online}
        />,
      ),
    );

    await user.click(screen.getByRole('tab', { name: 'Manual' }));

    const notice = screen.getByRole('status', {
      name: 'Nenhum volume encontrado nos nomes dos arquivos',
    });
    expect(notice).toHaveTextContent(
      'Monte-os aqui, ou experimente Fonte online para receber uma sugestão. Nada é buscado automaticamente.',
    );
  });

  it('says how to pick a source, what a search sends and where the volumes are looked up', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      inPortuguese(
        <ChaptersFrom
          initialSource="online"
          names={{ volumes: 0, chapters: 3, changed: false, onStartOver: vi.fn() }}
          online={online}
        />,
      ),
    );

    expect(screen.getByText(/Escolha uma fonte para consultar quais capítulos/u)).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Fonte' })).toHaveTextContent('Escolher uma fonte');

    rerender(
      inPortuguese(
        <ChaptersFrom
          initialSource="online"
          names={{ volumes: 0, chapters: 3, changed: false, onStartOver: vi.fn() }}
          online={{ ...online, selectedId: 'mangadex' }}
        />,
      ),
    );

    expect(screen.getByText('Dados de volumes de')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Abrir MangaDex no navegador' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Buscar em MangaDex' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Buscar' })).toBeEnabled();
    expect(
      screen.getByText(
        /Buscar envia o título para MangaDex\. Só os números de volumes e de capítulos são usados, e nada é baixado de lá\. Os volumes são procurados em ja, o idioma das suas pastas\./u,
      ),
    ).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByRole('status', { name: 'Nenhum resultado' })).toHaveTextContent(
      'Nenhum resultado para “Chainsaw Man”. Caracteres a mais na busca podem impedir que uma obra seja encontrada. Tente palavras mais simples acima e busque de novo.',
    );
  });

  it('says what a failed search says, from the code that came, or the fallback of the language', async () => {
    const user = userEvent.setup();
    const search = vi
      .fn()
      .mockRejectedValueOnce(new SaidError(raw('MangaDex não respondeu.')))
      .mockRejectedValueOnce(new Error('offline'));
    render(
      inPortuguese(
        <ChaptersFrom
          initialSource="online"
          names={{ volumes: 0, chapters: 3, changed: false, onStartOver: vi.fn() }}
          online={{ ...online, selectedId: 'mangadex', onSearch: search }}
        />,
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('MangaDex não respondeu.');

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByText('Não foi possível concluir a busca.')).toBeVisible();
  });
});

describe('the list of sources and the notice of no matches, in Portuguese', () => {
  it('opens a list whose first entry is for using no source, with its detail', async () => {
    const user = userEvent.setup();
    render(
      inPortuguese(
        <ProviderPicker onSelect={vi.fn()} providers={[mangaDex]} selectedId={undefined} />,
      ),
    );

    await user.click(screen.getByRole('combobox', { name: 'Fonte' }));

    const list = screen.getByRole('listbox', { name: 'Fonte' });
    expect(within(list).getByText('Nenhuma fonte online')).toBeVisible();
    expect(within(list).getByText('Só os nomes das pastas e as suas edições')).toBeVisible();
  });

  it('keeps the name and the detail a caller gives, whatever the language', () => {
    render(
      inPortuguese(
        <ProviderPicker
          label="Origem"
          noneDetail="Só o que você digitar"
          onSelect={vi.fn()}
          providers={[]}
          selectedId={undefined}
        />,
      ),
    );

    expect(screen.getByRole('combobox', { name: 'Origem' })).toBeVisible();
  });

  it.each([
    [
      'title',
      'Nenhum resultado para “Work (2)”. Caracteres a mais no título podem impedir que uma obra seja encontrada. Tente um título mais simples acima e busque de novo.',
    ],
    [
      'search',
      'Nenhum resultado para “Work (2)”. Caracteres a mais na busca podem impedir que uma obra seja encontrada. Tente palavras mais simples acima e busque de novo.',
    ],
  ] as const)('says where to change what was searched, for the %s', (fix, text) => {
    render(inPortuguese(<NoMatchesNotice fix={fix} query="Work (2)" />));

    expect(screen.getByRole('status', { name: 'Nenhum resultado' })).toHaveTextContent(text);
  });
});
