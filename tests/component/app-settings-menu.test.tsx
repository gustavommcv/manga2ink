import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
    readonly platform?: NodeJS.Platform;
    readonly tabs?: readonly [AppSettingsTab, ...AppSettingsTab[]];
  } = {},
): Promise<void> {
  const bridge = inertBridge({
    loadAppSettings: reading(options.language ?? 'en'),
    runtime: { electron: '44.3.0', platform: options.platform ?? 'win32', version: '0.1.0' },
  });
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

  it('opens on Interface, with the language, and has Processing, Updates and About beside it', async () => {
    const user = userEvent.setup();
    await renderMenu();

    await user.click(screen.getByRole('button', { name: 'App settings' }));

    const dialog = await screen.findByRole('dialog');
    const tabs = within(dialog).getByRole('tablist', { name: 'App settings sections' });
    expect(
      within(tabs)
        .getAllByRole('tab')
        .map((tab) => tab.textContent),
    ).toEqual(['Interface', 'Processing', 'Updates', 'About']);
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

  it('names the tab above its panel, as the heading of what is shown', async () => {
    const user = userEvent.setup();
    await renderMenu({ tabs: twoTabs });
    await user.click(screen.getByRole('button', { name: 'App settings' }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByRole('heading', { name: 'First tab', level: 3 })).toBeVisible();

    await user.click(within(dialog).getByRole('tab', { name: 'Second tab' }));

    expect(within(dialog).getByRole('heading', { name: 'Second tab', level: 3 })).toBeVisible();
    expect(within(dialog).queryByRole('heading', { name: 'First tab' })).not.toBeInTheDocument();
  });

  it('is moved along in both directions, round the ends and to the ends, by the keys of a list', async () => {
    const user = userEvent.setup();
    await renderMenu();
    await user.click(screen.getByRole('button', { name: 'App settings' }));
    const interfaceTab = await screen.findByRole('tab', { name: 'Interface' });
    interfaceTab.focus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Processing' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'Updates' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('tab', { name: 'About' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(interfaceTab).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('tab', { name: 'About' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(interfaceTab).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: 'About' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: 'Updates' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Not available yet');
  });

  it('leaves the other keys alone, and keeps one tab in the order of Tab', async () => {
    const user = userEvent.setup();
    await renderMenu();
    await user.click(screen.getByRole('button', { name: 'App settings' }));
    const interfaceTab = await screen.findByRole('tab', { name: 'Interface' });
    interfaceTab.focus();

    await user.keyboard('a');

    expect(interfaceTab).toHaveFocus();
    expect(screen.getByRole('tab', { name: 'Updates' })).toHaveAttribute('tabindex', '-1');
    expect(interfaceTab).toHaveAttribute('tabindex', '0');
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

describe('the keys that open the app settings', () => {
  it('open the dialog with Ctrl+, on Windows, wherever the focus is in the window', async () => {
    const user = userEvent.setup();
    await renderMenu({ platform: 'win32' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.keyboard('{Control>},{/Control}');

    expect(await screen.findByRole('dialog', { name: 'App settings' })).toBeVisible();
  });

  it('open it with Ctrl+, on Linux, and with Cmd+, on macOS', async () => {
    const user = userEvent.setup();
    await renderMenu({ platform: 'linux' });
    await user.keyboard('{Control>},{/Control}');
    expect(await screen.findByRole('dialog')).toBeVisible();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    cleanup();

    await renderMenu({ platform: 'darwin' });
    await user.keyboard('{Meta>},{/Meta}');
    expect(await screen.findByRole('dialog')).toBeVisible();
  });

  it('leave it shut when the keys are the wrong ones for the system, or not these at all', async () => {
    const user = userEvent.setup();
    await renderMenu({ platform: 'darwin' });

    await user.keyboard('{Control>},{/Control}');
    await user.keyboard(',');
    await user.keyboard('{Meta>}a{/Meta}');
    await user.keyboard('{Meta>}{Shift>},{/Shift}{/Meta}');
    await user.keyboard('{Meta>}{Alt>},{/Alt}{/Meta}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('do not type the comma, nor do what the page would do with them', async () => {
    const user = userEvent.setup();
    await renderMenu();
    const typed = vi.fn<(event: KeyboardEvent) => void>();
    window.addEventListener('keydown', typed);

    await user.keyboard('{Control>},{/Control}');

    const comma = typed.mock.calls.map(([event]) => event).find((event) => event.key === ',');
    expect(comma?.defaultPrevented).toBe(true);
    window.removeEventListener('keydown', typed);
  });

  it('keep the dialog open when they are pressed while it is, and the gear still closes it by Escape', async () => {
    const user = userEvent.setup();
    await renderMenu();
    await user.keyboard('{Control>},{/Control}');
    await screen.findByRole('dialog');

    await user.keyboard('{Control>},{/Control}');

    expect(screen.getByRole('dialog')).toBeVisible();
    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('are given up when the menu goes, so a page without it does not open a dialog', async () => {
    const user = userEvent.setup();
    await renderMenu();
    cleanup();

    await user.keyboard('{Control>},{/Control}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('are announced on the gear, and shown when the pointer rests on it, as the system writes them', async () => {
    await renderMenu({ platform: 'win32' });
    let gear = screen.getByRole('button', { name: 'App settings' });
    expect(gear).toHaveAttribute('aria-keyshortcuts', 'Control+,');
    expect(gear).toHaveAttribute('title', 'App settings (Ctrl+,)');
    cleanup();

    await renderMenu({ platform: 'darwin', language: 'pt-BR' });
    gear = screen.getByRole('button', { name: 'Configurações do app' });
    expect(gear).toHaveAttribute('aria-keyshortcuts', 'Meta+,');
    expect(gear).toHaveAttribute('title', 'Configurações do app (⌘,)');
  });

  it('still open the dialog by a click, and tell when it closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AppSettingsProvider bridge={inertBridge({ loadAppSettings: reading('en') })}>
        <AppSettingsMenu onClose={onClose} />
      </AppSettingsProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'App settings' }));
    expect(await screen.findByRole('dialog')).toBeVisible();
    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('what the dialog tells when it is closed', () => {
  it('tells it once, when it closes, and not when it opens', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <AppSettingsProvider bridge={inertBridge({ loadAppSettings: reading('en') })}>
        <AppSettingsMenu onClose={onClose} />
      </AppSettingsProvider>,
    );

    await user.click(await screen.findByRole('button', { name: 'App settings' }));
    await screen.findByRole('dialog');
    expect(onClose).not.toHaveBeenCalled();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('closes just the same when nobody listens', async () => {
    const user = userEvent.setup();
    await renderMenu();

    await user.click(screen.getByRole('button', { name: 'App settings' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('the list of tabs of the app', () => {
  it('starts with Interface, ends with About and has Processing and Updates between them', () => {
    expect(appSettingsTabs.map((tab) => tab.id)).toEqual([
      'interface',
      'processing',
      'updates',
      'about',
    ]);
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
      'Processamento',
      'Atualizações',
      'Sobre',
    ]);
  });
});
