import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { Language } from '@/domain/app-settings';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { AboutTab } from '@/renderer/components/settings/about-tab';
import { projectLinks } from '@/shared/project-links-contract';
import type { MangaboundBridge } from '@/shared/runtime-info';
import { raw } from '@/domain/message';

import { inertBridge } from './support/bridge';

const speaking =
  (language: Language): MangaboundBridge['loadAppSettings'] =>
  () =>
    Promise.resolve({ ok: true, value: { settings: { language }, language, unreadable: false } });

async function renderAbout(
  overrides: Partial<MangaboundBridge> = {},
  language: Language = 'en',
): Promise<void> {
  render(
    <AppSettingsProvider
      bridge={inertBridge({ loadAppSettings: speaking(language), ...overrides })}
    >
      <AboutTab />
    </AppSettingsProvider>,
  );
  await screen.findByText('Mangabound');
}

describe('the About tab', () => {
  it('names the app and the version that is running', async () => {
    await renderAbout({
      runtime: { electron: '44.3.0', platform: 'linux', version: '0.1.0-alpha.15' },
    });

    expect(screen.getByText('Mangabound')).toBeVisible();
    expect(screen.getByText('Version 0.1.0-alpha.15')).toBeVisible();
  });

  it('draws the logo as a picture of its own, without a name, since the name is beside it', async () => {
    await renderAbout();

    const logo = document.querySelector('img');
    expect(logo).not.toBeNull();
    expect(logo).toHaveAttribute('alt', '');
    expect(logo).toHaveAttribute('width', '96');
    expect(logo).toHaveAttribute('height', '96');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('credits the artist of the icon and MangaDex, and names the license', async () => {
    await renderAbout();

    expect(screen.getByText('JPmarquesbraga')).toBeVisible();
    expect(screen.getByRole('button', { name: 'MangaDex' })).toBeVisible();
    expect(screen.getByText(/released under the MIT License/u)).toBeVisible();
  });

  it('is in the language of the window', async () => {
    await renderAbout({}, 'pt-BR');

    expect(screen.getByText(/^Versão /u)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Apoiar o projeto' })).toBeVisible();
    expect(screen.getByText('Créditos')).toBeVisible();
  });

  it.each([
    ['User guide', 'guide'],
    ['GitHub', 'repository'],
    ['Report a problem', 'issues'],
    ['Support the project', 'support'],
    ['MangaDex', 'mangadex'],
    ['MIT License', 'license'],
    ['Third-party notices', 'third-party-notices'],
  ] as const)('opens a place by its name when %s is chosen', async (name, link) => {
    const user = userEvent.setup();
    const openProjectLink = vi.fn<MangaboundBridge['openProjectLink']>(() =>
      Promise.resolve({ ok: true, value: undefined }),
    );
    await renderAbout({ openProjectLink });

    await user.click(screen.getByRole('button', { name }));

    expect(openProjectLink).toHaveBeenCalledExactlyOnceWith({ link, language: 'en' });
    expect(screen.queryByText('That page could not be opened. Try again.')).not.toBeInTheDocument();
  });

  it('has a button for every place the main process knows, so none is left out of reach', async () => {
    const user = userEvent.setup();
    const openProjectLink = vi.fn<MangaboundBridge['openProjectLink']>(() =>
      Promise.resolve({ ok: true, value: undefined }),
    );
    await renderAbout({ openProjectLink });

    for (const button of screen.getAllByRole('button')) await user.click(button);

    expect(openProjectLink.mock.calls.map(([command]) => command.link).sort()).toEqual(
      [...projectLinks].sort(),
    );
  });

  it('tells the language of the window to the main process, which picks the guide', async () => {
    const user = userEvent.setup();
    const openProjectLink = vi.fn<MangaboundBridge['openProjectLink']>(() =>
      Promise.resolve({ ok: true, value: undefined }),
    );
    await renderAbout({ openProjectLink }, 'pt-BR');

    await user.click(screen.getByRole('button', { name: 'Guia do usuário' }));

    expect(openProjectLink).toHaveBeenCalledExactlyOnceWith({ link: 'guide', language: 'pt-BR' });
  });

  it.each([
    [
      'refuses it',
      () => Promise.resolve({ ok: false as const, error: { code: 'x', said: raw('No.') } }),
    ],
    ['fails', () => Promise.reject(new Error('The bridge is gone.'))],
  ])('says so, and does not throw, when the main process %s', async (_, answer) => {
    const user = userEvent.setup();
    await renderAbout({ openProjectLink: answer });

    await user.click(screen.getByRole('button', { name: 'Support the project' }));

    expect(await screen.findByText('That page could not be opened. Try again.')).toBeVisible();
  });

  it('takes the message away once a page opens', async () => {
    const user = userEvent.setup();
    const openProjectLink = vi
      .fn<MangaboundBridge['openProjectLink']>()
      .mockResolvedValueOnce({ ok: false, error: { code: 'x', said: raw('No.') } })
      .mockResolvedValueOnce({ ok: true, value: undefined });
    await renderAbout({ openProjectLink });

    await user.click(screen.getByRole('button', { name: 'Support the project' }));
    await screen.findByText('That page could not be opened. Try again.');
    await user.click(screen.getByRole('button', { name: 'Support the project' }));

    await waitFor(() => {
      expect(
        screen.queryByText('That page could not be opened. Try again.'),
      ).not.toBeInTheDocument();
    });
  });

  it('keeps its sections apart, each with a heading', async () => {
    await renderAbout();

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings.map((heading) => heading.textContent)).toEqual([
      'Learn more',
      'Support',
      'Credits',
      'License',
    ]);
    const support = screen.getByRole('heading', { name: 'Support' }).parentElement!;
    expect(within(support).getAllByRole('button')).toHaveLength(1);
  });
});
