import type { Language } from '@/domain/app-settings';
import { I18nContext } from '@/renderer/hooks/use-messages';
import { messagesFor } from '@/i18n/messages';

/** Draws something in a language of the app, as the provider would, without reading anything. */
export function inLanguage(language: Language, ui: React.ReactNode): React.JSX.Element {
  return (
    <I18nContext.Provider value={{ language, messages: messagesFor(language) }}>
      {ui}
    </I18nContext.Provider>
  );
}

/** The same, in Brazilian Portuguese. */
export const inPortuguese = (ui: React.ReactNode): React.JSX.Element => inLanguage('pt-BR', ui);
