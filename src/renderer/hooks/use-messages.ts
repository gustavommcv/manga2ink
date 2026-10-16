import { createContext, useContext } from 'react';

import { defaultLanguage, type Language } from '@/domain/app-settings';
import { type Messages, messagesFor } from '@/renderer/i18n/messages';

/** The language the window is in, and everything it says in it (ADR 0052). */
export interface I18n {
  readonly language: Language;
  readonly messages: Messages;
}

/**
 * Without an `AppSettingsProvider` the window speaks English, so a part of it can be drawn on its
 * own, in a story or a test, as it is written. The window itself always has the provider.
 */
export const I18nContext = createContext<I18n>({
  language: defaultLanguage,
  messages: messagesFor(defaultLanguage),
});

/** What the window says, in its language. */
export function useMessages(): Messages {
  return useContext(I18nContext).messages;
}

/** The language the window is in. */
export function useLanguage(): Language {
  return useContext(I18nContext).language;
}
