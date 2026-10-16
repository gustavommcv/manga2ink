import type { WorkflowFailure } from '@/shared/workflow-contract';
import { message } from '@/domain/message';

import { opdsPort } from '../constants';

/**
 * What an operating-system error from starting the sharing server means for the person, or
 * `undefined` when it is not one of those. Only the call that starts the server may use this: the
 * same error codes come from file operations too, and there they do not mean the network.
 */
export function sharingFailure(error: unknown): WorkflowFailure | undefined {
  const code = error instanceof Error && 'code' in error ? error.code : undefined;
  if (code === 'EADDRINUSE') {
    return {
      code: 'sharing_failed',
      said: message('failure.sharingPortInUse', { port: opdsPort }),
    };
  }
  if (code === 'EADDRNOTAVAIL' || code === 'EACCES') {
    return { code: 'sharing_failed', said: message('failure.sharingAddressRefused', {}) };
  }
  return undefined;
}
