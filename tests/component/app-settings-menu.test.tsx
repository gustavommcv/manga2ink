import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { AppSettingsMenu } from '@/renderer/components/settings/app-settings-menu';
import {
  type AppSettingsTab,
  appSettingsTabs,
} from '@/renderer/components/settings/app-settings-tabs';
import { languages } from '@/domain/app-settings';
import { messagesFor } from '@/i18n/messages';
import type { MangaboundBridge } from '@/shared/runtime-info';

import { inertBridge } from './support/bridge';

const reading =
  (language: 'en' | 'pt-BR'): MangaboundBridge['loadAppSettings'] =>
  () =>
    Promise.resolve({ ok: true, value: { settings: { language }, language, unreadable: false } });

/** Two tabs that say what is in them, so the way the dialog is made can be seen on its own. */
const twoTabs: readonly [AppSettingsTab, ...AppSettingsTab[]] = [
  { id: 'first', label: () => 'First tab', Panel: () => <p>What the first tab holds</p> },
  { id: 'second', label: () => 'Second tab', Panel: () => <p>What the second tab holds</p> },
];

async function renderMenu(
  options: {
    readonly language?: 'en' | 'pt-BR';
    readonly tabs?: readonly [AppSettingsTab, ...AppSettingsTab[]];
  } = {},
): Promise<void> {
  const bridge = inertBridge({ loadAppSettings: reading(options.language ?? 'en') });
  render(
    <AppSettingsProvider bridge={bridge}>
      <AppSettingsMenu {...(options.tabs === undefined ? {} : { tabs: options.tabs })} />
    </AppSettingsProvider>,
  );
  await screen.findByRole('button');
}

describe('the gear on the title bar', () => {
  it('is a button that opens a dialog, named in the language of the window', async () => {
    await renderMenu();

    const gear = screen.getByRole('button', { name: 'App settings' });
    expect(gear).toHaveAttribute('aria-haspopup', 'dialog');
    expect(gear).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('has the name of the language that is in use', async () => {
    await renderMenu({ language: 'pt-BR' });

    expect(screen.getByRole('button', { name: 'Configurações do app' })).toBeVisible();
  });
});

describe('the dialog of the app settings', () => {
  it('opens as a modal dialog with a title and a description, and says that it is open', async () => {
    const user = userEvent.setup();
    await renderMenu();

    await user.click(screen.getByRole('button', { name: 'App settings' }));

    const dialog = await screen.findByRole('dialog', { name: 'App settings' });
    expect(dialog).toHaveAccessibleDescription(
      'Choices about the app itself. Each change is kept as you make it.',
    );
    // The rest of the window is hidden from assistive technology while the dialog is open.
    expect(screen.getByRole('button', { name: 'App settings', hidden: true })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('is in the language of the window', async () => {
    const user = userEvent.setup();
    await renderMenu({ language: 'pt-BR' });

    await user.click(screen.getByRole('button', { name: 'Configurações do app' }));

    expect(
      await screen.findByRole('dialog', { name: 'Configurações do app' }),
    ).toHaveAccessibleDescription(
      'Escolhas sobre o próprio app. Cada mudança é guardada assim que você a faz.',
    );
    expect(screen.getByRole('button', { name: 'Fechar as configurações do app' })).toBeVisible();
  });

  it('puts the focus inside, and gives it back to the gear when it is closed with Escape', async () => {
    const user = userEvent.setup();
    await renderMenu();
    const gear = screen.getByRole('button', { name: 'App settings' });

    await user.click(gear);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gear).toHaveFocus();
  });

  it('is closed by its own button, and the gear gets the focus back', async () => {
    const user = userEvent.setup();
    await renderMenu();
    const gear = screen.getByRole('button', { name: 'App settings' });
    await user.click(gear);

    await user.click(await screen.findByRole('button', { name: 'Close app settings' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(gear).toHaveFocus();
  });

  it('holds the focus while it is open, so Tab does not leave it', async () => {
    const user = userEvent.setup();
    await renderMenu();
    await user.click(screen.getByRole('button', { name: 'App settings' }));
    const dialog = await screen.findByRole('dialog');

    for (let press = 0; press < 6; press += 1) await user.tab();

    expect(dialog).toContainElement(document.activeElement as HTMLElement);
  });
});

describe('the tabs of the dialog', () => {
  it('shows no row of tabs while there is only one', async () => {
    const user = userEvent.setup();
    await renderMenu({ tabs: [twoTabs[0]] });

    await user.click(screen.getByRole('button', { name: 'App settings' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('What the first tab holds')).toBeVisible();
    expect(within(dialog).queryByRole('tablist')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('tabpanel')).not.toBeInTheDocument();
  });

  it('opens on Interface, with the language, and has About beside it', async () => {
    const user = userEvent.setup();
    await renderMenu();

    await user.click(screen.getByRole('button', { name: 'App settings' }));

    const dialog = await screen.findByRole('dialog');
    const tabs = within(dialog).getByRole('tablist', { name: 'App settings sections' });
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Interface', 'About']);
    expect(within(tabs).getByRole('tab', { name: 'Interface' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(dialog).getByRole('combobox', { name: 'Language' })).toBeVisible();
    expect(within(dialog).queryByText('Support the project')).not.toBeInTheDocument();
  });

  it('shows About when it is chosen, and the language no longer', async () => {
    const user = userEvent.setup();
    await renderMenu();
    await user.click(screen.getByRole('button', { name: 'App settings' }));

    await user.click(await screen.findByRole('tab', { name: 'About' }));

    const panel = screen.getByRole('tabpanel', { name: 'About' });
    expect(within(panel).getByRole('button', { name: 'Support the project' })).toBeVisible();
    expect(screen.queryByRole('combobox', { name: 'Language' })).not.toBeInTheDocument();
  });

  it('shows a row of tabs, named, once there is more than one, with the first open', async () => {
    const user = userEvent.setup();
    await renderMenu({ tabs: twoTabs });

    await user.click(screen.getByRole('button', { name: 'App settings' }));

    const dialog = await screen.findByRole('dialog');
    const tabs = within(dialog).getByRole('tablist', { name: 'App settings sections' });
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['First tab', 'Second tab']);
    expect(within(tabs).getByRole('tab', { name: 'First tab' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(dialog).getByRole('tabpanel', { name: 'First tab' })).toHaveTextContent(
      'What the first tab holds',
    );
    expect(within(dialog).queryByText('What the second tab holds')).not.toBeInTheDocument();
  });

  it('shows what a tab holds when it is chosen, and only that', async () => {
    const user = userEvent.setup();
    await renderMenu({ tabs: twoTabs });
    await user.click(screen.getByRole('button', { name: 'App settings' }));

    await user.click(await screen.findByRole('tab', { name: 'Second tab' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('tabpanel', { name: 'Second tab' })).toHaveTextContent(
      'What the second tab holds',
    );
    expect(within(dialog).queryByText('What the first tab holds')).not.toBeInTheDocument();
  });

  it('is moved along by the arrow keys, as tabs are', async () => {
    const user = userEvent.setup();
    await renderMenu({ tabs: twoTabs });
    await user.click(screen.getByRole('button', { name: 'App settings' }));
    const first = await screen.findByRole('tab', { name: 'First tab' });
    first.focus();

    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Second tab' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('What the second tab holds');
  });

  it('starts from the first tab again each time it is opened', async () => {
    const user = userEvent.setup();
    await renderMenu({ tabs: twoTabs });
    await user.click(screen.getByRole('button', { name: 'App settings' }));
    await user.click(await screen.findByRole('tab', { name: 'Second tab' }));
    await user.keyboard('{Escape}');

    await user.click(screen.getByRole('button', { name: 'App settings' }));

    expect(await screen.findByRole('tab', { name: 'First tab' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});

describe('the list of tabs of the app', () => {
  it('starts with Interface and ends with About', () => {
    expect(appSettingsTabs.map((tab) => tab.id)).toEqual(['interface', 'about']);
  });

  it('has a different id for each tab, since the id is what names a tab and its panel', () => {
    const ids = appSettingsTabs.map((tab) => tab.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(languages)('names every tab in %s', (language) => {
    for (const tab of appSettingsTabs) {
      expect(tab.label(messagesFor(language)).trim()).not.toBe('');
    }
    expect(appSettingsTabs.map((tab) => tab.label(messagesFor('pt-BR')))).toEqual([
      'Interface',
      'Sobre',
    ]);
  });
});
