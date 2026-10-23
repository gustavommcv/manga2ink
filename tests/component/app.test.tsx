import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '@/renderer/app';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { WorkflowApp } from '@/renderer/workflow-app';
import { message, raw } from '@/domain/message';

import { inertBridge } from './support/bridge';
import { defaultAppSettings } from '@/domain/app-settings';

afterEach(() => {
  Reflect.deleteProperty(window, 'manga2ink');
});

function installBridge(overrides: Parameters<typeof inertBridge>[0]): void {
  Object.defineProperty(window, 'manga2ink', {
    configurable: true,
    value: inertBridge(overrides),
  });
}

describe('application startup', () => {
  it('gives recovery instructions instead of the old scaffold when the desktop bridge is missing', () => {
    render(<App />);

    const error = screen.getByRole('alert', { name: 'Startup error' });
    expect(
      within(error).getByRole('heading', { name: 'Manga2Ink could not start correctly.' }),
    ).toBeVisible();
    expect(
      within(error).getByText('Restart the app. If the problem persists, reinstall Manga2Ink.'),
    ).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Queue' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'App settings' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Architecture checkpoint|Foundation/u)).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Bundled tool status' })).not.toBeInTheDocument();
  });

  it.each(['absent', 'different'] as const)(
    'uses the supplied bridge for actions and subscription cleanup when the window bridge is %s',
    async (windowBridge) => {
      const user = userEvent.setup();
      const otherChooseInputs = vi.fn();
      if (windowBridge === 'different') {
        installBridge({
          chooseInputs: otherChooseInputs,
          runtime: { electron: '44.3.0', platform: 'win32', version: '99.99.99' },
        });
      }
      const message = 'The selected files could not be opened.';
      const chooseInputs = vi.fn().mockResolvedValue({
        ok: false,
        error: { code: 'file_access_denied', said: raw(message) },
      });
      const unsubscribe = vi.fn();
      const supplied = inertBridge({
        chooseInputs,
        onConversionProgress: () => unsubscribe,
      });

      const { unmount } = render(
        <AppSettingsProvider bridge={supplied}>
          <WorkflowApp bridge={supplied} />
        </AppSettingsProvider>,
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Files' })).toBeEnabled();
      });
      expect(screen.getByText(`v${supplied.runtime.version}`)).toBeVisible();
      expect(screen.queryByText('v99.99.99')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Files' }));
      expect(await screen.findByText(message)).toBeVisible();
      expect(chooseInputs).toHaveBeenCalledExactlyOnceWith('files');
      expect(otherChooseInputs).not.toHaveBeenCalled();

      unmount();
      expect(unsubscribe).toHaveBeenCalledOnce();
    },
  );

  it('says nothing once the bridge reports the tools are ready: they are mandatory, not a status', async () => {
    installBridge({
      getToolchainStatus: vi.fn().mockResolvedValue({
        state: 'ready',
        target: 'win32-x64',
        tools: [
          {
            name: 'mangabind',
            releaseTag: 'v0.4.0',
            state: 'ready',
            message: message('toolchain.toolReady', { tool: 'mangabind', release: 'v0.4.0' }),
          },
          {
            name: 'mangaprep',
            releaseTag: 'v0.5.0',
            state: 'ready',
            message: message('toolchain.toolReady', { tool: 'mangaprep', release: 'v0.5.0' }),
          },
        ],
        message: message('toolchain.ready', {}),
      }),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Files' })).toBeEnabled();
    });
    expect(screen.queryByRole('region', { name: 'Bundled tool status' })).not.toBeInTheDocument();
    expect(screen.queryByText(/Conversion tools/u)).not.toBeInTheDocument();
  });

  it('presents a safe recovery message if the preload status call fails', async () => {
    installBridge({
      getToolchainStatus: vi.fn().mockRejectedValue(new Error('internal detail')),
    });

    render(<App />);

    expect(await screen.findByText('Conversion tools need attention')).toBeVisible();
    expect(screen.getByText('The bundled conversion tools could not be checked.')).toBeVisible();
    expect(screen.queryByText(/internal detail/u)).not.toBeInTheDocument();
  });

  it('shows the repair path when the bridge resolves with a blocked toolchain, not only when it rejects', async () => {
    const text =
      'A bundled conversion tool failed verification. Reinstall Manga2Ink to restore it.';
    const unavailable = raw(text);
    installBridge({
      getToolchainStatus: vi.fn().mockResolvedValue({
        state: 'blocked',
        target: 'win32-x64',
        tools: [
          {
            name: 'mangabind',
            releaseTag: 'v0.4.0',
            state: 'failed',
            message: raw('mangabind failed verification. Reinstall Manga2Ink to restore it.'),
          },
          {
            name: 'mangaprep',
            releaseTag: 'v0.5.0',
            state: 'ready',
            message: message('toolchain.toolReady', { tool: 'mangaprep', release: 'v0.5.0' }),
          },
        ],
        message: unavailable,
      }),
    });

    render(<App />);

    expect(await screen.findByText('Conversion tools need attention')).toBeVisible();
    expect(screen.getByText(text)).toBeVisible();
    expect(screen.queryByText('Conversion tools ready')).not.toBeInTheDocument();
  });

  describe('the app settings', () => {
    it('has a gear on the title bar, beside Share, that opens the app settings', async () => {
      const user = userEvent.setup();
      installBridge({});

      render(<App />);

      const gear = await screen.findByRole('button', { name: 'App settings' });
      expect(screen.getByRole('button', { name: 'Share' }).parentElement?.parentElement).toBe(
        gear.parentElement,
      );
      await user.click(gear);
      expect(await screen.findByRole('dialog', { name: 'App settings' })).toBeVisible();
    });

    it('draws nothing until they have been read, so nothing is drawn in a language that changes', async () => {
      installBridge({
        loadAppSettings: () =>
          new Promise(() => {
            // Never answers.
          }),
      });

      const { container } = render(<App />);

      await new Promise((done) => setTimeout(done, 20));
      expect(container).toBeEmptyDOMElement();
    });

    it('is in the language that was kept, and the page says so', async () => {
      installBridge({
        loadAppSettings: () =>
          Promise.resolve({
            ok: true,
            value: {
              settings: { ...defaultAppSettings, language: 'pt-BR' },
              language: 'pt-BR',
              unreadable: false,
            },
          }),
      });

      render(<App />);

      expect(await screen.findByRole('button', { name: 'Configurações do app' })).toBeVisible();
      expect(document.documentElement.lang).toBe('pt-BR');
      // The queue is in the language too, and so are the controls beside it.
      expect(await screen.findByRole('heading', { name: 'Fila' })).toBeVisible();
      expect(screen.getByRole('button', { name: 'Arquivos' })).toBeVisible();
      expect(screen.getByRole('combobox', { name: 'Dispositivo' })).toBeVisible();
    });

    it('says, in the notices, that what was kept could not be read', async () => {
      installBridge({
        loadAppSettings: () =>
          Promise.resolve({
            ok: true,
            value: {
              settings: { ...defaultAppSettings, language: 'system' },
              language: 'en',
              unreadable: true,
            },
          }),
      });

      render(<App />);

      expect(
        await screen.findByText(
          'The saved app settings could not be read, so the defaults are in use.',
        ),
      ).toBeVisible();
    });

    it('says nothing when they were read without trouble', async () => {
      installBridge({});

      render(<App />);

      await screen.findByRole('button', { name: 'App settings' });
      expect(screen.queryByText(/could not be read/u)).not.toBeInTheDocument();
    });

    it('changes the language of the window from the dialog, and keeps it', async () => {
      const user = userEvent.setup();
      const saveAppSettings = vi.fn().mockResolvedValue({ ok: true, value: { language: 'pt-BR' } });
      installBridge({ saveAppSettings });
      render(<App />);

      await user.click(await screen.findByRole('button', { name: 'App settings' }));
      await user.selectOptions(await screen.findByRole('combobox', { name: 'Language' }), 'pt-BR');

      expect(saveAppSettings).toHaveBeenCalledExactlyOnceWith({ language: 'pt-BR' });
      expect(await screen.findByRole('dialog', { name: 'Configurações do app' })).toBeVisible();
      expect(document.documentElement.lang).toBe('pt-BR');
    });
  });
});
