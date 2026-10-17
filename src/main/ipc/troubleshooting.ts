import os from 'node:os';

import { app, clipboard, shell } from 'electron';

import { message } from '@/domain/message';
import { openAppFolderCommandSchema } from '@/shared/app-folders-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';

import type { MainContext } from '../context';
import { diagnosticsText } from '../diagnostics';
import { handle, ignoredPayloadSchema } from './handle';
import { failed, ok } from './result';

type TroubleshootingContext = Pick<
  MainContext,
  'appSettings' | 'log' | 'processing' | 'toolchainStatus'
>;

/**
 * What helps a person report a problem (ADR 0057): the diagnostics put on the clipboard, and the
 * folder of the app's data opened in the file manager. The window names the folder; the path is
 * here.
 */
export function registerTroubleshootingHandlers(context: TroubleshootingContext): void {
  handle(
    'app:copy-diagnostics',
    ignoredPayloadSchema,
    async (): Promise<WorkflowResult<undefined>> => {
      try {
        // The clipboard answers once it has taken the text, and refuses by rejecting.
        await clipboard.writeText(
          diagnosticsText({
            version: app.getVersion(),
            packaged: app.isPackaged,
            electron: process.versions.electron,
            chrome: process.versions.chrome,
            node: process.versions.node,
            platform: process.platform,
            arch: process.arch,
            system: os.release(),
            processors: os.availableParallelism(),
            memoryBytes: os.totalmem(),
            language: context.appSettings?.language() ?? 'en',
            workingFolderChosen: context.processing?.chosen() != null,
            tools: context.toolchainStatus,
          }),
        );
      } catch (error) {
        console.error('The diagnostics could not be put on the clipboard.', error);
        return failed({
          code: 'diagnostics_not_copied',
          said: message('failure.diagnosticsNotCopied', {}),
        });
      }
      return ok(undefined);
    },
  );
  handle(
    'app:open-folder',
    openAppFolderCommandSchema,
    async (_event, command): Promise<WorkflowResult<undefined>> => {
      let problem: string;
      try {
        // The folder of the log is made first, so it can be opened before anything has been written.
        const folder =
          command.folder === 'data' ? app.getPath('userData') : await context.log?.ensureFolder();
        problem = folder === undefined ? 'There is no log.' : await shell.openPath(folder);
      } catch (error) {
        problem = error instanceof Error ? error.message : String(error);
      }
      if (problem === '') return ok(undefined);
      console.error(`The ${command.folder} folder of the app could not be opened.`, problem);
      return failed({ code: 'folder_not_opened', said: message('failure.folderNotOpened', {}) });
    },
  );
}
