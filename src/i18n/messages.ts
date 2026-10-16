import type { Language } from '@/domain/app-settings';

import { type AboutMessages, aboutMessages } from './about-messages';
import { type AppSettingsMessages, appSettingsMessages } from './app-settings-messages';
import { modeSaid } from './mode-said';
import { type QueueMessages, queueMessages } from './queue-messages';
import { queueSaid } from './queue-said';
import type { Said } from './say';
import { type SettingsMessages, settingsMessages } from './settings-messages';
import { type SharedMessages, sharedMessages } from './shared-messages';
import { textSaid } from './text-said';

/**
 * Everything the window says, grouped by the part of the app it belongs to (ADR 0052). A part is
 * a module of its own with its messages for every language, so one that is missing in a language
 * is a compile error, and adding a part is a module and a line here.
 */
export interface Messages {
  readonly about: AboutMessages;
  readonly appSettings: AppSettingsMessages;
  readonly queue: QueueMessages;
  readonly settings: SettingsMessages;
  readonly shared: SharedMessages;
  /** What the domain, the workflows and the main process say by code (ADR 0053). */
  readonly said: Said;
}

function build(language: Language): Messages {
  return {
    about: aboutMessages[language],
    appSettings: appSettingsMessages[language],
    queue: queueMessages[language],
    settings: settingsMessages[language],
    shared: sharedMessages[language],
    said: { ...queueSaid[language], ...modeSaid[language], ...textSaid[language] },
  };
}

const catalogs: Readonly<Record<Language, Messages>> = {
  en: build('en'),
  'pt-BR': build('pt-BR'),
};

/** The messages of a language: always the same object, so a component can depend on it. */
export function messagesFor(language: Language): Messages {
  return catalogs[language];
}

/**
 * A language in itself, as the list a person chooses from writes it: someone in the wrong language
 * can still find their own.
 */
export const languageNames: Readonly<Record<Language, string>> = {
  en: 'English',
  'pt-BR': 'Português (Brasil)',
};
