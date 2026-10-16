import { stat } from 'node:fs/promises';
import path from 'node:path';

import type { QueueInputKind } from '@/domain/input-queue';
import { message } from '@/domain/message';
import type { RejectedInput } from '@/shared/workflow-contract';

/** More than this in one go is almost certainly a mistake, and each row costs a scan. */
export const maxInputsPerAdd = 100;

export interface ClassifiedInputs {
  readonly accepted: readonly { readonly path: string; readonly kind: QueueInputKind }[];
  readonly rejected: readonly RejectedInput[];
}

/**
 * Decides which of the given paths can become queue rows: a folder, or a `.cbz` file. The paths
 * come from a native dialog or from files dropped on the window, so each one is checked against
 * the disk here rather than trusted.
 */
export async function classifyInputPaths(
  paths: readonly string[],
  deps: { readonly stat: typeof stat } = { stat },
): Promise<ClassifiedInputs> {
  const accepted: { path: string; kind: QueueInputKind }[] = [];
  const rejected: RejectedInput[] = [];
  for (const inputPath of paths.slice(0, maxInputsPerAdd)) {
    // A path with no last step (a drive, the root) is named by the path itself; an empty one by nothing.
    const name = path.basename(inputPath) || inputPath;
    const refused = (reason: RejectedInput['reason']): RejectedInput =>
      name === '' ? { reason } : { name, reason };
    let stats: Awaited<ReturnType<typeof stat>>;
    try {
      stats = await deps.stat(inputPath);
    } catch {
      rejected.push(refused(message('input.unreadable', {})));
      continue;
    }
    if (stats.isDirectory()) {
      accepted.push({ path: inputPath, kind: 'folder' });
    } else if (stats.isFile() && path.extname(inputPath).toLowerCase() === '.cbz') {
      accepted.push({ path: inputPath, kind: 'cbz' });
    } else {
      rejected.push(refused(message('input.onlyFoldersAndCbz', {})));
    }
  }
  if (paths.length > maxInputsPerAdd) {
    // What was past the limit names no item, so it is said on its own.
    rejected.push({
      reason: message('input.overLimit', {
        left: paths.length - maxInputsPerAdd,
        limit: maxInputsPerAdd,
      }),
    });
  }
  return { accepted, rejected };
}
