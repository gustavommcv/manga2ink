import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import type { Language, LanguagePreference } from '@/domain/app-settings';
import type { WaitingBooks } from '@/domain/pending-cleanup';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { Titlebar } from '@/renderer/components/shell/titlebar';
import type { AppSettingsBridge } from '@/renderer/hooks/use-app-settings';

import { AppSettingsMenu } from './app-settings-menu';
import type { AppSettingsTab } from './app-settings-tabs';
import { message, raw } from '@/domain/message';
import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';
import type { ToolchainStatus } from '@/shared/toolchain-status';
import { defaultAppSettings } from '@/domain/app-settings';

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
  waiting: { runs: 2, books: 5, bytes: 1.2 * 1024 ** 3 },
  earlier: [],
};
const onABigDrive: ProcessingFolderStatus = {
  chosen: '/mnt/books',
  scratch: '/mnt/books/Scratch',
  pending: '/mnt/books/Pending',
  available: true,
  freeBytes: 812 * 1024 ** 3,
  waiting: { runs: 1, books: 3, bytes: 480 * 1024 ** 2 },
  earlier: [{ folder: '/home/reader/.local/share/mangabound/pending', books: 3 }],
};

const noBooks: WaitingBooks = { runs: 0, books: 0, bytes: 0 };

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
        value: { settings: { ...defaultAppSettings, language: kept }, language, unreadable: false },
      }),
    saveAppSettings: keeps,
    openProjectLink: opens,
    runtime: { electron: '44.3.0', platform: 'win32', version: '0.1.0-alpha.15' },
    getToolchainStatus: () => Promise.resolve(bundledTools),
    checkForUpdates: () =>
      Promise.resolve({ ok: true, value: { status: 'current', version: '0.1.0-alpha.15' } }),
    copyDiagnostics: () => Promise.resolve({ ok: true, value: undefined }),
    openAppFolder: () => Promise.resolve({ ok: true, value: undefined }),
    getProcessingFolder: () => Promise.resolve({ ok: true, value: ownPlaces }),
    // A computer of twelve processor threads: three is what Automatic comes to, six the most.
    getConversionCapacity: () => Promise.resolve({ ok: true, value: { automatic: 3, most: 6 } }),
    chooseProcessingFolder: () => Promise.resolve({ ok: true, value: null }),
    useDefaultProcessingFolder: () => Promise.resolve({ ok: true, value: ownPlaces }),
    countIdlePending: () => Promise.resolve({ ok: true, value: noBooks }),
    deleteIdlePending: () => Promise.resolve({ ok: true, value: noBooks }),
    ...processing,
  };
}

const keepsIt: AppSettingsBridge['saveAppSettings'] = (command) =>
  Promise.resolve({
    ok: true,
    value: {
      language:
        command.language === undefined || command.language === 'system' ? 'en' : command.language,
    },
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

/** The keys that open it work wherever the focus is: the gear is not what is pressed. */
export const OpenedByTheKeyboard: Story = {
  play: async ({ canvas, canvasElement }) => {
    const gear = await canvas.findByRole('button', { name: 'App settings' });
    await expect(gear).toHaveAttribute('aria-keyshortcuts', 'Control+,');
    await expect(gear).toHaveAttribute('title', 'App settings (Ctrl+,)');

    await userEvent.keyboard('{Control>},{/Control}');

    await expect(
      await within(canvasElement.ownerDocument.body).findByRole('dialog', { name: 'App settings' }),
    ).toBeVisible();
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

/** Nothing about the theme was kept: the app looks as the system does, and the dialog says so (ADR 0070). */
export const LookingAsTheSystemDoes: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', keepsIt, undefined, {
      loadAppSettings: () =>
        Promise.resolve({
          ok: true,
          value: { settings: defaultAppSettings, language: 'en', unreadable: false },
        }),
    }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    const theme = within(dialog).getByRole('combobox', { name: 'Theme' });
    await expect(theme).toHaveDisplayValue('Automatic (system theme)');
    await expect(
      within(theme)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Automatic (system theme)', 'Dark (graphite)', 'Light (paper)']);
  },
};

/** What was kept is the light theme: the page is drawn in it, and the dialog says so (ADR 0067). */
export const InTheLightTheme: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', keepsIt, undefined, {
      loadAppSettings: () =>
        Promise.resolve({
          ok: true,
          value: {
            settings: { ...defaultAppSettings, theme: 'light' },
            language: 'en',
            unreadable: false,
          },
        }),
    }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await expect(within(dialog).getByRole('combobox', { name: 'Theme' })).toHaveDisplayValue(
      'Light (paper)',
    );
    await waitFor(async () => {
      await expect(document.documentElement.dataset.theme).toBe('light');
    });
  },
};

/** Choosing a theme keeps it and the page is in it at once, with no other change. */
export const ChoosingTheLightTheme: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Theme' }),
      'Light (paper)',
    );

    await waitFor(async () => {
      await expect(document.documentElement.dataset.theme).toBe('light');
    });
    await expect(within(dialog).getByRole('combobox', { name: 'Language' })).toHaveDisplayValue(
      'English',
    );
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

/**
 * The dialog in Japanese, which says under the choice of language that its text was written with the help
 * of AI and has not been read by many people who speak it, and where to report a mistake (ADR 0084).
 */
export const InJapanese: Story = {
  parameters: { bridge: bridgeFor('ja', 'ja', keepsIt) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'アプリの設定' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'アプリの設定',
    });
    await expect(within(dialog).getByRole('combobox', { name: '言語' })).toHaveDisplayValue(
      '日本語',
    );
    await expect(within(dialog).getByText(/AI の支援を受けて作られていて/u)).toBeVisible();
    await expect(within(dialog).getByRole('button', { name: '問題を報告' })).toBeVisible();
  },
};

/** The About tab in Japanese: the version, and where to go from here. */
export const AboutInJapanese: Story = {
  parameters: { bridge: bridgeFor('ja', 'ja', keepsIt) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'アプリの設定' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'アプリの設定',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'このアプリについて' }));

    await expect(
      within(dialog).getByRole('tabpanel', { name: 'このアプリについて' }),
    ).toHaveTextContent('バージョン 0.1.0-alpha.15');
  },
};

/** The Updates tab as it first opens, in Japanese: nothing is asked until the button is. */
export const UpdatesInJapanese: Story = {
  parameters: { bridge: bridgeFor('ja', 'ja', keepsIt) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'アプリの設定' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'アプリの設定',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: '更新' }));

    await expect(
      within(dialog).getByRole('status', { name: '更新は今のところ手動です' }),
    ).toBeVisible();
    await expect(within(dialog).getByRole('button', { name: '更新を確認' })).toBeEnabled();
  },
};

/** The Processing tab as it first opens, in Japanese: the app in its own places. */
export const ProcessingInOwnPlacesInJapanese: Story = {
  parameters: { bridge: bridgeFor('ja', 'ja', keepsIt) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'アプリの設定' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'アプリの設定',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: '処理' }));

    const panel = within(dialog).getByRole('tabpanel', { name: '処理' });
    await expect(await within(panel).findByText('Mangabound が選択')).toBeVisible();
    await expect(
      within(panel).getByRole('button', { name: '初期設定のフォルダーを使う' }),
    ).toBeDisabled();
    await expect(await within(panel).findByRole('combobox', { name: '並列変換' })).toHaveValue(
      'automatic',
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

/** The Updates tab before anything is asked: the check is a button, and the rest is drawn and cannot be changed. */
export const Updates: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Updates' }));

    await expect(
      within(dialog).getByRole('status', { name: 'Updates are manual for now' }),
    ).toBeVisible();
    await expect(within(dialog).getByRole('button', { name: 'Check for updates' })).toBeEnabled();
  },
};

/** The Updates tab as it first opens, in Brazilian Portuguese: nothing is asked until the button is. */
export const UpdatesInPortuguese: Story = {
  parameters: { bridge: bridgeFor('pt-BR', 'pt-BR', keepsIt) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Configurações do app' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'Configurações do app',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Atualizações' }));

    await expect(
      within(dialog).getByRole('status', { name: 'Atualizações manuais por enquanto' }),
    ).toBeVisible();
    await expect(within(dialog).getByRole('button', { name: 'Buscar atualizações' })).toBeEnabled();
  },
};

const newerVersion: AppSettingsBridge['checkForUpdates'] = () =>
  Promise.resolve({
    ok: true,
    value: {
      status: 'available',
      version: '0.1.0-alpha.16',
      tag: 'v0.1.0-alpha.16',
      publishedAt: '2026-10-20T10:00:00Z',
    },
  });

/** A newer version is out: it is said with its day, and a button opens the page to download it. */
export const UpdateAvailable: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', keepsIt, undefined, { checkForUpdates: newerVersion }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Updates' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Check for updates' }));

    await expect(
      await within(dialog).findByText(
        'A new version is available: 0.1.0-alpha.16, published on October 20, 2026.',
      ),
    ).toBeVisible();
    await expect(within(dialog).getByRole('button', { name: 'Download the update' })).toBeVisible();
  },
};

/** The same, in Brazilian Portuguese, with the date written as the language writes it. */
export const UpdateAvailableInPortuguese: Story = {
  parameters: {
    bridge: bridgeFor('pt-BR', 'pt-BR', keepsIt, undefined, { checkForUpdates: newerVersion }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Configurações do app' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'Configurações do app',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Atualizações' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Buscar atualizações' }));

    await expect(
      await within(dialog).findByText(
        'Há uma versão nova: 0.1.0-alpha.16, publicada em 20 de outubro de 2026.',
      ),
    ).toBeVisible();
    await expect(
      within(dialog).getByRole('button', { name: 'Baixar a atualização' }),
    ).toBeVisible();
  },
};

/** GitHub could not be asked: what went wrong is said, and the check can be made again. */
export const WhenTheCheckFails: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', keepsIt, undefined, {
      checkForUpdates: () =>
        Promise.resolve({
          ok: false,
          error: {
            code: 'network_error',
            said: message('provider.unreachable', { service: 'GitHub' }),
          },
        }),
    }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Updates' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Check for updates' }));

    await expect(await within(dialog).findByText('Could not reach GitHub.')).toBeVisible();
    await expect(within(dialog).getByRole('button', { name: 'Check for updates' })).toBeEnabled();
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

    // How many books of a title are converted at once starts on the app's own count. This story is
    // the one the guide's pictures of the tab are made from, so it is left as a person finds it.
    await expect(
      await within(panel).findByRole('combobox', { name: 'Parallel conversions' }),
    ).toHaveValue('automatic');
  },
};

/** A small computer: automatic comes to one, and two is the most that can be asked for. */
export const ProcessingOnASmallComputer: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', keepsIt, undefined, {
      getConversionCapacity: () => Promise.resolve({ ok: true, value: { automatic: 1, most: 2 } }),
    }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Processing' }));

    const panel = within(dialog).getByRole('tabpanel', { name: 'Processing' });
    const parallel = await within(panel).findByRole('combobox', { name: 'Parallel conversions' });
    await expect(
      within(parallel)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Automatic (1 on this computer)', '1', '2']);
  },
};

/** A number of conversions at once is chosen, and the number chosen is the one shown. */
export const ProcessingParallelConversions: Story = {
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Processing' }));

    const panel = within(dialog).getByRole('tabpanel', { name: 'Processing' });
    const parallel = await within(panel).findByRole('combobox', { name: 'Parallel conversions' });
    await expect(parallel).toHaveValue('automatic');
    await userEvent.selectOptions(parallel, '2');
    await expect(parallel).toHaveValue('2');
    await userEvent.selectOptions(parallel, 'automatic');
    await expect(parallel).toHaveValue('automatic');
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

/** The Processing tab as it first opens, in Brazilian Portuguese: the app in its own places. */
export const ProcessingInOwnPlacesInPortuguese: Story = {
  parameters: { bridge: bridgeFor('pt-BR', 'pt-BR', keepsIt) },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'Configurações do app' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'Configurações do app',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Processamento' }));

    const panel = within(dialog).getByRole('tabpanel', { name: 'Processamento' });
    await expect(await within(panel).findByText('Escolhida pelo Mangabound')).toBeVisible();
    await expect(within(panel).getByRole('button', { name: 'Usar a pasta padrão' })).toBeDisabled();
    await expect(
      await within(panel).findByRole('combobox', { name: 'Conversões em paralelo' }),
    ).toHaveValue('automatic');
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

const idleBooks: WaitingBooks = { runs: 1, books: 3, bytes: 480 * 1024 ** 2 };

/** Books have waited long: the clean-up asks what would go, says it, and deletes only when told to. */
export const ProcessingCleaningUp: Story = {
  parameters: {
    bridge: bridgeFor('en', 'en', keepsIt, undefined, {
      getProcessingFolder: () => Promise.resolve({ ok: true, value: onABigDrive }),
      countIdlePending: () => Promise.resolve({ ok: true, value: idleBooks }),
      deleteIdlePending: () => Promise.resolve({ ok: true, value: idleBooks }),
    }),
  },
  play: async ({ canvas, canvasElement }) => {
    await userEvent.click(await canvas.findByRole('button', { name: 'App settings' }));
    const dialog = await within(canvasElement.ownerDocument.body).findByRole('dialog', {
      name: 'App settings',
    });
    await userEvent.click(within(dialog).getByRole('tab', { name: 'Processing' }));

    const panel = within(dialog).getByRole('tabpanel', { name: 'Processing' });
    await expect(await within(panel).findByText(/3 books in 1 conversion/u)).toBeVisible();
    await userEvent.click(within(panel).getByRole('button', { name: 'Delete…' }));

    const question = await within(panel).findByRole('group');
    await expect(question).toHaveTextContent('Books that were not saved yet will be lost.');
    await userEvent.click(within(question).getByRole('button', { name: 'Delete' }));
    await expect(await within(panel).findByText('Deleted 1 conversion, 480 MB.')).toBeVisible();
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
