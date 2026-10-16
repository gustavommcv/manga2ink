import { defaultLanguage } from '@/domain/app-settings';
import type { DialogMessages } from '@/i18n/dialog-messages';
import { messagesFor } from '@/i18n/messages';

import type { MainContext } from '../context';

/**
 * What the native dialogs say, in the language the window is in. The language is known once the
 * window has read the app settings, which it does before anything can open a dialog; until then it
 * is English.
 */
export function dialogWords(context: Pick<MainContext, 'appSettings'>): DialogMessages {
  return messagesFor(context.appSettings?.language() ?? defaultLanguage).dialogs;
}
