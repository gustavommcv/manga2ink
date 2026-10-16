import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { QueueRow } from '@/domain/input-queue';
import { createMappingDraft } from '@/domain/mapping';
import { defaultMangapressSettings } from '@/domain/output-profile';
import { ResetOptions } from '@/renderer/components/settings/reset-options';
import { SettingFieldHeader } from '@/renderer/components/settings/setting-field-header';
import { Notices } from '@/renderer/components/shared/notices';
import { QueueScreen, type QueueScreenProps } from '@/renderer/screens/queue-screen';

import { inPortuguese } from './support/i18n';
import { message, raw } from '@/domain/message';

const chapters = [
  { id: 'c1', name: 'Chapter 1', path: '/m/1', pageCount: 24, chapter: 1 },
  { id: 'c2', name: 'Chapter 2', path: '/m/2', pageCount: 22, chapter: 2 },
] as const;

const folderRow: QueueRow = {
  id: 'a',
  kind: 'folder',
  displayName: 'Chainsaw Man',
  displayPath: 'D:\\Manga\\Chainsaw Man',
  state: 'inspected',
  sessionId: 'session-a',
  mapping: createMappingDraft({
    mangaTitle: 'Chainsaw Man',
    chapters,
    volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
  }),
  confirmed: false,
};

const libraryRow: QueueRow = {
  id: 'lib',
  kind: 'library',
  displayName: 'Manga Library',
  displayPath: 'D:\\Manga\\Manga Library',
  state: 'inspected',
  sessionId: 'session-lib',
  confirmed: false,
  titles: [],
};

function props(overrides: Partial<QueueScreenProps> = {}): QueueScreenProps {
  return {
    disabled: false,
    format: 'cbz',
    mode: 'bind-and-convert',
    onAddFiles: vi.fn(),
    onAddFolders: vi.fn(),
    onClear: vi.fn(),
    onConvert: vi.fn(),
    onDeviceProfile: vi.fn(),
    onDismissRejected: vi.fn(),
    onDropFiles: vi.fn(),
    onEdit: vi.fn(),
    onEditDetails: vi.fn(),
    onEditOptions: vi.fn(),
    onFormat: vi.fn(),
    onMode: vi.fn(),
    onOpenOptions: vi.fn(),
    onRemove: vi.fn(),
    onReset: vi.fn(),
    onSingleBook: vi.fn(),
    onValidate: vi.fn(),
    profiles: [
      {
        code: 'KPW6',
        name: 'Kindle Paperwhite 6',
        width: 1272,
        height: 1696,
        grayLevels: 16,
        family: 'kindle',
      },
    ],
    rejected: [],
    rows: [],
    settings: defaultMangapressSettings,
    singleBook: false,
    validating: false,
    ...overrides,
  };
}

describe('the queue screen in Portuguese', () => {
  it('writes its heading, its buttons and the invitation to add something', () => {
    render(inPortuguese(<QueueScreen {...props()} />));

    expect(screen.getByRole('heading', { name: 'Fila' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Arquivos' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Pasta' })).toBeVisible();
    expect(
      screen.getByRole('button', {
        name: 'Solte aqui pastas de mangá, bibliotecas ou arquivos .cbz, ou clique para escolher.',
      }),
    ).toBeVisible();
    expect(screen.getByText(/Pastas agrupam os capítulos em volumes/u)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
  });

  it('offers the two choices of the area in Portuguese', async () => {
    const user = userEvent.setup();
    render(inPortuguese(<QueueScreen {...props()} />));

    await user.click(screen.getByTestId('drop-target'));

    const menu = await screen.findByRole('menu');
    expect(within(menu).getByRole('menuitem', { name: 'Escolher arquivos' })).toBeVisible();
    expect(within(menu).getByRole('menuitem', { name: 'Escolher uma pasta' })).toBeVisible();
  });

  it('writes the panel of conversion options: the steps, the device, the format and the buttons', () => {
    render(inPortuguese(<QueueScreen {...props()} />));

    const panel = screen.getByRole('complementary', { name: 'Opções de conversão' });
    expect(within(panel).getByText('Etapas')).toBeVisible();
    expect(
      within(panel).getByRole('checkbox', { name: 'Agrupar capítulos em volumes' }),
    ).toBeChecked();
    expect(within(panel).getByRole('checkbox', { name: 'Converter para e-reader' })).toBeChecked();
    expect(
      within(panel).getByRole('checkbox', { name: 'Criar um livro para a série' }),
    ).not.toBeChecked();
    expect(
      screen.getByText('Gera um único EPUB com volumes e capítulos no sumário.'),
    ).toBeVisible();
    expect(within(panel).getByRole('combobox', { name: 'Dispositivo' })).toBeVisible();
    expect(within(panel).getByRole('radiogroup', { name: 'Formato' })).toBeVisible();
    expect(
      within(panel).getByRole('button', { name: 'Opções avançadas de conversão' }),
    ).toBeVisible();
    expect(within(panel).getByRole('button', { name: 'Processar' })).toBeDisabled();
    expect(within(panel).getByRole('button', { name: 'Validar plano' })).toBeDisabled();
  });

  it('says why a step cannot be turned off, in Portuguese', async () => {
    const user = userEvent.setup();
    render(inPortuguese(<QueueScreen {...props({ mode: 'convert-only', rows: [folderRow] })} />));

    await user.click(screen.getByRole('checkbox', { name: 'Agrupar capítulos em volumes' }));

    // Only one step is on, and the other cannot be turned off: it says so.
    expect(screen.getByText('Mantenha pelo menos uma etapa ligada.')).toBeVisible();
  });

  it('counts the items it will run, and says what is left out', () => {
    render(
      inPortuguese(
        <QueueScreen {...props({ rows: [folderRow, { ...libraryRow, titles: [] }] })} />,
      ),
    );

    expect(screen.getByRole('button', { name: 'Processar 1 item' })).toBeEnabled();
    expect(
      screen.getByText('1 item ficará de fora. Use o lápis na linha para corrigir.'),
    ).toBeVisible();
  });

  it('names the buttons of a row after the item, and the list of items', () => {
    render(inPortuguese(<QueueScreen {...props({ rows: [folderRow] })} />));

    const list = screen.getByRole('list', { name: 'Itens na fila' });
    expect(
      within(list).getByRole('button', { name: 'Editar os volumes de Chainsaw Man' }),
    ).toBeVisible();
    expect(
      within(list).getByRole('button', { name: 'Editar os detalhes de Chainsaw Man' }),
    ).toBeVisible();
    expect(
      within(list).getByRole('button', {
        name: 'Editar as opções de conversão de Chainsaw Man',
      }),
    ).toBeVisible();
    expect(within(list).getByRole('button', { name: 'Remover Chainsaw Man' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Limpar' })).toBeVisible();
  });

  it('says what was not added, and lets the message be dismissed', () => {
    render(
      inPortuguese(
        <QueueScreen
          {...props({
            rejected: [{ name: 'notes.txt', reason: message('input.onlyFoldersAndCbz', {}) }],
          })}
        />,
      ),
    );

    const notice = screen
      .getAllByRole('status')
      .find((status) => status.textContent.includes('notes.txt'));
    expect(notice).toBeDefined();
    if (notice === undefined) return;
    expect(notice).toHaveTextContent(
      'notes.txt não foi adicionado. Só é possível adicionar pastas e arquivos .cbz.',
    );
    expect(within(notice).getByRole('button', { name: 'Dispensar esta mensagem' })).toBeVisible();
  });

  it('writes the plan that was validated, with the pages of each book', () => {
    render(
      inPortuguese(
        <QueueScreen
          {...props({
            plans: [
              {
                name: 'Chainsaw Man',
                plan: {
                  tool: 'mangabind',
                  title: 'Chainsaw Man',
                  message: message('plan.mangabind', { volumes: 2, shape: 'books' }),
                  books: [
                    { name: 'Chainsaw Man - Vol.01.cbz', pageCount: 46 },
                    { name: 'One shot.cbz', pageCount: 1 },
                  ],
                  issues: [],
                },
              },
            ],
          })}
        />,
      ),
    );

    expect(screen.getByRole('heading', { name: 'Plano validado' })).toBeVisible();
    expect(screen.getByText('Nenhum arquivo da biblioteca foi gravado.')).toBeVisible();
    expect(
      screen.getByText('mangabind validou 2 volumes · nenhum arquivo da biblioteca gravado'),
    ).toBeVisible();
    expect(screen.getByText('46 páginas')).toBeVisible();
    expect(screen.getByText('1 página')).toBeVisible();
  });

  it('names the one book a whole series is bound into, for the series', () => {
    render(
      inPortuguese(
        <QueueScreen
          {...props({
            plans: [
              {
                name: 'Chainsaw Man',
                plan: {
                  tool: 'mangabind',
                  title: 'Chainsaw Man',
                  message: message('plan.mangabind', { volumes: 11, shape: 'series' }),
                  books: [{ name: 'Chainsaw Man', pageCount: 1976, wholeSeries: true }],
                  issues: [],
                },
              },
            ],
          })}
        />,
      ),
    );

    expect(
      screen.getByText(
        'mangabind validou 11 volumes · um só livro para a série · nenhum arquivo da biblioteca gravado',
      ),
    ).toBeVisible();
    expect(screen.getByText('Um EPUB para Chainsaw Man')).toBeVisible();
    expect(screen.getByText('1976 páginas')).toBeVisible();
  });

  describe('the books that are ready', () => {
    const pendingRuns = [
      {
        libraryId: 'run-one',
        createdAt: Date.UTC(2026, 8, 28, 18, 30),
        artifacts: [
          { id: 'one', name: 'Vol.01.epub', bytes: 1, format: 'epub' as const, saved: false },
          { id: 'two', name: 'Vol.02.epub', bytes: 1, format: 'epub' as const, saved: false },
        ],
      },
    ];

    it('names them, with the date in Portuguese, and offers to view or delete them', () => {
      render(
        inPortuguese(
          <QueueScreen
            {...props({
              pendingRuns,
              onOpenPending: vi.fn(),
              onDeletePending: () => Promise.resolve(true),
            })}
          />,
        ),
      );

      const section = screen.getByRole('region', { name: 'Livros anteriores' });
      expect(within(section).getByRole('heading', { name: 'Livros prontos' })).toBeVisible();
      expect(within(section).getByText('Vol.01.epub e mais 1 livro')).toBeVisible();
      expect(within(section).getByText(/set\./u)).toBeVisible();
      expect(
        within(section).getByRole('button', { name: 'Ver os livros de Vol.01.epub' }),
      ).toBeVisible();
      expect(
        within(section).getByRole('button', { name: 'Apagar os livros pendentes de Vol.01.epub' }),
      ).toBeVisible();
    });

    it('asks before deleting them, in Portuguese', async () => {
      const user = userEvent.setup();
      render(
        inPortuguese(
          <QueueScreen
            {...props({
              pendingRuns,
              onOpenPending: vi.fn(),
              onDeletePending: () => Promise.resolve(true),
            })}
          />,
        ),
      );

      await user.click(
        screen.getByRole('button', { name: 'Apagar os livros pendentes de Vol.01.epub' }),
      );

      const question = screen.getByRole('group', {
        name: 'Confirmar a exclusão de Vol.01.epub',
      });
      expect(question).toHaveTextContent(
        'Apagar definitivamente os 2 livros pendentes desta conversão? Livros salvos em outro lugar não serão alterados.',
      );
      expect(within(question).getByRole('button', { name: 'Apagar livros' })).toBeVisible();
      expect(within(question).getByRole('button', { name: 'Cancelar' })).toBeVisible();
    });
  });
});

describe('what the queue says about each row, in Portuguese', () => {
  const cbzRow: QueueRow = {
    id: 'c',
    kind: 'cbz',
    displayName: 'Vagabond Vol.03.cbz',
    displayPath: '/manga/Vagabond Vol.03.cbz',
    state: 'inspected',
    sessionId: 'session-c',
    confirmed: false,
  };
  const unreadableRow: QueueRow = {
    id: 'u',
    kind: 'cbz',
    displayName: 'Broken.cbz',
    displayPath: '/manga/Broken.cbz',
    state: 'unreadable',
    message: raw('The file could not be read.'),
  };
  const needsVolumes: QueueRow = {
    ...folderRow,
    id: 'n',
    displayName: 'Random scans',
    mapping: createMappingDraft({ mangaTitle: 'Random scans', chapters }),
  };

  function rowOf(name: string): HTMLElement {
    const item = screen.getByText(name).closest('li');
    expect(item).not.toBeNull();
    return item as HTMLElement;
  }

  it('writes the status and the line under the name of a folder that is grouped', () => {
    render(inPortuguese(<QueueScreen {...props({ rows: [folderRow] })} />));

    const row = rowOf('Chainsaw Man');
    expect(within(row).getByText('1 volume')).toBeVisible();
    expect(within(row).getByText('Pasta · 2 capítulos')).toBeVisible();
  });

  it('writes what to do about a folder that has no volumes yet', () => {
    render(inPortuguese(<QueueScreen {...props({ rows: [needsVolumes] })} />));

    const row = rowOf('Random scans');
    expect(within(row).getByText('Precisa de volumes')).toBeVisible();
    expect(
      within(row).getByText('Ainda não há volumes. Abra Editar volumes para agrupar os capítulos.'),
    ).toBeVisible();
  });

  it('writes a CBZ that goes straight to the e-reader step, and one that has nothing to join', () => {
    const { rerender } = render(inPortuguese(<QueueScreen {...props({ rows: [cbzRow] })} />));
    expect(
      within(rowOf('Vagabond Vol.03.cbz')).getByText('CBZ · vai direto para a etapa do e-reader'),
    ).toBeVisible();
    expect(within(rowOf('Vagabond Vol.03.cbz')).getByText('Pronto')).toBeVisible();

    rerender(inPortuguese(<QueueScreen {...props({ rows: [cbzRow], mode: 'bind-only' })} />));

    const row = rowOf('Vagabond Vol.03.cbz');
    expect(within(row).getByText('Nada para juntar')).toBeVisible();
    expect(
      within(row).getByText('Um CBZ já é um volume só, então não há o que juntar.'),
    ).toBeVisible();
  });

  it('says why a row could not be read in the words of whoever said it, which are not translated', () => {
    render(inPortuguese(<QueueScreen {...props({ rows: [unreadableRow] })} />));

    const row = rowOf('Broken.cbz');
    expect(within(row).getByText('Não foi possível ler')).toBeVisible();
    expect(within(row).getByText('The file could not be read.')).toBeVisible();
  });

  it('writes what a library says when it is not grouped', () => {
    const library: QueueRow = {
      ...libraryRow,
      titles: [
        {
          title: 'Good Manga',
          draft: createMappingDraft({
            mangaTitle: 'Good Manga',
            chapters,
            volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
          }),
          volumes: [{ name: 'Good Manga - Vol.01.cbz', pageCount: 4 }],
        },
      ],
    };
    render(inPortuguese(<QueueScreen {...props({ rows: [library], mode: 'convert-only' })} />));

    const row = rowOf('Manga Library');
    expect(within(row).getByText('Precisa agrupar')).toBeVisible();
    expect(
      within(row).getByText(
        'Uma biblioteca é agrupada título por título primeiro, então não dá para pular a junção dos volumes.',
      ),
    ).toBeVisible();
  });

  it('writes the reason a step cannot be turned off, quoting the control by its Portuguese name', () => {
    render(
      inPortuguese(
        <QueueScreen {...props({ rows: [folderRow], format: 'epub', singleBook: true })} />,
      ),
    );

    expect(
      screen.getAllByText('Desligue “Criar um livro para a série” para mudar isto.'),
    ).not.toHaveLength(0);
  });

  it('writes the reason of a step that a CBZ does not allow', () => {
    render(inPortuguese(<QueueScreen {...props({ rows: [cbzRow] })} />));

    expect(
      screen.getAllByText('Um CBZ já é um volume só, então não há o que juntar.').length,
    ).toBeGreaterThan(0);
  });
});

describe('the controls the conversion options share, in Portuguese', () => {
  it('writes what a reset asks, and says it is done', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(inPortuguese(<ResetOptions changed onReset={onReset} scope="queue" />));

    await user.click(screen.getByRole('button', { name: 'Restaurar padrões' }));

    const question = screen.getByRole('group', { name: 'Confirmar a restauração' });
    expect(question).toHaveTextContent(
      'Voltar as etapas, o dispositivo, o formato e todas as opções do mangapress aos padrões?',
    );
    await user.click(within(question).getByRole('button', { name: 'Restaurar' }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.getByRole('status')).toHaveTextContent('Todas as opções voltaram ao padrão.');
  });

  it('says why a reset that is dimmed does nothing', () => {
    render(inPortuguese(<ResetOptions changed={false} onReset={vi.fn()} scope="options" />));

    expect(screen.getByRole('button', { name: 'Restaurar padrões' })).toHaveAccessibleDescription(
      'Todas as opções já estão no padrão.',
    );
  });

  it('names the action of a changed option after the option, and says when it is optional', () => {
    render(
      inPortuguese(
        <>
          <SettingFieldHeader changed id="device" label="Dispositivo" onReset={vi.fn()} optional />
          <SettingFieldHeader
            changed
            id="other"
            label="Conteúdo"
            onReset={vi.fn()}
            resetsTo="queue"
          />
        </>,
      ),
    );

    expect(screen.getByRole('button', { name: 'Restaurar o padrão de Dispositivo' })).toBeVisible();
    expect(screen.getByText('(opcional)')).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Usar o valor da fila para Conteúdo' }),
    ).toBeVisible();
  });

  it('names the notices, and the button that dismisses them', () => {
    render(inPortuguese(<Notices notices={['Um aviso.']} onDismiss={vi.fn()} />));

    expect(screen.getByRole('status', { name: 'Avisos' })).toHaveTextContent('Um aviso.');
    expect(screen.getByRole('button', { name: 'Dispensar estes avisos' })).toBeVisible();
  });
});
