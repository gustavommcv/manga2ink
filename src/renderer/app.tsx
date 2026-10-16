import { CircleAlert } from 'lucide-react';

import { resolveLanguage } from '@/domain/app-settings';
import { messagesFor } from '@/i18n/messages';
import { AppSettingsProvider } from '@/renderer/app-settings-provider';
import { Titlebar } from '@/renderer/components/shell/titlebar';
import { WorkflowApp } from '@/renderer/workflow-app';

/** Only the desktop entry reads the preload object; the workflow receives its interface. */
export function App(): React.JSX.Element {
  const bridge = window.mangabound;
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
      <div className="border-border min-h-0 flex-1 overflow-y-auto border-t">
        <main className="mx-auto max-w-6xl px-8 py-10">
          <section
            aria-label={words.label}
            className="border-status-failed/50 bg-status-failed/10 flex items-start gap-3 rounded-lg border p-4"
            role="alert"
          >
            <CircleAlert aria-hidden="true" className="text-status-failed mt-0.5 size-5 shrink-0" />
            <div>
              <h1 className="text-sm font-semibold">{words.title}</h1>
              <p className="text-muted-foreground mt-1 text-sm leading-6">{words.text}</p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
