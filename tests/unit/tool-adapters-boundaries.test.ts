import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import { MangabindCliAdapter } from '@/adapters/mangabind/cli';
import { MangapressCliAdapter } from '@/adapters/mangapress/cli';
import type { MangapressRunResult } from '@/adapters/mangapress/cli';
import { MangapressConversionAdapter } from '@/adapters/mangapress/conversion-port';
import {
  isMangapressResultEvent,
  parseMangapressEventLine,
  type MangapressErrorEvent,
  type MangapressEvent,
  type MangapressResultEvent,
} from '@/adapters/mangapress/protocol';
import { MangaDexProvider } from '@/adapters/metadata-providers/mangadex/provider';
import { requestText } from '@/adapters/metadata-providers/http';
import type { ProcessRunner } from '@/application/ports/process-runner';
import { defaultMangapressSettings } from '@/domain/output-profile';

// ---- what the tools say -------------------------------------------------------------------------

function event(fields: Record<string, unknown>): MangapressEvent {
  return parseMangapressEventLine(
    JSON.stringify({
      protocol_version: 1,
      tool: 'mangapress',
      tool_version: '0.5.0',
      sequence: 1,
      type: 'future',
      ...fields,
    }),
  );
}
/** What the tool writes: one event a line, numbered from 1, as it numbers them. */
const streamOf = (...events: Record<string, unknown>[]): string =>
  events
    .map(
      (fields, index) =>
        `${JSON.stringify({
          protocol_version: 1,
          tool: 'mangapress',
          tool_version: '0.5.0',
          sequence: index + 1,
          type: 'future',
          ...fields,
        })}\n`,
    )
    .join('');
const warningFields = {
  type: 'warning',
  severity: 'warning',
  code: 'w',
  stage: 'process',
  recoverable: true,
  message: 'm',
};
const resultFields = {
  type: 'result',
  status: 'completed',
  operation: 'convert',
  dry_run: false,
  manga: 'Book',
  format: 'epub',
  profile: 'KV',
  width: 1072,
  height: 1448,
  chapters: 1,
  source_pages: 1,
  output_pages: 1,
  output_path: path.resolve('/library', 'Book.epub'),
  bytes: 512,
  written: true,
};
function resultEvent(fields: Record<string, unknown> = {}): MangapressResultEvent {
  const parsed = event({ ...resultFields, ...fields });
  if (!isMangapressResultEvent(parsed)) throw new Error('Invalid result fixture.');
  return parsed;
}
function runResult(overrides: Partial<MangapressRunResult> = {}): MangapressRunResult {
  const result = resultEvent();
  return {
    events: overrides.events ?? [result],
    errors: overrides.errors ?? [],
    warnings: overrides.warnings ?? [],
    ...('result' in overrides ? { result: overrides.result } : { result }),
    exitCode: 'exitCode' in overrides ? (overrides.exitCode ?? null) : 0,
    stderr: overrides.stderr ?? '',
  };
}
const convertRequest = {
  inputPath: path.resolve('/input', 'Volume 01.cbz'),
  outputDirectory: path.resolve('/library'),
  settings: defaultMangapressSettings,
  format: 'epub' as const,
};

/** What a promise rejected with, for the tests that look at the error rather than expect it. */
const rejectionOf = (promise: Promise<unknown>): Promise<unknown> =>
  promise.then(
    () => undefined,
    (error: unknown) => error,
  );

// ---- the conversion port ------------------------------------------------------------------------

describe('a conversion that can be cancelled', () => {
  it('hands the signal to the tool when planning, and nothing when there is none', async () => {
    const run = vi.fn<MangapressCliAdapter['run']>(() =>
      Promise.resolve(runResult({ result: resultEvent({ dry_run: true, written: false }) })),
    );
    const adapter = new MangapressConversionAdapter({ run });
    const controller = new AbortController();

    await adapter.plan(convertRequest, { signal: controller.signal });
    await adapter.plan(convertRequest);

    expect(run.mock.calls[0]?.[1]).toEqual({ signal: controller.signal });
    expect(run.mock.calls[1]?.[1]).toEqual({});
    expect(run.mock.calls[1]?.[1]).not.toHaveProperty('signal');
  });

  it('hands the signal to the tool when converting, and nothing when there is none', async () => {
    const run = vi.fn<MangapressCliAdapter['run']>(() => Promise.resolve(runResult()));
    const adapter = new MangapressConversionAdapter({ run }, () => 'id');
    const controller = new AbortController();

    await adapter.convert(convertRequest, { onProgress: vi.fn(), signal: controller.signal });
    await adapter.convert(convertRequest, { onProgress: vi.fn() });

    expect(run.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
    expect(run.mock.calls[1]?.[1]).not.toHaveProperty('signal');
  });
});

describe('what a conversion tells the person while it runs', () => {
  it('is a line for each stage that starts, a count for each page, and nothing else', async () => {
    const run = vi.fn<MangapressCliAdapter['run']>((_request, options = {}) => {
      options.onEvent?.(event({ type: 'stage', stage: 'inspect', state: 'started' }));
      options.onEvent?.(event({ type: 'stage', stage: 'inspect', state: 'completed' }));
      options.onEvent?.(
        event({
          type: 'page',
          stage: 'process',
          state: 'completed',
          chapter: 'Chapter 1',
          chapter_index: 1,
          page: 7,
          completed: 7,
          total: 10,
        }),
      );
      options.onEvent?.(event({ type: 'stage', stage: 'write', state: 'started' }));
      options.onEvent?.(event({ type: 'stage', stage: 'write', state: 'completed' }));
      options.onEvent?.(event({ ...warningFields, code: 'x' }));
      options.onEvent?.(event({ type: 'future' }));
      return Promise.resolve(runResult());
    });
    const onProgress = vi.fn<(progress: unknown) => void>();

    await new MangapressConversionAdapter({ run }, () => 'id').convert(convertRequest, {
      onProgress,
    });

    expect(onProgress.mock.calls.map(([progress]) => progress)).toEqual([
      { stage: 'processing', message: 'Starting inspect…' },
      {
        stage: 'processing',
        message: 'Processed page 7 of 10.',
        completed: 7,
        total: 10,
        chapter: 'Chapter 1',
        page: 7,
      },
      { stage: 'saving', message: 'Saving the finished book…' },
    ]);
  });
});

describe('what a conversion that failed says', () => {
  const failing = (run: MangapressRunResult) =>
    new MangapressConversionAdapter({ run: () => Promise.resolve(run) });

  it('is the tool’s own error, with only the fields it gave, the volume and chapter as text', async () => {
    const error = event({
      type: 'error',
      severity: 'error',
      code: 'page_processing_failed',
      stage: 'process',
      recoverable: false,
      message: "Couldn't process page 17.",
      diagnostic: 'decoder failed',
      manga: 'Work',
      volume: 2,
      chapter: 4,
      page: 17,
      path: '/input.cbz',
    }) as MangapressErrorEvent;

    await expect(
      failing(runResult({ exitCode: 1, errors: [error], result: undefined })).convert(
        convertRequest,
        { onProgress: vi.fn() },
      ),
    ).rejects.toMatchObject({
      exitCode: 1,
      issue: {
        code: 'page_processing_failed',
        recoverable: false,
        manga: 'Work',
        volume: '2',
        chapter: '4',
        page: 17,
        path: '/input.cbz',
      },
    });
  });

  it('has no field the tool did not give, not even an empty one', async () => {
    const error = event({
      type: 'error',
      severity: 'error',
      code: 'input_empty',
      stage: 'inspect',
      recoverable: true,
      message: 'The input is empty.',
      diagnostic: 'empty',
    }) as MangapressErrorEvent;

    const thrown = (await rejectionOf(
      failing(runResult({ exitCode: 1, errors: [error], result: undefined })).convert(
        convertRequest,
        { onProgress: vi.fn() },
      ),
    )) as { issue: Record<string, unknown> };

    for (const absent of ['manga', 'volume', 'chapter', 'page', 'path']) {
      expect(thrown.issue).not.toHaveProperty(absent);
    }
  });

  it('says it could not convert, with what the tool wrote as the detail, when it gave no error', async () => {
    const withStderr = failing(
      runResult({ exitCode: 3, result: undefined, stderr: 'segmentation fault' }),
    ).convert(convertRequest, { onProgress: vi.fn() });
    await expect(withStderr).rejects.toMatchObject({
      exitCode: 3,
      issue: {
        code: 'process_failed',
        recoverable: true,
        message: 'Mangapress could not convert this volume.',
        diagnostic: 'segmentation fault',
      },
    });

    const silent = (await rejectionOf(
      failing(runResult({ exitCode: 3, result: undefined, stderr: '' })).convert(convertRequest, {
        onProgress: vi.fn(),
      }),
    )) as { issue: Record<string, unknown> };
    expect(silent.issue).not.toHaveProperty('diagnostic');
  });

  it('is a failure even when the tool exited cleanly and gave no result', async () => {
    await expect(
      failing(runResult({ exitCode: 0, result: undefined })).convert(convertRequest, {
        onProgress: vi.fn(),
      }),
    ).rejects.toMatchObject({ issue: { code: 'process_failed' } });
  });
});

// ---- the two command-line adapters --------------------------------------------------------------

function runnerReturning(
  stdout: string,
  stderr = '',
  exitCode = 0,
): { runner: ProcessRunner; run: ReturnType<typeof vi.fn> } {
  const run = vi.fn(
    (
      _request: unknown,
      options?: { onChunk?: (chunk: { stream: 'stdout' | 'stderr'; text: string }) => void },
    ) => {
      // Streamed the way the process runner does: stdout, then stderr, as they came.
      if (stdout !== '') options?.onChunk?.({ stream: 'stdout', text: stdout });
      if (stderr !== '') options?.onChunk?.({ stream: 'stderr', text: stderr });
      return Promise.resolve({ exitCode, signal: null, stdout, stderr });
    },
  );
  return { runner: { run }, run };
}

describe('the command line of mangapress', () => {
  const profile = {
    type: 'profile',
    code: 'KV',
    name: 'Kindle Voyage',
    width: 1072,
    height: 1448,
    gray_levels: 16,
    family: 'kindle',
  };
  const listed = streamOf(profile, {
    type: 'result',
    status: 'completed',
    operation: 'list_profiles',
    profiles: 1,
  });

  it('hands the signal to the tool when it lists the profiles, and nothing when there is none', async () => {
    const { runner, run } = runnerReturning(listed);
    const cli = new MangapressCliAdapter('mangapress', runner);
    const controller = new AbortController();

    await cli.listProfiles(controller.signal);
    await cli.listProfiles();

    expect((run.mock.calls[0] as unknown[])[1]).toMatchObject({ signal: controller.signal });
    expect((run.mock.calls[1] as unknown[])[1]).not.toHaveProperty('signal');
  });

  it('reads what is on the standard output and leaves the standard error to the diagnostic', async () => {
    const { runner } = runnerReturning(listed, 'noise on the standard error\n');
    const seen: string[] = [];

    const run = await new MangapressCliAdapter('mangapress', runner).run(
      {
        inputPath: '/input',
        outputPath: '/out',
        profile: 'KV',
        format: 'epub',
        dryRun: false,
        nestedToc: false,
        ...defaultMangapressSettings,
      } as never,
      { onEvent: (heard) => seen.push(heard.type) },
    );

    expect(seen).toEqual(['profile', 'result']);
    expect(run.stderr).toContain('noise on the standard error');
  });

  it('has no result when the last thing the tool said was not one', async () => {
    const stopped = streamOf(profile, warningFields);
    const { runner } = runnerReturning(stopped, '', 2);

    const run = await new MangapressCliAdapter('mangapress', runner).run({
      inputPath: '/input',
      outputPath: '/out',
      profile: 'KV',
      format: 'epub',
      dryRun: false,
      nestedToc: false,
      ...defaultMangapressSettings,
    } as never);

    expect(run.exitCode).toBe(2);
    expect(run).not.toHaveProperty('result');
  });
});

describe('the command line of mangabind', () => {
  // A real report of the tool, as the other tests of its adapters read it.
  const report = readFileSync(
    path.join(import.meta.dirname, '..', 'fixtures', 'protocol', 'mangabind-v1-plan.json'),
    'utf8',
  );
  const progressLine = `${JSON.stringify({
    protocol_version: 1,
    tool: 'mangabind',
    tool_version: '0.7.1',
    kind: 'progress',
    stage: 'write',
    state: 'advanced',
    manga: 'Work',
    volume_index: 1,
    volume_count: 2,
    volume_number: 1,
    completed_pages: 1,
    total_pages: 4,
  })}\n`;
  const request = { inputPath: '/input', outputPath: '/out', dryRun: false } as const;

  it('hands the signal to the tool, and nothing when there is none', async () => {
    const { runner, run } = runnerReturning(report);
    const cli = new MangabindCliAdapter('mangabind', runner);
    const controller = new AbortController();

    await cli.run(request, { signal: controller.signal });
    await cli.run(request);

    expect((run.mock.calls[0] as unknown[])[1]).toMatchObject({ signal: controller.signal });
    expect((run.mock.calls[1] as unknown[])[1]).not.toHaveProperty('signal');
  });

  it('hears progress only from the standard error, and only when it was asked to', async () => {
    const heard: unknown[] = [];
    const { runner } = runnerReturning(report, progressLine);
    const asking = new MangabindCliAdapter('mangabind', runner, true);

    const answer = await asking.run(request, { onProgress: (event) => heard.push(event) });

    expect(heard).toHaveLength(1);
    // The side channel is not a diagnostic: it is not handed on as one.
    expect(answer.stderr).toBe('');

    const unaware = new MangabindCliAdapter(
      'mangabind',
      runnerReturning(report, progressLine).runner,
    );
    const quiet: unknown[] = [];
    const kept = await unaware.run(request, { onProgress: (event) => quiet.push(event) });
    expect(quiet).toEqual([]);
    expect(kept.stderr).toBe(progressLine);
  });

  it('hears a last line the tool did not end, and needs nobody listening to read it', async () => {
    const unfinished = progressLine.trimEnd();
    const heard: unknown[] = [];
    const cli = new MangabindCliAdapter(
      'mangabind',
      runnerReturning(report, unfinished).runner,
      true,
    );

    await cli.run(request, { onProgress: (event) => heard.push(event) });
    expect(heard).toHaveLength(1);

    // Nobody listening: the tool is not asked for progress, and the line is just text.
    const deaf = new MangabindCliAdapter(
      'mangabind',
      runnerReturning(report, unfinished).runner,
      true,
    );
    await expect(deaf.run(request)).resolves.toMatchObject({ exitCode: 0 });
  });
});

// ---- the metadata services ----------------------------------------------------------------------

describe('a request to a metadata service that is cancelled or that takes too long', () => {
  const whenStopped = <T>(signal: AbortSignal | null | undefined): Promise<T> =>
    new Promise((_resolve, reject) => {
      const fail = (): void => {
        reject(signal?.reason as Error);
      };
      if (signal?.aborted === true) fail();
      signal?.addEventListener('abort', fail);
    });
  const silent = (): typeof fetch => (_url, init) => whenStopped(init?.signal);

  it('is a service that did not answer in time, also when the person could still have cancelled', async () => {
    const controller = new AbortController();

    await expect(
      requestText(silent(), {
        url: 'https://x.test',
        serviceName: 'Example',
        signal: controller.signal,
        timeoutMs: 10,
      }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });

  it('is the person’s own cancellation, not a service that did not answer, when they cancelled', async () => {
    const controller = new AbortController();
    const asked = requestText(silent(), {
      url: 'https://x.test',
      serviceName: 'Example',
      signal: controller.signal,
      timeoutMs: 60_000,
    });

    controller.abort();

    await expect(asked).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('is the person’s cancellation too when the time was also over, once they had cancelled', async () => {
    const controller = new AbortController();
    // The service only gives up after both the time and the person's cancellation have happened.
    const slow: typeof fetch = () =>
      new Promise((_resolve, reject) => {
        setTimeout(() => {
          reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
        }, 60);
      });
    const asked = requestText(slow, {
      url: 'https://x.test',
      serviceName: 'Example',
      signal: controller.signal,
      timeoutMs: 5,
    });
    setTimeout(() => {
      controller.abort();
    }, 25);

    await expect(asked).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('keeps what went wrong as the cause of a service that could not be reached or timed out', async () => {
    const offline = new TypeError('offline');

    const unreachable = (await rejectionOf(
      requestText(() => Promise.reject(offline), { url: 'https://x.test', serviceName: 'Example' }),
    )) as Error;
    expect(unreachable.cause).toBe(offline);

    const late = (await rejectionOf(
      requestText(silent(), { url: 'https://x.test', serviceName: 'Example', timeoutMs: 5 }),
    )) as Error;
    expect(late.cause).toBeDefined();
  });

  it('is passed on by the MangaDex source, for a search and for its volumes', async () => {
    const seen: (AbortSignal | null | undefined)[] = [];
    const fetchImpl = vi.fn<typeof fetch>((_url, init) => {
      seen.push(init?.signal);
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
      } as Response);
    });
    const provider = new MangaDexProvider(fetchImpl);
    const controller = new AbortController();

    await provider.search('Work', controller.signal).catch(() => undefined);
    await provider.suggestVolumes('work-id', { signal: controller.signal }).catch(() => undefined);
    controller.abort();

    // The signal of each request is the person's, joined with the time limit: it ends when theirs does.
    expect(seen).toHaveLength(2);
    expect(seen.every((signal) => signal?.aborted === true)).toBe(true);
  });

  it('has no cancellation of its own to join when the person gave none', async () => {
    const seen: (AbortSignal | null | undefined)[] = [];
    const fetchImpl = vi.fn<typeof fetch>((_url, init) => {
      seen.push(init?.signal);
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
      } as Response);
    });

    await new MangaDexProvider(fetchImpl).search('Work').catch(() => undefined);

    expect(seen[0]?.aborted).toBe(false);
  });
});
