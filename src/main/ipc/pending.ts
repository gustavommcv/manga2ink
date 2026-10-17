import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { app, dialog } from 'electron';
import { z } from 'zod';

import type { PendingBook, PendingRun } from '@/adapters/library/fs-pending-runs';
import { PendingSaveError, pendingSaveSaid, saveWithUniqueName } from '@/library/pending-save';
import {
  identifierSchema,
  type PendingRunSummary,
  type SaveAllResult,
  type WorkflowFailure,
  type WorkflowResult,
} from '@/shared/workflow-contract';
import { type AnyMessage, message } from '@/domain/message';

import type { MainContext } from '../context';
import { dialogWords } from './dialog-words';
import { handle, ignoredPayloadSchema } from './handle';
import {
  discardRefusal,
  forgetPendingRun,
  runOfSelection,
  wrongExtension,
} from './pending-decisions';
import { rememberSaveFolder } from './remembered-folders';
import { failed, ok } from './result';

type PendingContext = Pick<
  MainContext,
  | 'pendingRuns'
  | 'selectedLibraries'
  | 'pendingArtifacts'
  | 'artifactPaths'
  | 'lastPickerFolder'
  | 'lastSaveFolder'
  | 'preferences'
  | 'currentPreferences'
  | 'preferredNetworkInterface'
  | 'activeSharingTarget'
  | 'activeJobs'
  | 'pendingRunActivity'
  | 'appSettings'
>;
const idsSchema = z.array(identifierSchema).min(1).max(1000);
function saveFailure(error: unknown): WorkflowFailure {
  if (!(error instanceof PendingSaveError))
    console.error('A pending book could not be saved.', error);
  return { code: 'save_failed', said: pendingSaveSaid(error) };
}
async function findBook(
  context: PendingContext,
  id: string,
): Promise<{
  pendingRuns: NonNullable<PendingContext['pendingRuns']>;
  run: PendingRun;
  book: PendingBook;
}> {
  const reference = context.pendingArtifacts.get(id);
  const { pendingRuns } = context;
  if (reference === undefined || pendingRuns === undefined)
    throw new PendingSaveError('book_unavailable', message('save.bookGone', {}));
  const run = (await pendingRuns.list()).find((candidate) => candidate.id === reference.runId);
  const book = run?.books.find(
    (candidate) => candidate.entry.relativePath === reference.relativePath,
  );
  if (run === undefined || book === undefined)
    throw new PendingSaveError('book_unavailable', message('save.bookGone', {}));
  return { pendingRuns, run, book };
}
async function saveBook(
  context: PendingContext,
  id: string,
  destination: string,
  overwrite: boolean,
): Promise<AnyMessage | undefined> {
  const { pendingRuns, run, book } = await findBook(context, id);
  const refusal = wrongExtension(book.entry.format, destination);
  if (refusal !== undefined) throw refusal;
  const outcome = await pendingRuns.exportAndRecord(run, book, destination, overwrite);
  context.artifactPaths.set(id, destination);
  rememberSaveFolder(context, path.dirname(destination));
  if (outcome.status === 'saved') return undefined;
  console.error('Could not finish recording an exported pending book.', outcome.cause);
  return message(
    outcome.status === 'catalog_failed' ? 'save.copiedCatalogFailed' : 'save.copiedNotRecorded',
    {},
  );
}
/** Native save dialogs and persistent pending-book recovery. Paths never cross the preload bridge. */
export function registerPendingHandlers(context: PendingContext): void {
  handle('pending:create', ignoredPayloadSchema, async (): Promise<WorkflowResult<string>> => {
    if (context.pendingRuns === undefined) throw new Error('Pending storage is unavailable.');
    const run = await context.pendingRuns.create();
    context.selectedLibraries.set(run.id, run.path);
    return ok(run.id);
  });
  handle(
    'pending:list',
    ignoredPayloadSchema,
    async (): Promise<WorkflowResult<readonly PendingRunSummary[]>> => {
      if (context.pendingRuns === undefined) throw new Error('Pending storage is unavailable.');
      const runs = await context.pendingRuns.list();
      return ok(
        runs.map((run) => {
          context.selectedLibraries.set(run.id, run.path);
          return {
            libraryId: run.id,
            createdAt: run.createdAt,
            artifacts: run.books.map((book) => {
              let id = [...context.pendingArtifacts].find(
                ([, reference]) =>
                  reference.runId === run.id && reference.relativePath === book.entry.relativePath,
              )?.[0];
              if (id === undefined) {
                id = randomUUID();
                context.pendingArtifacts.set(id, {
                  runId: run.id,
                  relativePath: book.entry.relativePath,
                });
              }
              context.artifactPaths.set(id, book.savedPath ?? book.path);
              return {
                id,
                name: path.basename(book.path),
                bytes: book.entry.bytes,
                format: book.entry.format,
                saved: book.savedPath !== undefined,
              };
            }),
          };
        }),
      );
    },
    (error: unknown) => {
      console.error('Could not recover pending books.', error);
      return { code: 'pending_unreadable', said: message('failure.pendingUnreadable', {}) };
    },
  );
  handle(
    'pending:discard',
    identifierSchema,
    async (_event, id): Promise<WorkflowResult<undefined>> => {
      if (context.pendingRuns === undefined) throw new Error('Pending storage is unavailable.');
      const refusal = discardRefusal({
        sharingReadyBooks: context.activeSharingTarget?.readyBooks === true,
        activeJobs: context.activeJobs.size,
      });
      if (refusal !== undefined) return failed(refusal);
      const release = context.pendingRunActivity.beginDelete(id);
      if (release === undefined) {
        return failed({
          code: 'pending_in_use',
          said: message('failure.pendingStillSaving', {}),
        });
      }
      try {
        if (!(await context.pendingRuns.discard(id))) {
          return failed({
            code: 'pending_not_found',
            said: message('failure.pendingNotFound', {}),
          });
        }
        forgetPendingRun(context, id);
        return ok(undefined);
      } finally {
        release();
      }
    },
    (error: unknown) => {
      console.error('Could not delete pending books.', error);
      return { code: 'pending_delete_failed', said: message('failure.pendingDeleteFailed', {}) };
    },
  );
  handle(
    'pending:save-as',
    identifierSchema,
    async (
      _event,
      id,
    ): Promise<
      WorkflowResult<{
        saved: boolean;
        warning?: AnyMessage;
      }>
    > => {
      const reference = context.pendingArtifacts.get(id);
      if (reference === undefined)
        throw new PendingSaveError('book_unavailable', message('save.bookGone', {}));
      const release = context.pendingRunActivity.beginExport(reference.runId);
      if (release === undefined)
        throw new PendingSaveError('run_deleting', message('save.bookBeingDeleted', {}));
      try {
        const { book } = await findBook(context, id);
        const defaultFolder = context.lastSaveFolder ?? app.getPath('documents');
        const result = await dialog.showSaveDialog({
          title: dialogWords(context).saveBook.title,
          defaultPath: path.join(defaultFolder, path.basename(book.path)),
          filters: [{ name: book.entry.format.toUpperCase(), extensions: [book.entry.format] }],
        });
        // A cancelled dialog gives an empty path, so `canceled` is the whole answer.
        if (result.canceled) return ok({ saved: false });
        const warning = await saveBook(context, id, result.filePath, true);
        return ok({ saved: true, ...(warning === undefined ? {} : { warning }) });
      } finally {
        release();
      }
    },
    saveFailure,
  );
  handle(
    'pending:save-all',
    idsSchema,
    async (_event, ids): Promise<WorkflowResult<SaveAllResult | null>> => {
      const release = context.pendingRunActivity.beginExport(
        runOfSelection(ids, context.pendingArtifacts),
      );
      if (release === undefined)
        throw new PendingSaveError('run_deleting', message('save.bookBeingDeleted', {}));
      try {
        const result = await dialog.showOpenDialog({
          title: dialogWords(context).saveAll.title,
          properties: ['openDirectory', 'createDirectory'],
          defaultPath: context.lastSaveFolder ?? app.getPath('documents'),
        });
        const folder = result.filePaths[0];
        if (result.canceled || folder === undefined) return ok(null);
        rememberSaveFolder(context, folder);
        const savedIds: string[] = [];
        const failures: { id: string; said: AnyMessage }[] = [];
        for (const id of ids) {
          try {
            const { book } = await findBook(context, id);
            const warning = await saveWithUniqueName(path.basename(book.path), (name) =>
              saveBook(context, id, path.join(folder, name), false),
            );
            savedIds.push(id);
            if (warning !== undefined) failures.push({ id, said: warning });
          } catch (error) {
            failures.push({ id, said: saveFailure(error).said });
          }
        }
        return ok({ savedIds, failures });
      } finally {
        release();
      }
    },
    saveFailure,
  );
}
