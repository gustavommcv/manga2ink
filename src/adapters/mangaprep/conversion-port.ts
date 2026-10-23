import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import sanitizeFilename from 'sanitize-filename';

import type { MangaprepCliAdapter } from './cli';
import { isMangaprepPageEvent, type MangaprepErrorEvent, type MangaprepEvent } from './protocol';

import type { ConversionPort } from '@/application/ports/conversion-tools';
import { type BookDetails, canonicalLanguageTag } from '@/domain/book-details';
import {
  type BookFormat,
  type ConversionArtifact,
  type ConversionProgress,
  type PipelineIssue,
  ToolExecutionError,
} from '@/domain/conversion';
import type { MangaprepSettings } from '@/domain/output-profile';
import { message } from '@/domain/message';
import { messagesFor } from '@/i18n/messages';
import { say } from '@/i18n/say';

export class MangaprepConversionAdapter implements ConversionPort {
  constructor(
    private readonly cli: Pick<MangaprepCliAdapter, 'run'>,
    private readonly createId: () => string = randomUUID,
  ) {}

  async plan(
    request: {
      readonly inputPath: string;
      readonly outputDirectory: string;
      readonly settings: MangaprepSettings;
      readonly book?: BookDetails;
      readonly format: BookFormat;
      readonly nestedToc?: boolean;
    },
    options: { readonly signal?: AbortSignal } = {},
  ): ReturnType<ConversionPort['plan']> {
    const { combineIntoOneVolume, deviceProfile, ...settings } = request.settings;
    void combineIntoOneVolume;
    const nestedToc = Boolean(request.nestedToc);
    const run = await this.cli.run(
      {
        inputPath: request.inputPath,
        outputPath: conversionOutputPath(request),
        profile: deviceProfile,
        format: request.format,
        dryRun: true,
        nestedToc,
        ...settings,
        ...bookArguments(request.book, settings.language),
      },
      options.signal === undefined ? {} : { signal: options.signal },
    );
    const result = requireSuccessfulResult(run);
    if (
      result.operation !== 'convert' ||
      result.dry_run !== true ||
      result.written !== false ||
      result.output_path === undefined ||
      result.manga === undefined ||
      result.profile === undefined ||
      result.width === undefined ||
      result.height === undefined ||
      result.source_pages === undefined
    ) {
      throw new Error('Mangaprep returned an incomplete conversion plan.');
    }
    const outputPath = checkedChildPath(request.outputDirectory, result.output_path);
    return {
      title: result.manga,
      name: path.basename(outputPath),
      pageCount: result.source_pages,
      profile: result.profile,
      width: result.width,
      height: result.height,
    };
  }

  async convert(
    request: {
      readonly inputPath: string;
      readonly outputDirectory: string;
      readonly settings: MangaprepSettings;
      readonly book?: BookDetails;
      readonly cover?: string;
      readonly format: BookFormat;
      readonly nestedToc?: boolean;
    },
    options: {
      readonly signal?: AbortSignal;
      readonly onProgress: (progress: ConversionProgress) => void;
    },
  ): Promise<ConversionArtifact> {
    const { combineIntoOneVolume, deviceProfile, ...settings } = request.settings;
    void combineIntoOneVolume;
    const nestedToc = Boolean(request.nestedToc);
    const run = await this.cli.run(
      {
        inputPath: request.inputPath,
        outputPath: conversionOutputPath(request),
        profile: deviceProfile,
        format: request.format,
        dryRun: false,
        nestedToc,
        ...settings,
        ...bookArguments(request.book, settings.language),
        ...(request.cover === undefined ? {} : { cover: request.cover }),
      },
      {
        ...(options.signal === undefined ? {} : { signal: options.signal }),
        onEvent: (event) => {
          const progress = progressFromEvent(event);
          if (progress !== undefined) options.onProgress(progress);
        },
      },
    );
    const result = requireSuccessfulResult(
      run,
      request.cover === undefined
        ? undefined
        : { book: request.book?.title ?? path.basename(request.inputPath) },
    );
    if (
      result.operation !== 'convert' ||
      result.written !== true ||
      result.output_path === undefined ||
      result.bytes === undefined ||
      result.format === undefined
    ) {
      throw new Error('Mangaprep returned an incomplete conversion result.');
    }
    const outputPath = checkedChildPath(request.outputDirectory, result.output_path);
    return {
      id: this.createId(),
      name: path.basename(outputPath),
      path: outputPath,
      bytes: result.bytes,
      format: result.format,
      title: result.manga ?? path.basename(outputPath, path.extname(outputPath)),
      author: result.author ?? 'Unknown',
      // Only the code and the tool's own sentence go on: the path in a warning is the tool's
      // input, which for a bound volume is a scratch file nobody chose.
      ...(run.warnings.length === 0
        ? {}
        : { warnings: run.warnings.map(({ code, message }) => ({ code, message })) }),
    };
  }
}

/** The codes with which mangaprep says the cover it was given could not be used. */
const coverErrorCodes: ReadonlySet<string> = new Set(['cover_build_failed', 'cover_read_failed']);

function requireSuccessfulResult(
  run: Awaited<ReturnType<MangaprepCliAdapter['run']>>,
  cover?: { readonly book: string },
): NonNullable<Awaited<ReturnType<MangaprepCliAdapter['run']>>['result']> {
  if (run.exitCode === 0 && run.result !== undefined) return run.result;
  const error = run.errors[0];
  if (error === undefined) {
    // The tool said nothing the person can use, so the app says it; the English is the record.
    const said = message('failure.conversionFailed', {});
    throw new ToolExecutionError(
      {
        tool: 'mangaprep',
        severity: 'error',
        code: 'process_failed',
        stage: 'conversion',
        recoverable: true,
        message: say(messagesFor('en').said, said),
        ...(run.stderr === '' ? {} : { diagnostic: run.stderr }),
      },
      run.exitCode,
      { said },
    );
  }
  const issue = issueFromError(error);
  if (cover !== undefined && coverErrorCodes.has(issue.code)) {
    throw aboutTheCover(issue, cover.book, run.exitCode);
  }
  throw new ToolExecutionError(issue, run.exitCode);
}

/**
 * The cover a person chose for a book could not be used. The tool says so in terms of an image;
 * the person needs to know which book it is and where to change it, and the tool's own words and
 * diagnostic stay with the details.
 */
function aboutTheCover(
  issue: PipelineIssue,
  book: string,
  exitCode: number | null,
): ToolExecutionError {
  const said = message('failure.coverUnusable', { book });
  return new ToolExecutionError(
    {
      ...issue,
      message: say(messagesFor('en').said, said),
      diagnostic: [issue.message, issue.diagnostic].filter((part) => part !== undefined).join(' '),
    },
    exitCode,
    { said },
  );
}

function issueFromError(error: MangaprepErrorEvent): PipelineIssue {
  return {
    tool: 'mangaprep',
    severity: 'error',
    code: error.code,
    stage: error.stage,
    recoverable: error.recoverable,
    message: error.message,
    diagnostic: error.diagnostic,
    ...(error.manga === undefined ? {} : { manga: error.manga }),
    ...(error.volume === undefined ? {} : { volume: String(error.volume) }),
    ...(error.chapter === undefined ? {} : { chapter: String(error.chapter) }),
    ...(error.page === undefined ? {} : { page: error.page }),
    ...(error.path === undefined ? {} : { path: error.path }),
  };
}

function progressFromEvent(event: MangaprepEvent): ConversionProgress | undefined {
  if (isMangaprepPageEvent(event)) {
    return {
      stage: 'processing',
      message: message('progress.pageProcessed', {
        completed: event.completed,
        total: event.total,
      }),
      completed: event.completed,
      total: event.total,
      chapter: event.chapter,
      page: event.page,
    };
  }
  if (event.type === 'stage' && event.state === 'started' && typeof event.stage === 'string') {
    return {
      stage: event.stage === 'write' ? 'saving' : 'processing',
      message:
        event.stage === 'write'
          ? message('progress.savingBook', {})
          : message('progress.stageStarted', { stage: event.stage }),
    };
  }
  return undefined;
}

function checkedChildPath(parentPath: string, childPath: string): string {
  const parent = path.resolve(parentPath);
  const child = path.resolve(childPath);
  const parentUrl = pathToFileURL(`${parent}${path.sep}`).href;
  if (!pathToFileURL(child).href.startsWith(parentUrl)) {
    throw new Error('Mangaprep reported an output outside the selected library.');
  }
  return child;
}

/**
 * Since mangapress 0.7.3 (now mangaprep), --title changes metadata only. Use explicit-file output
 * for a typed title, leaving validation, collision handling and publication to the tool.
 */
function conversionOutputPath(request: {
  readonly outputDirectory: string;
  readonly book?: BookDetails;
  readonly format: BookFormat;
  readonly settings: MangaprepSettings;
}): string {
  if (request.book?.title === undefined) return request.outputDirectory;
  // Custom dimensions remove the tool's device family. --nokepub changes only the extension:
  // plain Kobo EPUB filenames need the same replacements as .kepub.epub (KCC 12.1.1).
  const koboEpub =
    request.format === 'epub' &&
    request.settings.deviceProfile.startsWith('Ko') &&
    (request.settings.customWidth ?? 0) === 0 &&
    (request.settings.customHeight ?? 0) === 0;
  // The CLI sanitizes derived names only; the app supplies an explicit filename for typed titles.
  // Replace each Kobo-unsafe character separately, then apply portable filename rules.
  const title = koboEpub
    ? request.book.title.replace(/[/\\?%*:;|"'><$!]/gu, '_')
    : request.book.title;
  const stem = sanitizeFilename(title, { replacement: '-' }) || 'Book';
  const kepub = koboEpub && !request.settings.noKepub;
  return path.join(request.outputDirectory, `${stem}.${kepub ? 'kepub.epub' : request.format}`);
}

/** The title, author and language one book is made with: its own details over the defaults. */
function bookArguments(
  book: BookDetails | undefined,
  defaultLanguage: string,
): { readonly title?: string; readonly author?: string; readonly language: string } {
  return {
    ...(book?.title === undefined ? {} : { title: book.title }),
    ...(book?.author === undefined ? {} : { author: book.author }),
    // However it was typed or kept, the book is written with the casing BCP 47 recommends.
    language: canonicalLanguageTag(book?.language ?? defaultLanguage),
  };
}
