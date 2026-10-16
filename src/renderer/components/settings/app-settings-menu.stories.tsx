import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { Language, LanguagePreference } from '@/domain/app-settings';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { Titlebar } from '@/renderer/components/shell/titlebar';
import type { AppSettingsBridge } from '@/renderer/hooks/use-app-settings';

import { AppSettingsMenu } from './app-settings-menu';
import type { AppSettingsTab } from './app-settings-tabs';
import { raw } from '@/domain/message';

/** What the app settings were kept as, and what keeping a choice answers. */
function bridgeFor(
  kept: LanguagePreference,
  language: Language,
  keeps: AppSettingsBridge['saveAppSettings'],
): AppSettingsBridge {
  return {
    loadAppSettings: () =>
      Promise.resolve({
        ok: true,
        value: { settings: { language: kept }, language, unreadable: false },
      }),
    saveAppSettings: keeps,
  };
}

const keepsIt: AppSettingsBridge['saveAppSettings'] = (command) =>
  Promise.resolve({
    ok: true,
    value: { language: command.language === 'pt-BR' ? 'pt-BR' : 'en' },
  });

/** The gear sits where it does in the window: on the right of the title bar, over a page. */
const inTheWindow: Decorator = (Story, { parameters }) => (
  <AppSettingsProvider
    bridge={(parameters.bridge as AppSettingsBridge | undefined) ?? bridgeFor('en', 'en', keepsIt)}
  >
    <div className="bg-background text-foreground min-h-[34rem]">
      <Titlebar platform="win32" version="0.1.0-alpha.15">
        <Story />
      </Titlebar>
      <div className="border-border border-t">
        <p className="text-muted-foreground px-8 py-10 text-sm">The page under the title bar.</p>
      </div>
    </div>
  </AppSettingsProvider>
);

const meta = {
  title: 'Settings/App settings dialog',
  component: AppSettingsMenu,
  decorators: [inTheWindow],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppSettingsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/*
 * The dialog is drawn outside the story's root, so the whole document is what is looked at:
 * `within(canvasElement.ownerDocument.body)`.
 */

export const Closed: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('button', { name: 'App settings' })).toBeVisible();
  },
};

export const Open: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await expect(within(dialog).getByRole('combobox', { name: 'Language' })).toBeVisible();
  },
};

export const InPortuguese: Story = {
  parameters: { bridge: bridgeFor('pt-BR', 'pt-BR', keepsIt) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Configurações do app' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'Configurações do app',
    });
    await expect(within(dialog).getByRole('combobox', { name: 'Idioma' })).toHaveDisplayValue(
      'Português (Brasil)',
    );
  },
};

/** Choosing a language changes the dialog itself at once, and the title bar's gear with it. */
export const ChangingTheLanguage: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });

    await userEvent.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Language' }),
      'Português (Brasil)',
    );

    await waitFor(async () => {
      await expect(
        within(canvasElement.ownerDocument.body).getByRole('dialog', {
          name: 'Configurações do app',
        }),
      ).toBeVisible();
    });
  },
};

export const WhenTheLanguageCannotBeKept: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', () =>
      Promise.resolve({ ok: false, error: { code: 'settings_save_failed', said: raw('No.') } }),
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });

    await userEvent.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Language' }),
      'Português (Brasil)',
    );

    await expect(
      await within(dialog).findByText('The language could not be saved. Try again.'),
    ).toBeVisible();
  },
};

const twoTabs: readonly [AppSettingsTab, ...AppSettingsTab[]] = [
  {
    id: 'general',
    label: (messages) => messages.appSettings.general,
    Panel: () => <p>General settings.</p>,
  },
  { id: 'folders', label: () => 'Folders', Panel: () => <p>Folder settings.</p> },
];

/** What the dialog looks like once a second tab exists: a row of tabs appears above the panel. */
export const WithSeveralTabs: Story = {
  args: { tabs: twoTabs },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Folders' }));
    await expect(within(dialog).getByRole('tabpanel', { name: 'Folders' })).toHaveTextContent(
      'Folder settings.',
    );
  },
};
