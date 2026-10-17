import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { defaultAppSettings } from '@/domain/app-settings';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { useAppSettings } from '@/renderer/hooks/use-app-settings';
import { useLanguage, useMessages } from '@/renderer/hooks/use-messages';
import type { MangaboundBridge } from '@/shared/runtime-info';

import { inertBridge } from './support/bridge';

/** Says the language and one message of it, and offers a way to change the language. */
function Probe(): React.JSX.Element {
  const messages = useMessages();
  const language = useLanguage();
  const { settings, setLanguage } = useAppSettings();
  return (
    <div>
      <p data-testid="language">{language}</p>
      <p data-testid="title">{messages.appSettings.title}</p>
      <p data-testid="choice">{settings.language}</p>
      <button
        onClick={() => {
          void setLanguage('pt-BR');
        }}
        type="button"
      >
        Choose Portuguese
      </button>
    </div>
  );
}

const reading =
  (language: 'en' | 'pt-BR'): MangaboundBridge['loadAppSettings'] =>
  () =>
    Promise.resolve({
      ok: true,
      value: { settings: { ...defaultAppSettings, language }, language, unreadable: false },
    });

afterEach(() => {
  document.documentElement.lang = '';
  delete document.documentElement.dataset.theme;
});

describe('without an AppSettingsProvider', () => {
  it('says its messages in English, so a part of the window can be drawn on its own', () => {
    function Alone(): React.JSX.Element {
      return (
        <p>
          {useLanguage()}: {useMessages().appSettings.interface}
        </p>
      );
    }

    render(<Alone />);

    expect(screen.getByText('en: Interface')).toBeVisible();
  });

  it('refuses to keep a choice, since there is nothing to keep it', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => render(<Probe />)).toThrow('AppSettingsProvider');
  });
});

describe('AppSettingsProvider', () => {
  it('draws nothing until the app settings have been read, so nothing is drawn in the wrong language', async () => {
    const bridge = inertBridge({ loadAppSettings: reading('pt-BR') });

    const { container } = render(
      <AppSettingsProvider bridge={bridge}>
        <Probe />
      </AppSettingsProvider>,
    );

    expect(container).toBeEmptyDOMElement();
    expect(await screen.findByTestId('title')).toHaveTextContent('Configurações do app');
  });

  it.each([
    ['en', 'App settings'],
    ['pt-BR', 'Configurações do app'],
  ] as const)('gives the messages of the language that was read: %s', async (language, title) => {
    const bridge = inertBridge({ loadAppSettings: reading(language) });

    render(
      <AppSettingsProvider bridge={bridge}>
        <Probe />
      </AppSettingsProvider>,
    );

    expect(await screen.findByTestId('language')).toHaveTextContent(language);
    expect(screen.getByTestId('title')).toHaveTextContent(title);
  });

  it('tells the page which language it is in, for the readers that speak it', async () => {
    const bridge = inertBridge({ loadAppSettings: reading('pt-BR') });

    render(
      <AppSettingsProvider bridge={bridge}>
        <Probe />
      </AppSettingsProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.lang).toBe('pt-BR');
    });
  });

  it('puts the theme that was kept on the page, which the stylesheet selects its variables by', async () => {
    const bridge = inertBridge({
      loadAppSettings: () =>
        Promise.resolve({
          ok: true,
          value: {
            settings: { ...defaultAppSettings, theme: 'light' },
            language: 'en',
            unreadable: false,
          },
        }),
    });

    render(
      <AppSettingsProvider bridge={bridge}>
        <Probe />
      </AppSettingsProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('light');
    });
  });

  it('puts the default theme on the page when nothing else was kept', async () => {
    render(
      <AppSettingsProvider bridge={inertBridge({ loadAppSettings: reading('en') })}>
        <Probe />
      </AppSettingsProvider>,
    );

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe('dark');
    });
  });

  it('changes everything it gave, at once, when the language is changed', async () => {
    const user = userEvent.setup();
    const bridge = inertBridge({
      loadAppSettings: () =>
        Promise.resolve({
          ok: true,
          value: { settings: defaultAppSettings, language: 'en', unreadable: false },
        }),
      saveAppSettings: () => Promise.resolve({ ok: true, value: { language: 'pt-BR' } }),
    });
    render(
      <AppSettingsProvider bridge={bridge}>
        <Probe />
      </AppSettingsProvider>,
    );
    expect(await screen.findByTestId('title')).toHaveTextContent('App settings');

    await user.click(screen.getByRole('button', { name: 'Choose Portuguese' }));

    await waitFor(() => {
      expect(screen.getByTestId('title')).toHaveTextContent('Configurações do app');
    });
    expect(screen.getByTestId('choice')).toHaveTextContent('pt-BR');
    expect(document.documentElement.lang).toBe('pt-BR');
  });
});
