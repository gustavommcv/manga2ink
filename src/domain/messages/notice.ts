import type { MangaprepSettingField } from '../output-profile';

import type { NoValues } from './values';

/**
 * The names of what is kept between sessions, as the settings file holds them: the conversion
 * options, and the choices around them. A sentence about one says it with the name a language gives it.
 */
export type OptionName =
  | MangaprepSettingField
  | 'customDeviceSize'
  | 'mode'
  | 'format'
  | 'singleBook'
  | 'providerId'
  | 'outputFolder'
  | 'lastPickerFolder'
  | 'preferredNetworkInterface';

/** What the person is told at the start about what could not be restored (ADR 0053). */
export interface NoticeMessageValues {
  readonly 'notice.settingsUnreadable': NoValues;
  /** The options whose saved value could not be used, which are back to their defaults. */
  readonly 'notice.optionsReset': { readonly options: readonly OptionName[] };
  /** The device that was chosen is not offered, so another is selected. */
  readonly 'notice.deviceFallback': { readonly profile: string; readonly name: string };
}
