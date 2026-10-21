import type { Language } from '@/domain/app-settings';

import { type AboutMessages, aboutMessages } from './about-messages';
import { type AppSettingsMessages, appSettingsMessages } from './app-settings-messages';
import { type DialogMessages, dialogMessages } from './dialog-messages';
import { type DetailsMessages, detailsMessages } from './details-messages';
import { failureSaid } from './failure-said';
import { inputSaid } from './input-said';
import { type LibraryMessages, libraryMessages } from './library-messages';
import { libraryCoversSaid } from './library-said';
import { mappingSaid } from './mapping-said';
import { type MappingMessages, mappingMessages } from './mapping-messages';
import { modeSaid } from './mode-said';
import { noticeSaid } from './notice-said';
import { type OptionFieldsMessages, optionFieldsMessages } from './option-fields-messages';
import { type OptionsMessages, optionsMessages } from './options-messages';
import { optionsSaid } from './options-said';
import { providerSaid } from './provider-said';
import { type ProcessingMessages, processingMessages } from './processing-messages';
import { type QueueMessages, queueMessages } from './queue-messages';
import { queueSaid } from './queue-said';
import { type ResultsMessages, resultsMessages } from './results-messages';
import { runSaid } from './run-said';
import { type RunningMessages, runningMessages } from './running-messages';
import { saveSaid } from './save-said';
import type { Said } from './say';
import { type SettingsMessages, settingsMessages } from './settings-messages';
import { type SharedMessages, sharedMessages } from './shared-messages';
import { type SharingMessages, sharingMessages } from './sharing-messages';
import { textSaid } from './text-said';
import { toolchainSaid } from './toolchain-said';
import { type UpdatesMessages, updatesMessages } from './updates-messages';
import { warningSaid } from './warnings-said';
import { workflowSaid } from './workflow-said';

/**
 * Everything the window says, grouped by the part of the app it belongs to (ADR 0052). A part is
 * a module of its own with its messages for every language, so one that is missing in a language
 * is a compile error, and adding a part is a module and a line here.
 */
export interface Messages {
  readonly about: AboutMessages;
  readonly appSettings: AppSettingsMessages;
  /** What the main process gives the native dialogs to say. */
  readonly dialogs: DialogMessages;
  readonly processing: ProcessingMessages;
  readonly mapping: MappingMessages;
  readonly library: LibraryMessages;
  readonly details: DetailsMessages;
  readonly options: OptionsMessages;
  readonly fields: OptionFieldsMessages;
  readonly queue: QueueMessages;
  readonly running: RunningMessages;
  readonly results: ResultsMessages;
  readonly settings: SettingsMessages;
  readonly shared: SharedMessages;
  readonly sharing: SharingMessages;
  readonly updates: UpdatesMessages;
  /** What the domain, the workflows and the main process say by code (ADR 0053). */
  readonly said: Said;
}

function build(language: Language): Messages {
  return {
    about: aboutMessages[language],
    appSettings: appSettingsMessages[language],
    dialogs: dialogMessages[language],
    processing: processingMessages[language],
    mapping: mappingMessages[language],
    library: libraryMessages[language],
    details: detailsMessages[language],
    options: optionsMessages[language],
    fields: optionFieldsMessages[language],
    queue: queueMessages[language],
    running: runningMessages[language],
    results: resultsMessages[language],
    settings: settingsMessages[language],
    shared: sharedMessages[language],
    sharing: sharingMessages[language],
    updates: updatesMessages[language],
    said: {
      ...queueSaid[language],
      ...modeSaid[language],
      ...inputSaid[language],
      ...failureSaid[language],
      ...mappingSaid[language],
      ...libraryCoversSaid[language],
      ...optionsSaid[language],
      ...noticeSaid[language],
      ...workflowSaid[language],
      ...saveSaid[language],
      ...providerSaid[language],
      ...runSaid[language],
      ...warningSaid[language],
      ...toolchainSaid[language],
      ...textSaid[language],
    },
  };
}

const catalogs: Readonly<Record<Language, Messages>> = {
  en: build('en'),
  'pt-BR': build('pt-BR'),
  ja: build('ja'),
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
  ja: '日本語',
};
