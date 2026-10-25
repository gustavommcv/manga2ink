import type { BindingPort, ConversionPort } from '@/application/ports/conversion-tools';
import type { CoverLookup } from '@/application/workflows/book-covers';
import {
  type BookInput,
  type BookProduction,
  withCovers,
} from '@/application/workflows/book-production';
import {
  type ActiveSession,
  type InputSessions,
  trustedMapping,
} from '@/application/workflows/input-sessions';
import {
  assertSingleBook,
  emptyBindingError,
  type RunAction,
  validateRunOptions,
} from '@/application/workflows/run-preconditions';
import { presentBindingProgress } from '@/application/workflows/binding-progress';
import { withBindingWarnings } from '@/application/workflows/binding-warnings';
import { detailsForBook, noBookDetails, normalizeBookDetails } from '@/domain/book-details';
import {
  type ConversionArtifact,
  type ConversionProgress,
  type ConversionRequest,
  ConversionWorkflowError,
  type PipelineIssue,
  plannedSingleBook,
  plannedVolumeBookName,
  type WorkflowPlan,
} from '@/domain/conversion';
import { pendingVersionGroups } from '@/domain/chapter-versions';
import { hasArchiveChapters, type MappingDraft } from '@/domain/mapping';
import { withSeriesVolume } from '@/domain/series-book';
import { type ProcessMode, unsupportedModeReason, usesMangaprep } from '@/domain/process-mode';
import { message } from '@/domain/message';

/** Plan or convert one folder or CBZ; successful conversions spend their inspected session. */
export class SingleInputRun {
  constructor(
    private readonly binding: BindingPort,
    private readonly conversion: ConversionPort,
    private readonly sessions: InputSessions,
    private readonly books: BookProduction,
    private readonly covers: CoverLookup,
  ) {}

  async convert(
    request: ConversionRequest,
    {
      onArtifact,
      onProgress,
      signal,
    }: {
      /** Called as each book lands, so a failure part-way still leaves the caller knowing which. */
      readonly onArtifact?: (artifact: ConversionArtifact) => void;
      readonly onProgress: (progress: ConversionProgress) => void;
      readonly signal?: AbortSignal;
    },
  ): Promise<readonly ConversionArtifact[]> {
    const { session, mode, singleBook } = this.assertRunnable(request, 'converting');

    const details = usesMangaprep(mode) ? (request.details ?? noBookDetails) : noBookDetails;
    let inputs: readonly BookInput[];
    let bindingIssues: readonly PipelineIssue[] = [];
    // Volumes are a level of the table of contents only where the series has them (ADR 0094).
    let nestedToc = false;
    if (session.selection.kind === 'cbz' || mode === 'convert-only') {
      // Already one book (or explicitly not grouped): straight to mangaprep, no mapping needed.
      inputs = [{ path: session.selection.inputPath }];
    } else {
      if (
        session.trustedDraft === undefined ||
        session.workspaceId === undefined ||
        request.mapping === undefined
      ) {
        throw new ConversionWorkflowError(
          'mapping_required',
          message('workflow.confirmMapping', { before: 'converting' }),
        );
      }
      const mapping = trustedMapping(session.trustedDraft, request.mapping);
      requireVersionsChosen(mapping);
      requireSomethingToBind(mapping, singleBook);
      nestedToc = singleBook && mapping.volumes.length > 0;
      onProgress({
        stage: 'binding',
        message: message('progress.organizingChapters', { chapters: mapping.chapters.length }),
      });
      const bound = await this.binding.bind(
        session.workspaceId,
        mapping,
        signal,
        singleBook,
        (p) => {
          onProgress(presentBindingProgress(p));
        },
        { wholeSeries: singleBook },
      );
      bindingIssues = bound.issues;
      if (singleBook) {
        if (bound.combinedOutputPath === undefined) {
          throw emptyBindingError('no_volumes');
        }
        inputs = [{ path: bound.combinedOutputPath }];
      } else {
        if (bound.volumes.length === 0) {
          throw emptyBindingError('no_volumes');
        }
        inputs = bound.volumes.map((volume) => ({ path: volume.path, volume: volume.number }));
      }
    }

    // A cover is for mangaprep to make; a run that stops at the joined volumes has no use for one.
    if (usesMangaprep(mode)) {
      inputs = withCovers(inputs, await this.covers.pathsFor(session.selection.inputPath));
    }

    const result = await this.books.produceVolumes(
      inputs,
      mode,
      {
        libraryPath: request.libraryPath,
        settings: request.settings,
        details,
        format: request.format,
        nestedToc,
      },
      { onArtifact, onProgress, signal },
    );
    if (result.status === 'failed') throw result.error;
    // What the joining step left out of the books is told with them, since the run went on.
    const artifacts = withBindingWarnings(
      result.artifacts,
      inputs.map((input) => input.volume),
      bindingIssues,
    );
    onProgress({
      stage: 'saving',
      message: message('progress.booksSaved', { count: artifacts.length }),
      ...(mode === 'bind-only' || inputs.length === 1
        ? {}
        : {
            completed: inputs.length,
            total: inputs.length,
            volumes: inputs.map((_input, index) => ({
              number: index + 1,
              status: 'done' as const,
            })),
          }),
    });
    // A finished session is spent: this frees the scratch copies of the joined volumes now instead
    // of when the user starts over. A failed or cancelled run keeps it, so a retry needs no re-scan.
    await this.sessions.release(request.sessionId);
    return artifacts;
  }

  async plan(
    request: ConversionRequest,
    { signal }: { readonly signal?: AbortSignal } = {},
  ): Promise<WorkflowPlan> {
    const { session, mode, singleBook } = this.assertRunnable(request, 'validating');

    if (session.selection.kind === 'cbz' || mode === 'convert-only') {
      const plan = await this.conversion.plan(
        {
          inputPath: session.selection.inputPath,
          outputDirectory: request.libraryPath,
          settings: request.settings,
          book: detailsForBook(request.details ?? noBookDetails),
          format: request.format,
          nestedToc: false,
        },
        signal === undefined ? {} : { signal },
      );
      return {
        tool: 'mangaprep',
        title: plan.title,
        message: message('plan.mangaprep', {
          profile: plan.profile,
          width: plan.width,
          height: plan.height,
          chaptersNotGrouped: session.selection.kind === 'folder',
        }),
        books: [{ name: plan.name, pageCount: plan.pageCount }],
        issues: [],
      };
    }
    if (
      session.trustedDraft === undefined ||
      session.workspaceId === undefined ||
      request.mapping === undefined
    ) {
      throw new ConversionWorkflowError(
        'mapping_required',
        message('workflow.confirmMapping', { before: 'validating' }),
      );
    }
    const mapping = trustedMapping(session.trustedDraft, request.mapping);
    requireVersionsChosen(mapping);
    requireSomethingToBind(mapping, singleBook);
    const plan = await this.binding.plan(session.workspaceId, mapping, signal, {
      wholeSeries: singleBook,
    });
    const typedTitle = normalizeBookDetails(request.details ?? noBookDetails).title;
    const chapters = plan.volumes.reduce(
      (total, volume) => total + (volume.chapters?.length ?? 0),
      0,
    );
    return {
      tool: 'mangabind',
      title: plan.title,
      message: singleBook
        ? message('plan.series', {
            // Only the volumes the person made: the one made for the run is not one of them.
            volumes: mapping.volumes.length,
            chapters,
          })
        : message('plan.mangabind', {
            volumes: plan.volumes.length,
            shape: mode === 'bind-only' ? 'joined' : 'books',
          }),
      books: singleBook
        ? [
            plannedSingleBook(
              plan.title,
              plan.volumes,
              `${typedTitle ?? plan.title}.${request.format}`,
            ),
          ]
        : usesMangaprep(mode)
          ? plan.volumes.map((volume) => ({
              name: plannedVolumeBookName(volume, typedTitle, request.format),
              pageCount: volume.pageCount,
              ...(volume.chapters === undefined ? {} : { chapters: volume.chapters }),
            }))
          : plan.volumes,
      issues: plan.issues,
      ...(plan.leftOut === undefined ? {} : { leftOut: plan.leftOut }),
    };
  }

  /** The single-input checks stay in the same order for conversion and plan validation. */
  private assertRunnable(
    request: ConversionRequest,
    action: RunAction,
  ): { readonly session: ActiveSession; readonly mode: ProcessMode; readonly singleBook: boolean } {
    const mode = validateRunOptions(request, action);
    const session = this.sessions.requireSession(request.sessionId);
    rejectLibrary(session);
    // A folder whose chapters are CBZ files is not pages the converter can read before they are joined.
    const input =
      session.selection.kind === 'folder' && hasArchiveChapters(session.trustedDraft)
        ? 'archives'
        : session.selection.kind;
    const unsupported = unsupportedModeReason(input, mode);
    if (unsupported !== undefined)
      throw new ConversionWorkflowError('unsupported_mode', unsupported);
    const singleBook = session.selection.kind !== 'cbz' && Boolean(request.singleBook);
    if (singleBook) assertSingleBook(mode);
    return { session, mode, singleBook };
  }
}

/**
 * A series made into one book needs no volumes, but it does need a chapter to put in the book: a
 * folder none of whose chapters can be placed has nothing to bind.
 */
function requireSomethingToBind(mapping: MappingDraft, singleBook: boolean): void {
  if (singleBook && withSeriesVolume(mapping).volumes.length === 0) {
    throw emptyBindingError('no_volumes');
  }
}

/** Chapters that more than one file claims are not decided by the app: a run waits for a person to. */
function requireVersionsChosen(mapping: MappingDraft): void {
  const pending = pendingVersionGroups(mapping);
  if (pending.length > 0) {
    throw new ConversionWorkflowError(
      'versions_pending',
      message('workflow.versionsPending', { count: pending.length }),
    );
  }
}

/** A library is converted through its own run, so the calls for one input refuse its session. */
function rejectLibrary(session: ActiveSession): void {
  if (session.library !== undefined) {
    throw new ConversionWorkflowError('unsupported_mode', message('workflow.libraryByTitle', {}));
  }
}
