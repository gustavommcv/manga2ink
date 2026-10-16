import { createContext, useContext } from 'react';

import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';

/**
 * What the Processing tab asks of the main process (ADR 0055). A call that fails to reach it is an
 * answer like any other that failed, so the tab has one kind of failure to say.
 */
export interface ProcessingFolderApi {
  readonly get: () => Promise<WorkflowResult<ProcessingFolderStatus>>;
  /** Opens the dialog; resolves to null when it is cancelled. */
  readonly choose: () => Promise<WorkflowResult<ProcessingFolderStatus | null>>;
  readonly useDefault: () => Promise<WorkflowResult<ProcessingFolderStatus>>;
}

/** Where the provider puts the way to ask, for everything under it. */
export const ProcessingFolderContext = createContext<ProcessingFolderApi | undefined>(undefined);

/** Where the app works, and the way to change it: only under an `AppSettingsProvider`. */
export function useProcessingFolder(): ProcessingFolderApi {
  const api = useContext(ProcessingFolderContext);
  if (api === undefined) {
    throw new Error('useProcessingFolder needs an AppSettingsProvider above it.');
  }
  return api;
}
