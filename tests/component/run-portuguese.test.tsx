import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ConversionProgress } from '@/domain/conversion';
import { message, raw } from '@/domain/message';
import { App } from '@/renderer/app';
import { formatBytes, ResultsScreen, type RunOutcome } from '@/renderer/screens/results-screen';
import { RunningScreen } from '@/renderer/screens/running-screen';

import { inPortuguese } from './support/i18n';
import { bridge, installBridge } from './support/workflow';

afterEach(() => {
  Reflect.deleteProperty(window, 'mangabound');
});

const progress: ConversionProgress = {
  stage: 'processing',
  message: message('progress.volumesConverted', { done: 1, total: 3 }),
  completed: 1.5,
  total: 3,
  volumes: [
    { number: 1, status: 'done', completed: 20, total: 20 },
    { number: 2, status: 'processing', completed: 10, total: 20 },
    { number: 3, status: 'waiting' },
  ],
};

describe('the screen of a conversion going on, in Portuguese', () => {
  it('says the item, the heading, what the run is doing and how far it is', () => {
    render(
      inPortuguese(
        <RunningScreen
          onCancel={vi.fn()}
          position={{ name: 'Chainsaw Man', index: 2, total: 5 }}
          progress={progress}
        />,
      ),
    );

    expect(screen.getByText('Item 2 de 5')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Convertendo Chainsaw Man' })).toBeVisible();
    expect(screen.getByText('1 de 3 volumes convertidos.')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: '50% concluído' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancelar conversão' })).toBeVisible();
  });

  it('names the stage when no item is counted, and the books when none is named', () => {
    const { rerender } = render(inPortuguese(<RunningScreen onCancel={vi.fn()} />));
    expect(screen.getByText('Processando')).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Convertendo seus livros' })).toBeVisible();

    rerender(
      inPortuguese(
        <RunningScreen
          onCancel={vi.fn()}
          progress={{
            stage: 'binding',
            message: message('progress.buildingVolume', { volume: 1, volumes: 2 }),
            bindingState: 'advanced',
            completed: 4,
            total: 4,
          }}
        />,
      ),
    );
    expect(screen.getByText('Montando volumes')).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Montando os arquivos de volume de seus livros' }),
    ).toBeVisible();
    expect(screen.getByText('Montando o volume 1 de 2…')).toBeVisible();
    expect(screen.getByText('4 de 4 páginas copiadas')).toBeVisible();
    expect(screen.getByRole('progressbar', { name: '99% concluído' })).toBeVisible();

    rerender(
      inPortuguese(
        <RunningScreen
          onCancel={vi.fn()}
          progress={{ stage: 'saving', message: message('progress.savingBook', {}) }}
        />,
      ),
    );
    expect(screen.getByText('Salvando')).toBeVisible();
    expect(screen.getByText('Salvando o livro pronto…')).toBeVisible();
  });

  it('opens the details of each volume, with the state of each in Portuguese', async () => {
    const user = userEvent.setup();
    render(
      inPortuguese(
        <RunningScreen
          onCancel={vi.fn()}
          position={{ name: 'Chainsaw Man', index: 1, total: 1 }}
          progress={progress}
        />,
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Mostrar detalhes' }));
    const details = screen.getByRole('region', { name: 'Detalhes dos volumes' });
    expect(screen.getByRole('button', { name: 'Ocultar detalhes' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(details).getByText('Volume 2')).toBeVisible();
    expect(within(details).getByText('Concluído · 100%')).toBeVisible();
    expect(within(details).getByText('Convertendo · 50%')).toBeVisible();
    expect(within(details).getByText('Aguardando')).toBeVisible();
    expect(
      within(details).getByRole('progressbar', { name: 'Progresso do volume 2' }),
    ).toHaveAttribute('aria-valuenow', '50');
  });

  it('tells a screen reader each tenth of the pages in Portuguese, and never a page', () => {
    const pages = (done: number): ConversionProgress => ({
      stage: 'processing',
      message: message('progress.pageProcessed', { completed: done, total: 50 }),
      page: done,
      completed: done,
      total: 50,
    });
    const { container } = render(
      inPortuguese(<RunningScreen onCancel={vi.fn()} progress={pages(26)} />),
    );

    const told = [...container.querySelectorAll('[aria-live]')]
      .map((region) => region.textContent)
      .join('|');
    expect(told).toContain('50% concluído');
    expect(told).not.toContain('Página 26');
    // The eyes still see the page being processed.
    expect(screen.getByText('Página 26 de 50 processada.')).toBeVisible();
  });
});

const saved: RunOutcome = {
  rowId: 'a',
  name: 'Work',
  status: 'done',
  artifacts: [{ id: 'one', name: 'Work.epub', bytes: 1536, format: 'epub' }],
};
const handlers = { onBack: vi.fn(), onFix: vi.fn(), onOpen: vi.fn(), onShow: vi.fn() };

describe('the screen of the books a run made, in Portuguese', () => {
  it('counts the books, says how they were made and what became of each', () => {
    render(
      inPortuguese(
        <ResultsScreen
          {...handlers}
          onSaveAll={vi.fn()}
          onSaveAs={vi.fn()}
          outcomes={[
            {
              ...saved,
              artifacts: [
                { id: 'one', name: 'Work 01.epub', bytes: 1536, format: 'epub' },
                { id: 'two', name: 'Work 02.epub', bytes: 5 * 1024 * 1024, format: 'epub' },
              ],
            },
          ]}
          savedIds={new Set(['two'])}
          summary={message('summary.books', { device: 'Kindle 11', format: 'EPUB', ownOptions: 2 })}
        />,
      ),
    );

    expect(screen.getByRole('heading', { name: '2 livros prontos' })).toBeVisible();
    expect(screen.getByText('Kindle 11 · EPUB · 2 com opções próprias')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Converter mais' })).toBeVisible();
    expect(screen.getByRole('button', { name: /Salvar todos em uma pasta/u })).toHaveAttribute(
      'title',
      'Arquivos que já existem não são substituídos; salvar de novo pode criar cópias numeradas.',
    );
    expect(
      within(screen.getByRole('list', { name: 'Livros prontos' })).getAllByRole('listitem'),
    ).toHaveLength(2);
    // The size is written as the language writes numbers.
    expect(screen.getByText('1,5 KB · Ainda não salvo')).toBeVisible();
    expect(screen.getByText('5,0 MB · Salvo')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Salvar Work 01.epub como' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mostrar Work 02.epub na pasta' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Abrir Work 01.epub' })).toBeVisible();
  });

  it('says a single book in the singular, and none when nothing was made', () => {
    const { rerender } = render(inPortuguese(<ResultsScreen {...handlers} outcomes={[saved]} />));
    expect(screen.getByRole('heading', { name: '1 livro pronto' })).toBeVisible();

    rerender(inPortuguese(<ResultsScreen {...handlers} outcomes={[]} />));
    expect(screen.getByRole('heading', { name: 'Nenhum livro foi produzido' })).toBeVisible();
  });

  it('says which items failed or were skipped, and offers to fix one', async () => {
    const user = userEvent.setup();
    const onFix = vi.fn();
    render(
      inPortuguese(
        <ResultsScreen
          {...handlers}
          onFix={onFix}
          outcomes={[
            {
              rowId: 'f',
              name: 'Berserk',
              status: 'failed',
              artifacts: [],
              message: [raw('A tool said so.')],
              fixable: true,
            },
            { rowId: 's', name: 'Vagabond', status: 'skipped', artifacts: [] },
          ]}
        />,
      ),
    );

    expect(screen.getByText('Não foi possível converter Berserk')).toBeVisible();
    expect(screen.getByText('Vagabond foi ignorado')).toBeVisible();
    expect(screen.getByText('A tool said so.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Corrigir Berserk' }));
    expect(onFix).toHaveBeenCalledWith('f');
    expect(screen.getByRole('button', { name: 'Corrigir Berserk' })).toHaveTextContent('Corrigir');
  });

  it('says the warnings in the words of the app, which books they are in, and a note it does not know as the tool wrote it', () => {
    const small = { code: 'images_smaller_than_device', message: 'Consider --upscale.' };
    const later = { code: 'added_in_a_later_release', message: 'Something new was noticed.' };
    render(
      inPortuguese(
        <ResultsScreen
          {...handlers}
          outcomes={[
            {
              ...saved,
              artifacts: [
                { id: 'one', name: 'Work 01.epub', bytes: 10, format: 'epub', warnings: [small] },
                {
                  id: 'two',
                  name: 'Work 02.epub',
                  bytes: 10,
                  format: 'epub',
                  warnings: [small, later],
                },
              ],
            },
          ]}
        />,
      ),
    );

    const notices = within(
      screen.getByRole('list', { name: 'Avisos sobre os livros' }),
    ).getAllByRole('listitem');
    expect(notices).toHaveLength(2);
    expect(notices[0]).toHaveTextContent('Páginas menores que a tela');
    expect(notices[0]).toHaveTextContent(
      'Em todos os 2 livros. Mais de um quarto das páginas é menor que a tela',
    );
    expect(notices[0]).not.toHaveTextContent('--upscale');
    expect(notices[1]).toHaveTextContent('Uma observação do mangapress');
    expect(notices[1]).toHaveTextContent('Em Work 02.epub. Something new was noticed.');
  });

  it.each([
    [1536, '1,5 KB'],
    [5 * 1024 * 1024, '5,0 MB'],
    [1536 * 1024 * 1024, '1,5 GB'],
    [1023, '1023 B'],
  ])('writes %i bytes as %s', (bytes, expected) => {
    expect(formatBytes(bytes, 'pt-BR')).toBe(expected);
  });
});

describe('the books of an earlier conversion, in Portuguese', () => {
  it('says how they were made when they are opened from the queue', async () => {
    const user = userEvent.setup();
    installBridge(
      bridge({
        loadAppSettings: () =>
          Promise.resolve({
            ok: true,
            value: { settings: { language: 'pt-BR' }, language: 'pt-BR', unreadable: false },
          }),
        listPendingRuns: () =>
          Promise.resolve({
            ok: true,
            value: [
              {
                libraryId: 'recovered-run',
                createdAt: 1_000,
                artifacts: [
                  {
                    id: 'recovered-book',
                    name: 'Recovered.epub',
                    bytes: 2048,
                    format: 'epub',
                    saved: false,
                  },
                ],
              },
            ],
          }),
      }),
    );
    render(<App />);

    await user.click(
      await screen.findByRole('button', { name: 'Ver os livros de Recovered.epub' }),
    );

    expect(screen.getByRole('heading', { name: '1 livro pronto' })).toBeVisible();
    expect(screen.getByText('Pronto para salvar ou compartilhar')).toBeVisible();
    expect(screen.getByText('2,0 KB · Ainda não salvo')).toBeVisible();
  });
});
