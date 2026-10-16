import { useEffect, useMemo } from 'react';

import { defaultLanguage } from '@/domain/app-settings';
import {
  type AppSettingsBridge,
  AppSettingsContext,
  useAppSettingsState,
} from '@/renderer/hooks/use-app-settings';
import { I18nContext } from '@/renderer/hooks/use-messages';
import { messagesFor } from '@/renderer/i18n/messages';

/**
 * Reads what a person decided about the app (ADR 0052) and gives everything under it the language
 * and its messages, and the way to change them. It draws nothing until they are read, which is
 * a moment, so nothing is drawn in a language that is about to change.
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

  // The page says which language it is in, for the readers that speak it.
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  if (state === undefined) return null;
  return (
    <AppSettingsContext.Provider value={state}>
      <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>
    </AppSettingsContext.Provider>
  );
}
