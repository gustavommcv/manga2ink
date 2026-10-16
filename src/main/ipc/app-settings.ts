import type { AppSettingsWorkflow } from '@/application/workflows/app-settings';
import {
  type RestoredAppSettings,
  type SavedAppSettings,
  saveAppSettingsCommandSchema,
} from '@/shared/app-settings-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';

import { handle, ignoredPayloadSchema } from './handle';
import { ok } from './result';

/**
 * Loading and keeping what a person decided about the app itself (ADR 0052). Both answers carry the
 * language the choice comes to, worked out here, where the system's languages are known.
 */
export function registerAppSettingsHandlers(
  workflow: Pick<AppSettingsWorkflow, 'restore' | 'save'>,
): void {
  handle(
    'app:load-settings',
    ignoredPayloadSchema,
    async (): Promise<WorkflowResult<RestoredAppSettings>> => ok(await workflow.restore()),
  );
  handle(
    'app:save-settings',
    saveAppSettingsCommandSchema,
    async (_event, command): Promise<WorkflowResult<SavedAppSettings>> =>
      ok(await workflow.save(command)),
  );
}
