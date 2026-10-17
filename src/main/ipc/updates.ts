import { app } from 'electron';

import type { UpdateCheckWorkflow } from '@/application/workflows/update-check';
import type { UpdateCheck } from '@/domain/update-check';
import type { WorkflowResult } from '@/shared/workflow-contract';

import { handle, ignoredPayloadSchema } from './handle';
import { ok } from './result';

/**
 * Looking for a newer version, when the window asks (ADR 0062). It is asked on a click, never at
 * launch and never on a timer; the version that is running is the main process's to say, and a
 * failure to reach GitHub is told to the window as the failure of an online source is.
 */
export function registerUpdateHandlers(workflow: Pick<UpdateCheckWorkflow, 'check'>): void {
  handle(
    'app:check-updates',
    ignoredPayloadSchema,
    async (): Promise<WorkflowResult<UpdateCheck>> => ok(await workflow.check(app.getVersion())),
  );
}
