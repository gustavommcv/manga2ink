import { app, shell } from 'electron';

import {
  type OpenProjectLinkCommand,
  openProjectLinkCommandSchema,
} from '@/shared/project-links-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';

import { projectLinkAddress } from '../project-links';
import { handle } from './handle';
import { ok } from './result';

/**
 * Opening a place the About tab names, in the browser of the system (ADR 0054). The window sends
 * a name and its language; what is opened is the address the main process has for that name.
 */
export function registerProjectLinkHandlers(): void {
  handle(
    'app:open-link',
    openProjectLinkCommandSchema,
    async (_event, command: OpenProjectLinkCommand): Promise<WorkflowResult<undefined>> => {
      await shell.openExternal(
        projectLinkAddress(command.link, command.language, app.getVersion()),
      );
      return ok(undefined);
    },
  );
}
