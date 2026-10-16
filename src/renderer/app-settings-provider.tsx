import { useEffect, useMemo } from 'react';

import { defaultLanguage } from '@/domain/app-settings';
import {
  type AppSettingsBridge,
  AppSettingsContext,
  useAppSettingsState,
} from '@/renderer/hooks/use-app-settings';
import { type AppInfo, AppInfoContext } from '@/renderer/hooks/use-app-info';
import { I18nContext } from '@/renderer/hooks/use-messages';
import { messagesFor } from '@/renderer/i18n/messages';

/**
 * Reads what a person decided about the app (ADR 0052) and gives everything under it the language
 * and its messages, and the way to change them, and what the app says about itself (its version, and
 * the way to open a place in the browser of the system, ADR 0053). It draws nothing until the
 * settings are read, which is a moment, so nothing is drawn in a language that is about to change.
 */
export function AppSettingsProvider({
  bridge,
  children,
}: {
  readonly bridge: AppSettingsBridge;
  readonly children: React.ReactNode;
}): React.JSX.Element | null {
  const state = useAppSettingsState(bridge);
  const language = state?.language ?? defaultLanguage;
  const i18n = useMemo(() => ({ language, messages: messagesFor(language) }), [language]);
  const info = useMemo<AppInfo>(
    () => ({
      version: bridge.runtime.version,
      openLink: async (link) => {
        try {
          return (await bridge.openProjectLink({ link, language })).ok;
        } catch {
          return false;
        }
      },
    }),
    [bridge, language],
  );

  // The page says which language it is in, for the readers that speak it.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  if (state === undefined) return null;
  return (
    <AppSettingsContext.Provider value={state}>
      <AppInfoContext.Provider value={info}>
        <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>
      </AppInfoContext.Provider>
    </AppSettingsContext.Provider>
  );
}
