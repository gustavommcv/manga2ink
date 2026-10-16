import type { NoValues } from './values';

/** Why a process cannot be chosen for an input, or changed, in the words of a code (ADR 0053). */
export interface ModeMessageValues {
  readonly 'mode.cbzIsOneVolume': NoValues;
  readonly 'mode.libraryGroupsFirst': NoValues;
  readonly 'mode.singleBookLocked': NoValues;
}
