import path from 'node:path';

import { dialog } from 'electron';

import { ProcessingFolderError } from '@/adapters/library/processing-folders';
import type { ProcessingFolderStatus } from '@/shared/processing-folder-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';

import type { MainContext } from '../context';
import { processingStatus } from '../processing-status';
import { handle, ignoredPayloadSchema } from './handle';
import { failed, ok } from './result';

type ProcessingContext = Pick<
  MainContext,
  | 'activeJobs'
  | 'activeSharing'
  | 'activeSharingTarget'
  | 'appSettings'
  | 'pendingRuns'
  | 'processing'
>;

/** Whether something is being made or served from where the app works now. */
function isWorking(context: ProcessingContext): boolean {
  return (
    context.activeJobs.size > 0 ||
    context.activeSharing !== undefined ||
    context.activeSharingTarget !== undefined
  );
}

const busy = <T>(): WorkflowResult<T> =>
  failed({
    code: 'processing_busy',
    message: 'Finish or stop the conversion or the sharing that is running, then try again.',
  });

/**
 * Where the app works, and changing it (ADR 0055). The window never gives a path: it asks for a
 * dialog, and what is chosen in it is checked here, kept, and only then used. A change is refused
 * while something is being made or shared, so that nothing is moved from under it.
 */
export function registerProcessingFolderHandlers(context: ProcessingContext): void {
  handle(
    'app:get-processing-folder',
    ignoredPayloadSchema,
    async (): Promise<WorkflowResult<ProcessingFolderStatus>> =>
      ok(await processingStatus(context)),
  );
  handle(
    'app:choose-processing-folder',
    ignoredPayloadSchema,
    async (): Promise<WorkflowResult<ProcessingFolderStatus | null>> => {
      const { appSettings, processing } = context;
      if (appSettings === undefined || processing === undefined) {
        throw new Error('Where the app works is not known yet.');
      }
      if (isWorking(context)) return busy();
      const chosen = processing.chosen();
      const result = await dialog.showOpenDialog({
        title: 'Choose the folder Mangabound works in',
        buttonLabel: 'Use this folder',
        properties: ['openDirectory', 'createDirectory'],
        ...(chosen === null ? {} : { defaultPath: chosen }),
      });
      const picked = result.filePaths[0];
      if (result.canceled || picked === undefined) return ok(null);
      const folder = path.resolve(picked);
      // The dialog took a while, and something may have been started in it.
      if (isWorking(context)) return busy();
      try {
        await processing.check(folder);
      } catch (error) {
        if (error instanceof ProcessingFolderError) {
          console.error('A folder was chosen to work in and could not be used.', error);
          return failed({ code: 'processing_folder_unusable', message: error.message });
        }
        throw error;
      }
      await appSettings.chooseProcessingFolder(folder);
      return ok(await processingStatus(context));
    },
  );
  handle(
    'app:use-default-processing-folder',
    ignoredPayloadSchema,
    async (): Promise<WorkflowResult<ProcessingFolderStatus>> => {
      if (context.appSettings === undefined)
        throw new Error('Where the app works is not known yet.');
      if (isWorking(context)) return busy();
      await context.appSettings.chooseProcessingFolder(null);
      return ok(await processingStatus(context));
    },
  );
}
