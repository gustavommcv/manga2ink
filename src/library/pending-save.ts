import { type AnyMessage, message } from '@/domain/message';

import { uniqueFileName } from './unique-name';

/** Internal save reasons are independent of their user-facing wording, which is a code (ADR 0053). */
export class PendingSaveError extends Error {
  constructor(
    readonly code: 'book_unavailable' | 'run_deleting' | 'wrong_extension' | 'name_unavailable',
    readonly said: AnyMessage,
  ) {
    super(said.id);
    this.name = 'PendingSaveError';
  }
}

function systemCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
}

/** The existing Save All budget: the original name, then copies (2) through (998). */
const saveNameAttempts = 998;

/** Exclusive publication, not a prior existence check, decides whether a name is taken. */
export async function saveWithUniqueName<Value>(
  name: string,
  save: (candidate: string) => Promise<Value>,
): Promise<Value> {
  const taken = new Set<string>();
  for (let attempt = 0; attempt < saveNameAttempts; attempt++) {
    const candidate = uniqueFileName(name, (value) => taken.has(value));
    try {
      return await save(candidate);
    } catch (error) {
      if (systemCode(error) !== 'EEXIST') throw error;
      taken.add(candidate);
    }
  }
  throw new PendingSaveError('name_unavailable', message('save.nameUnavailable', {}));
}

/** Safe save messages; no paths, raw operating-system errors or message-prefix matching. */
export function pendingSaveSaid(error: unknown): AnyMessage {
  if (error instanceof PendingSaveError) return error.said;
  const code = systemCode(error);
  if (code === 'ENOSPC') return message('save.destinationFull', {});
  if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS')
    return message('save.cannotWrite', {});
  if (code === 'ENOENT') return message('save.folderGone', {});
  return message('save.failed', {});
}
