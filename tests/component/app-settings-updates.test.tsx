import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { message } from '@/domain/message';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { UpdatesTab } from '@/renderer/components/settings/updates-tab';
import type { MangaboundBridge } from '@/shared/runtime-info';

import { deferred } from './support/workflow';
import { inertBridge } from './support/bridge';

const reading =
  (language: 'en' | 'pt-BR'): MangaboundBridge['loadAppSettings'] =>
  () =>
    Promise.resolve({ ok: true, value: { settings: { language }, language, unreadable: false } });

const newer: MangaboundBridge['checkForUpdates'] = () =>
  Promise.resolve({
    ok: true,
    value: {
      status: 'available',
      version: '0.1.0-alpha.16',
      tag: 'v0.1.0-alpha.16',
      publishedAt: '2026-10-20T10:00:00Z',
    },
  });

async function renderUpdates(
  language: 'en' | 'pt-BR' = 'en',
  overrides: Partial<MangaboundBridge> = {},
): Promise<void> {
  const bridge = inertBridge({ loadAppSettings: reading(language), ...overrides });
  render(
    <AppSettingsProvider bridge={bridge}>
      <UpdatesTab />
    </AppSettingsProvider>,
  );
  await screen.findByRole('status');
}

describe('the Updates tab', () => {
  it('says that the app looks when asked, and cannot install a new version itself yet', async () => {
    await renderUpdates();

    const notice = screen.getByRole('status', { name: 'Updates are manual for now' });
    expect(notice).toHaveTextContent('The app looks for a newer version when you ask.');
    expect(notice).toHaveTextContent('a button opens the download page in your browser');
  });

  it('says the version that is installed, which is what the app already knows', async () => {
    await renderUpdates();

    expect(screen.getByText('Installed version')).toBeVisible();
    expect(screen.getByText(inertBridge().runtime.version)).toBeVisible();
  });

  it('has a check that can be made, and the choices that come with updating by itself drawn and unchangeable', async () => {
    await renderUpdates();

    expect(screen.getByRole('button', { name: 'Check for updates' })).toBeEnabled();
    expect(
      screen.getByRole('checkbox', { name: 'Check for updates automatically' }),
    ).toBeDisabled();
    const versions = screen.getByRole('combobox', { name: 'Versions to look for' });
    expect(versions).toBeDisabled();
    // Every release so far is a pre-release, which is what the check looks for.
    expect(versions).toHaveDisplayValue('Stable and pre-release versions');
    expect(
      within(versions)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Stable versions only', 'Stable and pre-release versions']);
  });

  it('says what the automatic check would do', async () => {
    await renderUpdates();

    expect(
      screen.getByRole('checkbox', { name: 'Check for updates automatically' }),
    ).toHaveAccessibleDescription('Looks for a new version when the app starts.');
  });

  it('looks for nothing until the button is clicked', async () => {
    const checkForUpdates = vi.fn<MangaboundBridge['checkForUpdates']>(newer);
    await renderUpdates('en', { checkForUpdates });

    expect(checkForUpdates).not.toHaveBeenCalled();
    expect(screen.queryByText(/new version is available|latest version/u)).not.toBeInTheDocument();
  });
});

describe('checking for updates', () => {
  it('says so while it asks, and that the installed version is the newest when it is', async () => {
    const user = userEvent.setup();
    const answer = deferred<Awaited<ReturnType<MangaboundBridge['checkForUpdates']>>>();
    const checkForUpdates = vi.fn<MangaboundBridge['checkForUpdates']>(() => answer.promise);
    await renderUpdates('en', { checkForUpdates });

    await user.click(screen.getByRole('button', { name: 'Check for updates' }));

    const busy = screen.getByRole('button', { name: 'Checking…' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    answer.resolve({ ok: true, value: { status: 'current', version: '0.1.0-alpha.15' } });
    expect(await screen.findByText('You have the latest version (0.1.0-alpha.15).')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Check for updates' })).toBeEnabled();
    expect(screen.queryByRole('button', { name: 'Download the update' })).not.toBeInTheDocument();
    expect(checkForUpdates).toHaveBeenCalledOnce();
  });

  it('says that a new version is out, since when, and offers to download it', async () => {
    const user = userEvent.setup();
    await renderUpdates('en', { checkForUpdates: newer });

    await user.click(screen.getByRole('button', { name: 'Check for updates' }));

    expect(
      await screen.findByText(
        'A new version is available: 0.1.0-alpha.16, published on October 20, 2026.',
      ),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Download the update' })).toBeVisible();
  });

  it('does not say a day when the release gives none, or one that is not a day', async () => {
    const user = userEvent.setup();
    const checkForUpdates = vi
      .fn<MangaboundBridge['checkForUpdates']>()
      .mockResolvedValueOnce({
        ok: true,
        value: { status: 'available', version: '0.1.0-alpha.16', tag: 'v0.1.0-alpha.16' },
      })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          status: 'available',
          version: '0.1.0-alpha.16',
          tag: 'v0.1.0-alpha.16',
          publishedAt: 'sometime',
        },
      });
    await renderUpdates('en', { checkForUpdates });

    for (let times = 0; times < 2; times += 1) {
      await user.click(screen.getByRole('button', { name: 'Check for updates' }));
      expect(await screen.findByText('A new version is available: 0.1.0-alpha.16.')).toBeVisible();
    }
  });

  it('opens the download page of the project, by name, in the language of the window', async () => {
    const user = userEvent.setup();
    const openProjectLink = vi.fn<MangaboundBridge['openProjectLink']>(() =>
      Promise.resolve({ ok: true, value: undefined }),
    );
    await renderUpdates('pt-BR', { checkForUpdates: newer, openProjectLink });
    await user.click(screen.getByRole('button', { name: 'Buscar atualizações' }));

    await user.click(await screen.findByRole('button', { name: 'Baixar a atualização' }));

    expect(openProjectLink).toHaveBeenCalledExactlyOnceWith({
      link: 'releases',
      language: 'pt-BR',
    });
    expect(screen.queryByText(/não foi possível abrir/iu)).not.toBeInTheDocument();
  });

  it('says so when the page could not be opened, and no longer when the check is made again', async () => {
    const user = userEvent.setup();
    const openProjectLink = vi.fn<MangaboundBridge['openProjectLink']>(() =>
      Promise.resolve({
        ok: false,
        error: { code: 'unexpected_failure', said: message('failure.internal', {}) },
      }),
    );
    await renderUpdates('en', { checkForUpdates: newer, openProjectLink });
    await user.click(screen.getByRole('button', { name: 'Check for updates' }));

    await user.click(await screen.findByRole('button', { name: 'Download the update' }));

    expect(
      await screen.findByText('The download page could not be opened. Try again.'),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Check for updates' }));
    await waitFor(() => {
      expect(
        screen.queryByText('The download page could not be opened. Try again.'),
      ).not.toBeInTheDocument();
    });
  });

  it('says why GitHub could not be asked, in the language of the window, and can be tried again', async () => {
    const user = userEvent.setup();
    const checkForUpdates = vi.fn<MangaboundBridge['checkForUpdates']>(() =>
      Promise.resolve({
        ok: false,
        error: {
          code: 'network_error',
          said: message('provider.unreachable', { service: 'GitHub' }),
        },
      }),
    );
    await renderUpdates('pt-BR', { checkForUpdates });

    await user.click(screen.getByRole('button', { name: 'Buscar atualizações' }));

    expect(await screen.findByText('Não foi possível acessar GitHub.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Buscar atualizações' }));
    expect(checkForUpdates).toHaveBeenCalledTimes(2);
  });

  it('says what went wrong when the call itself does not arrive', async () => {
    const user = userEvent.setup();
    await renderUpdates('en', {
      checkForUpdates: () => Promise.reject(new Error('the bridge is gone')),
    });

    await user.click(screen.getByRole('button', { name: 'Check for updates' }));

    expect(await screen.findByText('Mangabound could not complete that action.')).toBeVisible();
  });

  it('shows nothing of an answer that arrives after the tab was put away', async () => {
    const user = userEvent.setup();
    const answer = deferred<Awaited<ReturnType<MangaboundBridge['checkForUpdates']>>>();
    const bridge = inertBridge({
      loadAppSettings: reading('en'),
      checkForUpdates: () => answer.promise,
    });
    const { unmount } = render(
      <AppSettingsProvider bridge={bridge}>
        <UpdatesTab />
      </AppSettingsProvider>,
    );
    await user.click(await screen.findByRole('button', { name: 'Check for updates' }));

    unmount();
    answer.resolve({ ok: true, value: { status: 'current', version: '0.1.0-alpha.15' } });

    await waitFor(() => {
      expect(screen.queryByText(/latest version/u)).not.toBeInTheDocument();
    });
  });
});

describe('the Updates tab in Portuguese', () => {
  it('is in the language of the window', async () => {
    await renderUpdates('pt-BR');

    expect(screen.getByRole('status', { name: 'Atualizações manuais por enquanto' })).toBeVisible();
    expect(screen.getByText('Versão instalada')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Buscar atualizações' })).toBeEnabled();
    expect(
      screen.getByRole('checkbox', { name: 'Verificar atualizações automaticamente' }),
    ).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Versões a procurar' })).toHaveDisplayValue(
      'Estáveis e de pré-lançamento',
    );
  });

  it('says that a new version is out with the date as the language writes it', async () => {
    const user = userEvent.setup();
    await renderUpdates('pt-BR', { checkForUpdates: newer });

    await user.click(screen.getByRole('button', { name: 'Buscar atualizações' }));

    expect(
      await screen.findByText(
        'Há uma versão nova: 0.1.0-alpha.16, publicada em 20 de outubro de 2026.',
      ),
    ).toBeVisible();
  });

  it('says that the installed version is the newest', async () => {
    const user = userEvent.setup();
    await renderUpdates('pt-BR');

    await user.click(screen.getByRole('button', { name: 'Buscar atualizações' }));

    expect(
      await screen.findByText('Você está com a versão mais recente (0.1.0-alpha.15).'),
    ).toBeVisible();
  });
});
