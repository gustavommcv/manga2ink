import {
  type BookFormat,
  type ConversionRequest,
  ConversionWorkflowError,
} from '@/domain/conversion';
import {
  FORMATS_SUPPORTING_COMBINED_VOLUME,
  validateMangapressSettings,
} from '@/domain/output-profile';
import { type RunStep } from '@/domain/messages/workflow';
import { message } from '@/domain/message';
import { defaultProcessMode, type ProcessMode, usesMangapress } from '@/domain/process-mode';

export type RunAction = RunStep;

export function emptyBindingError(code: 'no_volumes' | 'binding_failed'): ConversionWorkflowError {
  return new ConversionWorkflowError(code, message('workflow.noVolumes', {}));
}

/** Resolve the default mode and validate only the settings of a tool the run will use. */
export function validateRunOptions(
  request: Pick<ConversionRequest, 'mode' | 'settings' | 'format'>,
  action: RunAction,
): ProcessMode {
  const mode = request.mode ?? defaultProcessMode;
  if (
    usesMangapress(mode) &&
    validateMangapressSettings(request.settings, request.format).length > 0
  ) {
    throw new ConversionWorkflowError(
      'invalid_settings',
      message('workflow.reviewSettings', { before: action }),
    );
  }
  return mode;
}

/** Called only when combining applies: a loose CBZ remains a direct conversion. */
export function assertSingleBook(mode: ProcessMode, format: BookFormat): void {
  if (mode !== 'bind-and-convert') {
    throw new ConversionWorkflowError(
      'invalid_settings',
      message('workflow.singleBookNeedsBoth', {}),
    );
  }
  if (!FORMATS_SUPPORTING_COMBINED_VOLUME.has(format)) {
    throw new ConversionWorkflowError('invalid_settings', message('workflow.combineNeedsEpub', {}));
  }
}
