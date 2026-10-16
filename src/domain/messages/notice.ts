import type { NoValues } from './values';

/** What the person is told at the start about what could not be restored (ADR 0053). */
export interface NoticeMessageValues {
  readonly 'notice.settingsUnreadable': NoValues;
  /** The names are the options as the interface calls them, which each language says as they are. */
  readonly 'notice.optionsReset': { readonly options: readonly string[] };
}
