import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { UpdatesTab } from '@/renderer/components/settings/updates-tab';
import type { MangaboundBridge } from '@/shared/runtime-info';

import { inertBridge } from './support/bridge';

const reading =
  (language: 'en' | 'pt-BR'): MangaboundBridge['loadAppSettings'] =>
  () =>
    Promise.resolve({ ok: true, value: { settings: { language }, language, unreadable: false } });

async function renderUpdates(language: 'en' | 'pt-BR' = 'en'): Promise<void> {
  const bridge = inertBridge({ loadAppSettings: reading(language) });
  render(
    <AppSettingsProvider bridge={bridge}>
      <UpdatesTab />
    </AppSettingsProvider>,
  );
  await screen.findByRole('status');
}

describe('the Updates tab', () => {
  it('says that updating from inside the app is not available yet', async () => {
    await renderUpdates();

    const notice = screen.getByRole('status', { name: 'Not available yet' });
    expect(notice).toHaveTextContent('The app cannot update itself yet.');
    expect(notice).toHaveTextContent('The options below will work when the feature arrives.');
  });

  it('says the version that is installed, which is what the app already knows', async () => {
    await renderUpdates();

    expect(screen.getByText('Installed version')).toBeVisible();
    expect(screen.getByText(inertBridge().runtime.version)).toBeVisible();
  });

  it('draws the choices of keeping up to date, and none of them can be changed', async () => {
    await renderUpdates();

    expect(screen.getByRole('button', { name: 'Check for updates' })).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: 'Check for updates automatically' }),
    ).toBeDisabled();
    const versions = screen.getByRole('combobox', { name: 'Versions to look for' });
    expect(versions).toBeDisabled();
    expect(versions).toHaveDisplayValue('Stable versions only');
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

  it('is in the language of the window', async () => {
    await renderUpdates('pt-BR');

    expect(screen.getByRole('status', { name: 'Ainda não disponível' })).toBeVisible();
    expect(screen.getByText('Versão instalada')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Verificar atualizações' })).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: 'Verificar atualizações automaticamente' }),
    ).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Versões a procurar' })).toHaveDisplayValue(
      'Só versões estáveis',
    );
  });
});
