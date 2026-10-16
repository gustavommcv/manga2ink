import { GeneralTab } from '@/renderer/components/settings/general-tab';
import type { Messages } from '@/i18n/messages';

/**
 * One thing a person decides about the app (ADR 0052): a name for the tab, and what it holds. The
 * panel reads what it needs and keeps what it changes by itself, so the dialog knows nothing of
 * what is in it, and a tab is added without touching the dialog.
 */
export interface AppSettingsTab {
  /** Stable, and not shown: it names the tab and the panel for assistive technology. */
  readonly id: string;
  /** The name on the tab, in the language of the window. */
  readonly label: (messages: Messages) => string;
  readonly Panel: React.ComponentType;
}

/** What the dialog holds, in the order of its tabs. The first is the one that opens. */
export const appSettingsTabs: readonly [AppSettingsTab, ...AppSettingsTab[]] = [
  { id: 'general', label: (messages) => messages.appSettings.general, Panel: GeneralTab },
];
