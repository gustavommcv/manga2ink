import { CircleAlert } from 'lucide-react';

import { resolveLanguage } from '@/domain/app-settings';
import { messagesFor } from '@/i18n/messages';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { Callout } from '@/renderer/components/shared/callout';
import { Page } from '@/renderer/components/shell/page';
import { Titlebar } from '@/renderer/components/shell/titlebar';
import { WorkflowApp } from '@/renderer/workflow-app';

/** Only the desktop entry reads the preload object; the workflow receives its interface. */
export function App(): React.JSX.Element {
  const bridge = window.manga2ink;
  if (bridge !== undefined) {
    return (
      <AppSettingsProvider bridge={bridge}>
        <WorkflowApp bridge={bridge} />
      </AppSettingsProvider>
    );
  }

  // The settings cannot be read without the bridge, so the language is the system's.
  const language = resolveLanguage('system', window.navigator.languages);
  const words = messagesFor(language).shared.startup;
  return (
    <div className="bg-background text-foreground flex h-screen flex-col">
      <Titlebar />
      <Page>
        <Callout
          aria-label={words.label}
          icon={CircleAlert}
          level={1}
          role="alert"
          title={words.title}
          tone="failed"
        >
          {words.text}
        </Callout>
      </Page>
    </div>
  );
}
