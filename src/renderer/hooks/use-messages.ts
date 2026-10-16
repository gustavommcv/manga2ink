import { createContext, useContext, useMemo } from 'react';

import { defaultLanguage, type Language } from '@/domain/app-settings';
import type { AnyMessage } from '@/domain/message';
import { type Messages, messagesFor } from '@/i18n/messages';
import { say, sayAll } from '@/i18n/say';

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

/** Writes what the domain, the workflows and the main process say by code (ADR 0053), in the language of the window. */
export function useSay(): {
  /** One message as a sentence. */
  readonly say: (message: AnyMessage) => string;
  /** Messages that follow one another as the sentences of one note. */
  readonly sayAll: (messages: readonly AnyMessage[]) => string;
} {
  const { said } = useMessages();
  return useMemo(
    () => ({
      say: (message) => say(said, message),
      sayAll: (messages) => sayAll(said, messages),
    }),
    [said],
  );
}
