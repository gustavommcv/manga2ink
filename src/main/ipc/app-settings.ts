import type { AppSettingsWorkflow } from '@/application/workflows/app-settings';
import type { Theme } from '@/domain/theme';
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
 * language the choice comes to, worked out here, where the system's languages are known. When a theme
 * is among what was kept, `themed` is told it, once it is kept, so the windows that are open are given
 * its colors where the system draws them (ADR 0066).
 */
export function registerAppSettingsHandlers(
  workflow: Pick<AppSettingsWorkflow, 'restore' | 'save'>,
  themed: (theme: Theme) => void,
): void {
  handle(
    'app:load-settings',
    ignoredPayloadSchema,
    async (): Promise<WorkflowResult<RestoredAppSettings>> => ok(await workflow.restore()),
  );
  handle(
    'app:save-settings',
    saveAppSettingsCommandSchema,
    async (_event, command): Promise<WorkflowResult<SavedAppSettings>> => {
      const saved = await workflow.save(command);
      if (command.theme !== undefined) themed(command.theme);
      return ok(saved);
    },
  );
}
