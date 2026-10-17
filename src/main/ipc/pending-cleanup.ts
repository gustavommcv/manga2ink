import { message } from '@/domain/message';
import type { WaitingBooks } from '@/domain/pending-cleanup';
import { idleDaysCommandSchema } from '@/shared/pending-cleanup-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';

import type { MainContext } from '../context';
import { waitingBooks } from '../waiting-books';
import { handle } from './handle';
import { discardRefusal, forgetPendingRun } from './pending-decisions';
import { failed, ok } from './result';

type CleanupContext = Pick<
  MainContext,
  | 'activeJobs'
  | 'activeSharingTarget'
  | 'artifactPaths'
  | 'pendingArtifacts'
  | 'pendingRunActivity'
  | 'pendingRuns'
  | 'selectedLibraries'
>;

const day = 24 * 60 * 60 * 1000;

/**
 * The clean-up of the Processing tab (ADR 0061): the conversions that have waited, untouched, for a
 * number of days the window names. It can ask what would go before anything does, and it deletes
 * under the same rules as deleting one conversion: not while a conversion runs or the ready books
 * are shared, and not a conversion that is being saved from. Such a conversion is left, not an error.
 */
export function registerPendingCleanupHandlers(context: CleanupContext): void {
  handle(
    'pending:count-idle',
    idleDaysCommandSchema,
    async (_event, { days }): Promise<WorkflowResult<WaitingBooks>> => {
      if (context.pendingRuns === undefined) throw new Error('Pending storage is unavailable.');
      return ok(waitingBooks(await context.pendingRuns.idleRuns(days * day)));
    },
  );
  handle(
    'pending:delete-idle',
    idleDaysCommandSchema,
    async (_event, { days }): Promise<WorkflowResult<WaitingBooks>> => {
      const { pendingRuns } = context;
      if (pendingRuns === undefined) throw new Error('Pending storage is unavailable.');
      const refusal = discardRefusal({
        sharingReadyBooks: context.activeSharingTarget?.readyBooks === true,
        activeJobs: context.activeJobs.size,
      });
      if (refusal !== undefined) return failed(refusal);
      const deleted = [];
      for (const run of await pendingRuns.idleRuns(days * day)) {
        const release = context.pendingRunActivity.beginDelete(run.id);
        if (release === undefined) continue;
        try {
          if (!(await pendingRuns.discard(run.id))) continue;
          forgetPendingRun(context, run.id);
          deleted.push(run);
        } finally {
          release();
        }
      }
      return ok(waitingBooks(deleted));
    },
    (error: unknown) => {
      console.error('Could not delete the pending books that had waited.', error);
      return { code: 'pending_delete_failed', said: message('failure.pendingDeleteFailed', {}) };
    },
  );
}
