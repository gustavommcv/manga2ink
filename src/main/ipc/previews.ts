import type { ChapterPreview } from '@/domain/chapter-versions';
import { previewChaptersCommandSchema, type WorkflowResult } from '@/shared/workflow-contract';

import type { MainContext } from '../context';
import { requireWorkflow } from '../context';
import { handle } from './handle';
import { ok } from './result';

type PreviewsContext = Pick<MainContext, 'workflow'>;

/**
 * The first pages of the files that claim one chapter (ADR 0093). A page is asked for by the ids the
 * app gave the files when it read the folder, and only those are read.
 */
export function registerPreviewHandlers(context: PreviewsContext): void {
  handle(
    'previews:chapters',
    previewChaptersCommandSchema,
    async (_event, command): Promise<WorkflowResult<readonly ChapterPreview[]>> =>
      ok(await requireWorkflow(context).previews.ofVersions(command.sessionId, command.ids)),
  );
}
