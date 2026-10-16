import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { message } from '@/domain/message';
import { ProviderPicker } from '@/renderer/components/mapping/provider-picker';
import { SendToKoreader } from '@/renderer/components/sharing/send-to-koreader';
import { ShareMenu } from '@/renderer/components/sharing/share-menu';
import { SharePanel } from '@/renderer/components/sharing/share-panel';
import { App } from '@/renderer/app';

import { inPortuguese } from './support/i18n';
import { bridge, installBridge } from './support/workflow';

afterEach(() => {
  Reflect.deleteProperty(window, 'mangabound');
  vi.restoreAllMocks();
});

const interfaces = [{ name: 'Wi-Fi', address: '192.168.1.20' }];

const portuguese = {
  loadAppSettings: () =>
    Promise.resolve({
      ok: true as const,
      value: {
        settings: { language: 'pt-BR' as const },
        language: 'pt-BR' as const,
        unreadable: false,
      },
    }),
};

describe('the panel for sharing the books, in Portuguese', () => {
  it('says how to set sharing up, in the words of the language', () => {
    render(
      inPortuguese(
        <SharePanel
          interfaces={interfaces}
          library={{ libraryId: 'library', displayPath: 'C:\\Livros' }}
          onChooseLibrary={vi.fn()}
          onStart={vi.fn()}
          onStop={vi.fn()}
          status={{ active: false }}
        />,
      ),
    );

    expect(screen.getByRole('heading', { name: 'Compartilhar com o seu e-reader' })).toBeVisible();
    expect(
      screen.getByText(
        'Serve na sua rede um catálogo com os mais recentes primeiro, para que o KOReader ou qualquer leitor OPDS navegue e baixe o que você converteu.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Trocar a biblioteca compartilhada' })).toBeVisible();
    expect(screen.getByLabelText('Interface de rede')).toBeVisible();
    expect(screen.getByLabelText('Usuário')).toHaveAttribute('placeholder', 'Sem usuário');
    expect(screen.getByLabelText('Senha')).toHaveAttribute('placeholder', 'Sem senha');
    expect(screen.getByText('Deixe os dois em branco para compartilhar sem senha.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Começar a compartilhar' })).toBeEnabled();
  });

  it('asks for a library first, and says when no network was found', () => {
    render(
      inPortuguese(
        <SharePanel
          interfaces={[]}
          onChooseLibrary={vi.fn()}
          onStart={vi.fn()}
          onStop={vi.fn()}
          status={{ active: false }}
        />,
      ),
    );

    expect(
      screen.getByRole('button', { name: 'Escolher uma biblioteca para compartilhar' }),
    ).toBeVisible();
    expect(screen.getByText('Nenhuma interface de rede foi detectada.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Começar a compartilhar' })).toBeDisabled();
  });

  it('shows the address, says how to add it in KOReader, and stops', async () => {
    const user = userEvent.setup();
    const onStop = vi.fn();
    vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(
      inPortuguese(
        <SharePanel
          interfaces={interfaces}
          onChooseLibrary={vi.fn()}
          onStart={vi.fn()}
          onStop={onStop}
          status={{
            active: true,
            url: 'http://192.168.1.20:8080',
            interfaceAddress: '192.168.1.20',
            port: 8080,
          }}
        />,
      ),
    );

    expect(screen.getByLabelText('Endereço do catálogo')).toHaveValue('http://192.168.1.20:8080');
    expect(
      screen.getByText(
        'No KOReader: Search, depois OPDS catalog, e adicione este endereço. Mantenha o Mangabound aberto enquanto ele sincroniza.',
      ),
    ).toBeVisible();
    const copy = screen.getByRole('button', { name: 'Copiar o endereço' });
    expect(copy).toHaveTextContent('Copiar');
    await user.click(copy);
    expect(await screen.findByRole('button', { name: 'Copiar o endereço' })).toHaveTextContent(
      'Copiado',
    );
    await user.click(screen.getByRole('button', { name: 'Parar de compartilhar' }));
    expect(onStop).toHaveBeenCalledOnce();
  });
});

describe('the Share button and the card of the results, in Portuguese', () => {
  function Harness({ sharing }: { readonly sharing: boolean }): React.JSX.Element {
    const [open, setOpen] = useState(true);
    return (
      <ShareMenu onOpenChange={setOpen} open={open} sharing={sharing}>
        <section>
          <h2 id="share-title">Compartilhar com o seu e-reader</h2>
        </section>
      </ShareMenu>
    );
  }

  it('says Share, or that sharing is on, and names the button that puts the panel away', () => {
    const { rerender } = render(inPortuguese(<Harness sharing={false} />));
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Fechar compartilhamento' })).toBeVisible();

    rerender(inPortuguese(<Harness sharing />));
    expect(screen.getByRole('button', { name: 'Compartilhando' })).toBeVisible();
  });

  it('offers to share the books of a run, or to show that they are shared', () => {
    const { rerender } = render(
      inPortuguese(<SendToKoreader onOpen={vi.fn()} status={{ active: false }} />),
    );
    expect(screen.getByRole('heading', { name: 'Enviar para o KOReader' })).toBeVisible();
    expect(
      screen.getByText('O KOReader baixa os livros deste computador pela sua rede Wi-Fi.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Compartilhar estes livros' })).toBeVisible();

    rerender(
      inPortuguese(
        <SendToKoreader
          onOpen={vi.fn()}
          status={{
            active: true,
            url: 'http://192.168.1.20:8080',
            interfaceAddress: '192.168.1.20',
            port: 8080,
          }}
        />,
      ),
    );
    expect(screen.getByText('Compartilhando')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Mostrar compartilhamento' })).toBeVisible();
  });

  it('opens the panel from the books of an earlier conversion, naming them in the language', async () => {
    const user = userEvent.setup();
    installBridge(
      bridge({
        ...portuguese,
        listNetworkInterfaces: () => Promise.resolve({ ok: true, value: interfaces }),
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
    await user.click(screen.getByRole('button', { name: 'Compartilhar estes livros' }));

    const panel = screen.getByRole('dialog', { name: 'Compartilhar com o seu e-reader' });
    expect(panel).toHaveTextContent('Livros prontos para compartilhar');
  });
});

describe('the banner of the bundled tools, in Portuguese', () => {
  it('says the tools need attention, and what is wrong', async () => {
    installBridge(
      bridge({
        ...portuguese,
        getToolchainStatus: () =>
          Promise.resolve({
            state: 'blocked',
            tools: [],
            message: message('toolchain.unavailable', {}),
          }),
      }),
    );
    render(<App />);

    const banner = await screen.findByRole('region', { name: 'Estado das ferramentas incluídas' });
    expect(
      within(banner).getByRole('heading', {
        name: 'As ferramentas de conversão precisam de atenção',
      }),
    ).toBeVisible();
    expect(
      within(banner).getByText(
        'A conversão fica indisponível até que as ferramentas incluídas sejam restauradas.',
      ),
    ).toBeVisible();
  });
});

describe('the error of an app that could not start, in Portuguese', () => {
  it('follows the language of the system, since the settings cannot be read', () => {
    vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['pt-PT', 'en']);
    render(<App />);

    const error = screen.getByRole('alert', { name: 'Erro na inicialização' });
    expect(
      within(error).getByRole('heading', {
        name: 'O Mangabound não conseguiu iniciar corretamente.',
      }),
    ).toBeVisible();
    expect(
      within(error).getByText('Reinicie o app. Se o problema continuar, reinstale o Mangabound.'),
    ).toBeVisible();
  });
});

describe('the description of an online source, in Portuguese', () => {
  it('says what the source is in the language, beside its site', async () => {
    const user = userEvent.setup();
    render(
      inPortuguese(
        <ProviderPicker
          onSelect={vi.fn()}
          providers={[
            {
              id: 'mangadex',
              displayName: 'MangaDex',
              homepage: 'https://mangadex.org',
              description: message('provider.catalogue', {}),
            },
          ]}
          selectedId={undefined}
        />,
      ),
    );

    await user.click(screen.getByRole('combobox', { name: 'Fonte' }));

    expect(
      screen.getByText(
        'mangadex.org · Catálogo comunitário de mangás, com dados de volumes e capítulos',
      ),
    ).toBeVisible();
  });
});
