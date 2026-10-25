import { type AnyMessage, message } from './message';

/**
 * Which of the two tools a run uses. A closed set on purpose: it is a choice between three fixed
 * processes, not a pipeline anyone assembles step by step (ADR 0005).
 */
export const processModes = ['bind-and-convert', 'bind-only', 'convert-only'] as const;
export type ProcessMode = (typeof processModes)[number];

/**
 * What is being run: a manga folder, one CBZ, a whole library of manga folders, or a folder whose
 * chapters are CBZ files, which cannot be converted before they are joined.
 */
export type ModeInput = 'folder' | 'cbz' | 'library' | 'archives';

/** A library is bound by one mangabind call, so a batch can never skip binding. */
export const batchProcessModes = ['bind-and-convert', 'bind-only'] as const;
export type BatchProcessMode = (typeof batchProcessModes)[number];

export const defaultProcessMode: ProcessMode = 'bind-and-convert';

/** The two checkboxes the interface shows: group chapters into volumes, convert for a device. */
export interface ProcessSteps {
  readonly group: boolean;
  readonly convert: boolean;
}

export function modeFromSteps({ group, convert }: ProcessSteps): ProcessMode {
  if (group && !convert) return 'bind-only';
  if (!group && convert) return 'convert-only';
  // Both on, or (which the interface prevents) both off: the ordinary full run.
  return 'bind-and-convert';
}

export function stepsFromMode(mode: ProcessMode): ProcessSteps {
  return { group: mode !== 'convert-only', convert: mode !== 'bind-only' };
}

export function usesMangaprep(mode: ProcessMode): boolean {
  return mode !== 'bind-only';
}

const cbzReason = message('mode.cbzIsOneVolume', {});
export const libraryReason = message('mode.libraryGroupsFirst', {});
export const archivesReason = message('mode.chaptersAreArchives', {});

/** Why a run must refuse this mode for this kind of input, or undefined when it can run. */
export function unsupportedModeReason(input: ModeInput, mode: ProcessMode): AnyMessage | undefined {
  if (input === 'cbz' && mode === 'bind-only') return cbzReason;
  if (input === 'library' && mode === 'convert-only') return libraryReason;
  if (input === 'archives' && mode === 'convert-only') return archivesReason;
  return undefined;
}

/**
 * Why the interface should not offer this mode for this kind of input, or undefined when it can.
 * Stricter than what a run refuses: a CBZ has only one meaningful process, going straight to
 * mangaprep, though asking it to "bind and convert" still just does that.
 */
export function blockedModeReason(input: ModeInput, mode: ProcessMode): AnyMessage | undefined {
  if (input === 'cbz' && mode !== 'convert-only') return cbzReason;
  return unsupportedModeReason(input, mode);
}

/**
 * The mode that actually applies to an input, for when a choice made for one input is carried over
 * to another (a joined-only run chosen for a folder, then a CBZ is opened).
 */
export function resolveMode(input: 'library', mode: ProcessMode): BatchProcessMode;
export function resolveMode(input: ModeInput, mode: ProcessMode): ProcessMode;
export function resolveMode(input: ModeInput, mode: ProcessMode): ProcessMode {
  if (input === 'cbz') return 'convert-only';
  if ((input === 'library' || input === 'archives') && mode === 'convert-only') {
    return 'bind-and-convert';
  }
  return mode;
}
