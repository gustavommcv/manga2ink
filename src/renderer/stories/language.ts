import { defaultLanguage, type Language, languages } from '@/domain/app-settings';
import { type Messages, messagesFor } from '@/i18n/messages';

/**
 * The language a story is shown in: the one of the toolbar or of the address (`globals=language:…`),
 * English when there is none or it is not one of the app's.
 */
export function languageOf(globals: Readonly<Record<string, unknown>>): Language {
  const chosen = globals.language;
  return languages.find((language) => language === chosen) ?? defaultLanguage;
}

/** What the window says in the language a story is shown in, for a story that acts on the screen. */
export function wordsOf(globals: Readonly<Record<string, unknown>>): Messages {
  return messagesFor(languageOf(globals));
}
