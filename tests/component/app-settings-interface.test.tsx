import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { LanguagePreference } from '@/domain/app-settings';
import type { Theme } from '@/domain/theme';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { InterfaceTab } from '@/renderer/components/settings/interface-tab';
import type { MangaboundBridge } from '@/shared/runtime-info';

import { inertBridge } from './support/bridge';
import { raw } from '@/domain/message';
import { defaultAppSettings } from '@/domain/app-settings';

const kept =
  (
    preference: LanguagePreference,
    language: 'en' | 'pt-BR' = 'en',
  ): MangaboundBridge['loadAppSettings'] =>
  () =>
    Promise.resolve({
      ok: true,
      value: {
        settings: { ...defaultAppSettings, language: preference },
        language,
        unreadable: false,
      },
    });

async function renderGeneral(
  overrides: Partial<MangaboundBridge> = {},
): Promise<HTMLSelectElement> {
  render(
    <AppSettingsProvider bridge={inertBridge({ loadAppSettings: kept('en'), ...overrides })}>
      <InterfaceTab />
    </AppSettingsProvider>,
  );
  return await screen.findByRole<HTMLSelectElement>('combobox', { name: 'Language' });
}

describe('the language in the general tab', () => {
  it('is chosen from the languages the app has, each written in itself, and from the system', async () => {
    const select = await renderGeneral();

    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Automatic (system language)', 'English', 'Português (Brasil)']);
  });

  it.each([
    ['system', 'Automatic (system language)'],
    ['en', 'English'],
    ['pt-BR', 'Português (Brasil)'],
  ] as const)('shows the choice that was kept: %s', async (preference, shown) => {
    const select = await renderGeneral({ loadAppSettings: kept(preference) });

    expect(select).toHaveDisplayValue(shown);
  });

  it('says what it does, and that a choice is described by it', async () => {
    const select = await renderGeneral();

    expect(select).toHaveAccessibleDescription(
      'Applies right away. Books, titles and the tools’ own messages are not translated.',
    );
  });

  it('keeps the choice, and the whole window is in the language at once', async () => {
    const user = userEvent.setup();
    const saveAppSettings = vi.fn<MangaboundBridge['saveAppSettings']>(() =>
      Promise.resolve({ ok: true, value: { language: 'pt-BR' } }),
    );
    const select = await renderGeneral({ saveAppSettings });

    await user.selectOptions(select, 'Português (Brasil)');

    expect(saveAppSettings).toHaveBeenCalledExactlyOnceWith({ language: 'pt-BR' });
    const changed = await screen.findByRole('combobox', { name: 'Idioma' });
    expect(changed).toHaveDisplayValue('Português (Brasil)');
    expect(
      within(changed).getByRole('option', { name: 'Automático (idioma do sistema)' }),
    ).toBeVisible();
    expect(changed).toHaveFocus();
  });

  it('follows the system when that is chosen, in the language it comes to', async () => {
    const user = userEvent.setup();
    const select = await renderGeneral({
      loadAppSettings: kept('en'),
      saveAppSettings: () => Promise.resolve({ ok: true, value: { language: 'pt-BR' } }),
    });

    await user.selectOptions(select, 'Automatic (system language)');

    expect(await screen.findByRole('combobox', { name: 'Idioma' })).toHaveDisplayValue(
      'Automático (idioma do sistema)',
    );
  });

  it('says it could not be kept, and stays as it was, when keeping it fails', async () => {
    const user = userEvent.setup();
    const select = await renderGeneral({
      saveAppSettings: () =>
        Promise.resolve({ ok: false, error: { code: 'settings_save_failed', said: raw('No.') } }),
    });

    await user.selectOptions(select, 'Português (Brasil)');

    expect(await screen.findByText('The language could not be saved. Try again.')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveDisplayValue('English');
  });

  it('stops saying so once a choice is kept', async () => {
    const user = userEvent.setup();
    const saveAppSettings = vi
      .fn<MangaboundBridge['saveAppSettings']>()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'settings_save_failed', said: raw('No.') },
      })
      .mockResolvedValueOnce({ ok: true, value: { language: 'pt-BR' } });
    const select = await renderGeneral({ saveAppSettings });
    await user.selectOptions(select, 'Português (Brasil)');
    await screen.findByText('The language could not be saved. Try again.');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Language' }),
      'Português (Brasil)',
    );

    await waitFor(() => {
      expect(
        screen.queryByText('The language could not be saved. Try again.'),
      ).not.toBeInTheDocument();
    });
  });

  it('keeps nothing for a choice it does not offer', async () => {
    const saveAppSettings = vi.fn<MangaboundBridge['saveAppSettings']>();
    const select = await renderGeneral({ saveAppSettings });

    fireEvent.change(select, { target: { value: 'klingon' } });

    expect(saveAppSettings).not.toHaveBeenCalled();
  });
});

describe('the theme in the Interface tab', () => {
  const keptTheme =
    (theme: Theme): MangaboundBridge['loadAppSettings'] =>
    () =>
      Promise.resolve({
        ok: true,
        value: { settings: { ...defaultAppSettings, theme }, language: 'en', unreadable: false },
      });

  async function renderTheme(
    overrides: Partial<MangaboundBridge> = {},
  ): Promise<HTMLSelectElement> {
    render(
      <AppSettingsProvider bridge={inertBridge({ loadAppSettings: kept('en'), ...overrides })}>
        <InterfaceTab />
      </AppSettingsProvider>,
    );
    return await screen.findByRole<HTMLSelectElement>('combobox', { name: 'Theme' });
  }

  it('is chosen from the themes the app has, each by its name', async () => {
    const select = await renderTheme();

    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Dark (graphite)', 'Light (paper)']);
    expect(select).toHaveDisplayValue('Dark (graphite)');
  });

  it.each([
    ['dark', 'Dark (graphite)'],
    ['light', 'Light (paper)'],
  ] as const)('shows the theme that was kept: %s', async (theme, shown) => {
    const select = await renderTheme({ loadAppSettings: keptTheme(theme) });

    expect(select).toHaveDisplayValue(shown);
  });

  it('says what it does, and a choice is described by it', async () => {
    const select = await renderTheme();

    expect(select).toHaveAccessibleDescription('How the app looks. Applies right away.');
  });

  it('keeps the choice, naming only the theme, shows it at once, and says nothing when it is kept', async () => {
    const user = userEvent.setup();
    const saveAppSettings = vi.fn<MangaboundBridge['saveAppSettings']>(() =>
      Promise.resolve({ ok: true, value: { language: 'en' } }),
    );
    const select = await renderTheme({ saveAppSettings });

    await user.selectOptions(select, 'Light (paper)');

    await waitFor(() => {
      expect(saveAppSettings).toHaveBeenCalledExactlyOnceWith({ theme: 'light' });
    });
    await waitFor(() => {
      expect(select).toHaveDisplayValue('Light (paper)');
    });
    expect(screen.queryByText('The theme could not be saved. Try again.')).not.toBeInTheDocument();
  });

  it('says the theme could not be kept, and the language is not touched', async () => {
    const user = userEvent.setup();
    const select = await renderTheme({
      saveAppSettings: () =>
        Promise.resolve({ ok: false, error: { code: 'settings_save_failed', said: raw('No.') } }),
    });

    await user.selectOptions(select, 'Light (paper)');

    expect(await screen.findByText('The theme could not be saved. Try again.')).toBeVisible();
    expect(select).toHaveDisplayValue('Dark (graphite)');
    expect(screen.getByRole('combobox', { name: 'Language' })).toHaveDisplayValue('English');
  });

  it('is said in Portuguese for a window in Portuguese', async () => {
    render(
      <AppSettingsProvider bridge={inertBridge({ loadAppSettings: kept('pt-BR', 'pt-BR') })}>
        <InterfaceTab />
      </AppSettingsProvider>,
    );

    const select = await screen.findByRole('combobox', { name: 'Tema' });

    expect(select).toHaveDisplayValue('Escuro (grafite)');
    expect(
      within(select)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Escuro (grafite)', 'Claro (papel)']);
    expect(select).toHaveAccessibleDescription('Como o app se parece. Vale na hora.');
  });
});
