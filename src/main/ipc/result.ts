import { ZodError } from 'zod';

import { CliProtocolError } from '@/adapters/cli-protocol-error';
import { MetadataProviderError } from '@/adapters/metadata-providers/errors';
import { ProcessCancelledError } from '@/application/ports/process-runner';
import { SettingsSaveError } from '@/application/ports/settings-store';
import { ConversionWorkflowError, ToolExecutionError } from '@/domain/conversion';
import { message, raw } from '@/domain/message';
import { LibraryIndexError } from '@/library/manifest';
import type { WorkflowFailure, WorkflowResult } from '@/shared/workflow-contract';

export const ok = <T>(value: T): WorkflowResult<T> => ({ ok: true, value });
export const failed = <T>(error: WorkflowFailure): WorkflowResult<T> => ({ ok: false, error });

/** What the operating system says when it does not let a file or folder be used. */
const permissionErrorCodes: ReadonlySet<unknown> = new Set(['EACCES', 'EPERM', 'EROFS']);

/**
 * Keeps the cause in the app's own log. What the person is told is written for the screen and
 * leaves out the stack, the paths and the text of the error itself, which is what says what really
 * went wrong.
 */
function logged(failure: WorkflowFailure, error: unknown): WorkflowFailure {
  console.error(`A request failed (${failure.code}).`, error);
  return failure;
}

/**
 * Turns whatever a handler caught into what the page is told, as a code the window writes in its
 * language (ADR 0053). An error written for the screen keeps its own message; the others get one
 * that says what to do, and the error itself goes to the log. Errors that only make sense for one
 * handler, such as the ones starting the sharing server, are mapped by that handler before it gets
 * here.
 */
export function toFailure(error: unknown): WorkflowFailure {
  if (error instanceof ToolExecutionError) {
    return {
      code: error.issue.code,
      said: error.said ?? raw(error.issue.message),
      issue: error.issue,
    };
  }
  if (error instanceof ProcessCancelledError) {
    return { code: 'cancelled', said: message('failure.conversionCancelled', {}) };
  }
  if (error instanceof Error && error.name === 'AbortError') {
    return { code: 'cancelled', said: message('failure.cancelled', {}) };
  }
  if (error instanceof ConversionWorkflowError) {
    const failure = { code: error.code, said: error.said };
    return error.cause === undefined ? failure : logged(failure, error);
  }
  if (error instanceof MetadataProviderError) {
    const failure = { code: error.code, said: error.said };
    return error.cause === undefined ? failure : logged(failure, error);
  }
  if (error instanceof LibraryIndexError) {
    return logged({ code: error.code, said: message('failure.catalogUnreadable', {}) }, error);
  }
  if (error instanceof SettingsSaveError) {
    return logged({ code: error.code, said: message('failure.settingsNotSaved', {}) }, error);
  }
  if (error instanceof CliProtocolError) {
    return logged({ code: error.code, said: message('failure.toolIncompatible', {}) }, error);
  }
  if (error instanceof ZodError) {
    return logged({ code: 'invalid_request', said: message('failure.invalidRequest', {}) }, error);
  }
  const systemCode = error instanceof Error && 'code' in error ? error.code : undefined;
  if (permissionErrorCodes.has(systemCode)) {
    return logged(
      { code: 'file_access_denied', said: message('failure.fileAccessDenied', {}) },
      error,
    );
  }
  if (systemCode === 'ENOSPC') {
    return logged({ code: 'disk_full', said: message('failure.diskFull', {}) }, error);
  }
  return logged({ code: 'internal_error', said: message('failure.internal', {}) }, error);
}
