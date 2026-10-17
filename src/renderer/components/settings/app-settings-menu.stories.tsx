import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { Language, LanguagePreference } from '@/domain/app-settings';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { Titlebar } from '@/renderer/components/shell/titlebar';
import type { AppSettingsBridge } from '@/renderer/hooks/use-app-settings';

import { AppSettingsMenu } from './app-settings-menu';
import type { AppSettingsTab } from './app-settings-tabs';
import { message, raw } from '@/domain/message';
import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';
import type { ToolchainStatus } from '@/shared/toolchain-status';

/** The tools the app ships, as they were checked at launch. */
const bundledTools: ToolchainStatus = {
  state: 'ready',
  target: 'linux-x64',
  message: message('toolchain.ready', {}),
  tools: [
    { name: 'mangabind', releaseTag: 'v0.7.2', state: 'ready', message: raw('Ready.') },
    { name: 'mangapress', releaseTag: 'v0.8.0', state: 'ready', message: raw('Ready.') },
  ],
};

/** Where the app works when nobody has chosen a folder, and when one has been. */
const ownPlaces: ProcessingFolderStatus = {
  chosen: null,
  scratch: '/tmp',
  pending: '/home/reader/.local/share/mangabound/pending',
  available: true,
  freeBytes: 38 * 1024 ** 3,
  earlier: [],
};
const onABigDrive: ProcessingFolderStatus = {
  chosen: '/mnt/books',
  scratch: '/mnt/books/Scratch',
  pending: '/mnt/books/Pending',
  available: true,
  freeBytes: 812 * 1024 ** 3,
  earlier: [{ folder: '/home/reader/.local/share/mangabound/pending', books: 3 }],
};

/** What the app settings were kept as, and what keeping a choice answers. */
function bridgeFor(
  kept: LanguagePreference,
  language: Language,
  keeps: AppSettingsBridge['saveAppSettings'],
  opens: AppSettingsBridge['openProjectLink'] = () =>
    Promise.resolve({ ok: true, value: undefined }),
  processing: Partial<AppSettingsBridge> = {},
): AppSettingsBridge {
  return {
    loadAppSettings: () =>
      Promise.resolve({
        ok: true,
        value: { settings: { language: kept }, language, unreadable: false },
      }),
    saveAppSettings: keeps,
    openProjectLink: opens,
    runtime: { electron: '44.3.0', platform: 'win32', version: '0.1.0-alpha.15' },
    getToolchainStatus: () => Promise.resolve(bundledTools),
    copyDiagnostics: () => Promise.resolve({ ok: true, value: undefined }),
    openAppFolder: () => Promise.resolve({ ok: true, value: undefined }),
    getProcessingFolder: () => Promise.resolve({ ok: true, value: ownPlaces }),
    chooseProcessingFolder: () => Promise.resolve({ ok: true, value: null }),
    useDefaultProcessingFolder: () => Promise.resolve({ ok: true, value: ownPlaces }),
    ...processing,
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
    id: 'interface',
    label: (messages) => messages.appSettings.interface,
    Panel: () => <p>Interface settings.</p>,
  },
  { id: 'folders', label: () => 'Folders', Panel: () => <p>Folder settings.</p> },
];

/** What the dialog looks like with a tab that is not there yet: the same size, whatever the tab holds. */
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

/** The About tab: the logo, the version, and where to go from here. */
export const About: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'About' }));

    const panel = within(dialog).getByRole('tabpanel', { name: 'About' });
    await expect(panel).toHaveTextContent('Version 0.1.0-alpha.15');
    await expect(await within(panel).findByText('mangabind')).toBeVisible();
    await expect(within(panel).getByText(/v0\.8\.0/u)).toBeVisible();
    await expect(within(panel).getByRole('button', { name: 'Release notes' })).toBeVisible();
    await expect(within(panel).getByRole('button', { name: 'Support the project' })).toBeVisible();
    await expect(within(panel).getByRole('button', { name: 'User guide' })).toBeVisible();
  },
};

export const AboutInPortuguese: Story = {
  parameters: { bridge: bridgeFor('pt-BR', 'pt-BR', keepsIt) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Configurações do app' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'Configurações do app',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Sobre' }));

    await expect(within(dialog).getByRole('tabpanel', { name: 'Sobre' })).toHaveTextContent(
      'Versão 0.1.0-alpha.15',
    );
  },
};

export const WhenAPageCannotBeOpened: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', keepsIt, () =>
      Promise.resolve({ ok: false, error: { code: 'unexpected_failure', said: raw('No.') } }),
    ),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'About' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Support the project' }));

    await expect(
      await within(dialog).findByText('That page could not be opened. Try again.'),
    ).toBeVisible();
  },
};

/** The Updates tab: the app cannot update itself yet, and the choices are drawn and cannot be changed. */
export const Updates: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Updates' }));

    await expect(within(dialog).getByRole('status', { name: 'Not available yet' })).toBeVisible();
    await expect(within(dialog).getByRole('button', { name: 'Check for updates' })).toBeDisabled();
  },
};

/** The Processing tab, with the app in its own places. */
export const Processing: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Processing' }));

    const panel = within(dialog).getByRole('tabpanel', { name: 'Processing' });
    await expect(await within(panel).findByText('Chosen by Mangabound')).toBeVisible();
    await expect(
      within(panel).getByRole('button', { name: 'Use the default folder' }),
    ).toBeDisabled();
  },
};

/** A folder is chosen, and books are still waiting in the place the app used before. */
export const ProcessingInAChosenFolder: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', keepsIt, undefined, {
      getProcessingFolder: () => Promise.resolve({ ok: true, value: onABigDrive }),
    }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Processing' }));

    const panel = within(dialog).getByRole('tabpanel', { name: 'Processing' });
    await expect(await within(panel).findByText('/mnt/books/Pending')).toBeVisible();
    await expect(within(panel).getByText('3 books')).toBeVisible();
    await expect(
      within(panel).getByRole('button', { name: 'Use the default folder' }),
    ).toBeEnabled();
  },
};

export const ProcessingInPortuguese: Story = {
  parameters: {
    bridge: bridgeFor('pt-BR', 'pt-BR', keepsIt, undefined, {
      getProcessingFolder: () => Promise.resolve({ ok: true, value: onABigDrive }),
    }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Configurações do app' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'Configurações do app',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Processamento' }));

    const panel = within(dialog).getByRole('tabpanel', { name: 'Processamento' });
    await expect(await within(panel).findByText('3 livros')).toBeVisible();
    await expect(within(panel).getByText('Pasta de trabalho')).toBeVisible();
  },
};

/** The drive of the folder is not connected: the tab says nothing can be converted until it is. */
export const ProcessingFolderNotAvailable: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', keepsIt, undefined, {
      getProcessingFolder: () =>
        Promise.resolve({ ok: true, value: { ...onABigDrive, available: false, freeBytes: null } }),
    }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Processing' }));

    await expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'The working folder is not available.',
    );
  },
};

/** Choosing a folder shows what the main process answers; refusing says why. */
export const ChoosingAFolder: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', keepsIt, undefined, {
      chooseProcessingFolder: () => Promise.resolve({ ok: true, value: onABigDrive }),
    }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Processing' }));

    await userEvent.click(await within(dialog).findByRole('button', { name: 'Choose a folder…' }));

    await expect(await within(dialog).findByText('/mnt/books/Scratch')).toBeVisible();
  },
};

export const WhenAFolderCannotBeUsed: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', keepsIt, undefined, {
      chooseProcessingFolder: () =>
        Promise.resolve({
          ok: false,
          error: {
            code: 'processing_folder_unusable',
            said: message('failure.processingFolderUnusable', { folder: '/read-only' }),
          },
        }),
    }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Processing' }));

    await userEvent.click(await within(dialog).findByRole('button', { name: 'Choose a folder…' }));

    await expect(
      await within(dialog).findByText(
        'Mangabound cannot work in /read-only. Choose a folder it can write in.',
      ),
    ).toBeVisible();
  },
};
