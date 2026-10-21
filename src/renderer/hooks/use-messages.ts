import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react';

import { defaultLanguage, type Language } from '@/domain/app-settings';
import type { AnyMessage } from '@/domain/message';
import { type Messages, messagesFor } from '@/i18n/messages';
import { type SentenceMarks, sentenceMarks } from '@/i18n/sentence-marks';
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

/** What the language of the window puts between sentences, and to end one that a screen puts together. */
export function useSentenceMarks(): SentenceMarks {
  return sentenceMarks[useLanguage()];
}

/** Writes what the domain, the workflows and the main process say by code (ADR 0053), in the language of the window. */
export function useSay(): {
  /** One message as a sentence. */
  readonly say: (message: AnyMessage) => string;
  /** Messages that follow one another as the sentences of one note. */
  readonly sayAll: (messages: readonly AnyMessage[]) => string;
} {
  const { language, messages } = useContext(I18nContext);
  const { said } = messages;
  return useMemo(
    () => ({
      say: (message) => say(said, message),
      sayAll: (many) => sayAll(said, many, sentenceMarks[language].gap),
    }),
    [said, language],
  );
}

/**
 * Writes a message in the language the window is in when it is written, not when the effect that
 * says it began. The function never changes, so an effect that depends on it does not start again
 * because the language did.
 */
export function useSayLater(): (message: AnyMessage) => string {
  const { say: sayNow } = useSay();
  const latest = useRef(sayNow);
  useEffect(() => {
    latest.current = sayNow;
  }, [sayNow]);
  return useCallback((one) => latest.current(one), []);
}
