import { describe, expect, it } from 'vitest';

import { message } from '@/domain/message';
import {
  batchProcessModes,
  blockedModeReason,
  defaultProcessMode,
  modeFromSteps,
  processModes,
  resolveMode,
  stepsFromMode,
  unsupportedModeReason,
  usesMangaprep,
} from '@/domain/process-mode';

describe('process modes', () => {
  it('is a closed set of three, and a batch can only join or join-and-convert', () => {
    expect(processModes).toEqual(['bind-and-convert', 'bind-only', 'convert-only']);
    expect(batchProcessModes).toEqual(['bind-and-convert', 'bind-only']);
    expect(defaultProcessMode).toBe('bind-and-convert');
  });

  it('maps the two checkboxes to a mode and back, without losing information', () => {
    expect(modeFromSteps({ group: true, convert: true })).toBe('bind-and-convert');
    expect(modeFromSteps({ group: true, convert: false })).toBe('bind-only');
    expect(modeFromSteps({ group: false, convert: true })).toBe('convert-only');
    // The interface never lets both go off; a caller that gets there anyway runs the ordinary mode.
    expect(modeFromSteps({ group: false, convert: false })).toBe('bind-and-convert');

    for (const mode of processModes) {
      expect(modeFromSteps(stepsFromMode(mode))).toBe(mode);
    }
  });

  it('knows which modes run mangaprep', () => {
    expect(usesMangaprep('bind-and-convert')).toBe(true);
    expect(usesMangaprep('convert-only')).toBe(true);
    expect(usesMangaprep('bind-only')).toBe(false);
  });

  it('explains why a mode cannot run on a CBZ or on a library, and allows everything else', () => {
    expect(unsupportedModeReason('cbz', 'bind-only')).toEqual(message('mode.cbzIsOneVolume', {}));
    expect(unsupportedModeReason('library', 'convert-only')).toEqual(
      message('mode.libraryGroupsFirst', {}),
    );

    expect(unsupportedModeReason('folder', 'bind-only')).toBeUndefined();
    expect(unsupportedModeReason('folder', 'convert-only')).toBeUndefined();
    expect(unsupportedModeReason('folder', 'bind-and-convert')).toBeUndefined();
    expect(unsupportedModeReason('cbz', 'convert-only')).toBeUndefined();
    expect(unsupportedModeReason('cbz', 'bind-and-convert')).toBeUndefined();
    expect(unsupportedModeReason('library', 'bind-only')).toBeUndefined();
    expect(unsupportedModeReason('library', 'bind-and-convert')).toBeUndefined();
  });

  it('offers a CBZ only the straight-to-mangaprep process and a library only the two that group', () => {
    for (const mode of processModes) {
      expect(blockedModeReason('folder', mode)).toBeUndefined();
    }
    expect(blockedModeReason('cbz', 'convert-only')).toBeUndefined();
    expect(blockedModeReason('cbz', 'bind-only')).toEqual(message('mode.cbzIsOneVolume', {}));
    expect(blockedModeReason('cbz', 'bind-and-convert')).toEqual(
      message('mode.cbzIsOneVolume', {}),
    );
    expect(blockedModeReason('library', 'convert-only')).toEqual(
      message('mode.libraryGroupsFirst', {}),
    );
    expect(blockedModeReason('library', 'bind-only')).toBeUndefined();
    expect(blockedModeReason('library', 'bind-and-convert')).toBeUndefined();
  });

  it('carries a choice over to another input by settling on the nearest mode that input allows', () => {
    for (const mode of processModes) {
      expect(resolveMode('folder', mode)).toBe(mode);
      expect(resolveMode('cbz', mode)).toBe('convert-only');
    }
    expect(resolveMode('library', 'convert-only')).toBe('bind-and-convert');
    expect(resolveMode('library', 'bind-only')).toBe('bind-only');
    expect(resolveMode('library', 'bind-and-convert')).toBe('bind-and-convert');
  });

  it('does not let a folder of chapters that are CBZ files skip joining them', () => {
    // The converter cannot read pages from inside the archives of a folder: they are joined first.
    expect(unsupportedModeReason('archives', 'convert-only')).toEqual(
      message('mode.chaptersAreArchives', {}),
    );
    expect(blockedModeReason('archives', 'convert-only')).toEqual(
      message('mode.chaptersAreArchives', {}),
    );
    for (const mode of ['bind-only', 'bind-and-convert'] as const) {
      expect(unsupportedModeReason('archives', mode)).toBeUndefined();
      expect(blockedModeReason('archives', mode)).toBeUndefined();
      expect(resolveMode('archives', mode)).toBe(mode);
    }
    expect(resolveMode('archives', 'convert-only')).toBe('bind-and-convert');
  });
});
