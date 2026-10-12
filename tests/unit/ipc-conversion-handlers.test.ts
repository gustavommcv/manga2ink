import type { IpcMainInvokeEvent } from 'electron';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToolExecutionError } from '@/domain/conversion';
import type { ConversionArtifact } from '@/domain/conversion';
import { defaultMangapressSettings } from '@/domain/output-profile';
import { registerConversionHandlers } from '@/main/ipc/conversion';
import { PendingRunActivity } from '@/main/pending-run-activity';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;
const listeners = vi.hoisted(() => new Map<string, Listener>());
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: Listener) => {
      listeners.set(channel, listener);
    },
  },
}));

type Context = Parameters<typeof registerConversionHandlers>[0];

const mainFrame = {};
const send = vi.fn();
const event = {
  sender: { mainFrame, send },
  senderFrame: mainFrame,
} as unknown as IpcMainInvokeEvent;
const call = (channel: string, payload: unknown = {}): Promise<WorkflowResult<unknown>> =>
  listeners.get(channel)!(event, payload);

const libraryPath = path.resolve('pending', 'run');
const book = (id: string): ConversionArtifact => ({
  id,
  name: `${id}.epub`,
  path: path.join(libraryPath, `${id}.epub`),
  bytes: 100,
  format: 'epub',
  title: 'Manga',
  author: 'Unknown',
});

const command = {
  jobId: 'job',
  sessionId: 'session',
  libraryId: 'run',
  settings: defaultMangapressSettings,
  format: 'cbz',
};

function build(workflow: Record<string, unknown>) {
  const context = {
    mangapressCli: undefined,
    selectedLibraries: new Map([['run', libraryPath]]),
    activeJobs: new Map<string, AbortController>(),
    workflow,
    artifactPaths: new Map(),
    pendingArtifacts: new Map(),
    pendingRunActivity: new PendingRunActivity(),
    pendingRuns: { prepare: vi.fn().mockResolvedValue(libraryPath) },
    libraryPublisher: { publish: vi.fn().mockResolvedValue(undefined) },
  } as unknown as Context;
  registerConversionHandlers(context);
  return context;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});
afterEach(() => {
  listeners.clear();
  send.mockReset();
  vi.restoreAllMocks();
});

describe('the device list', () => {
  it('is what mangapress lists, in the names the screen uses', async () => {
    const context = build({});
    (context as { mangapressCli: unknown }).mangapressCli = {
      listProfiles: () =>
        Promise.resolve({
          profiles: [
            {
              code: 'KPW6',
              name: 'Kindle Paperwhite 6',
              width: 1272,
              height: 1696,
              gray_levels: 16,
              family: 'kindle',
              extra: 'left out',
            },
          ],
        }),
    };

    expect(await call('workflow:get-device-profiles')).toEqual({
      ok: true,
      value: [
        {
          code: 'KPW6',
          name: 'Kindle Paperwhite 6',
          width: 1272,
          height: 1696,
          grayLevels: 16,
          family: 'kindle',
        },
      ],
    });
  });

  it('is a failure the screen can say when mangapress is not there', async () => {
    build({});

    const result = await call('workflow:get-device-profiles');

    expect(result.ok).toBe(false);
  });
});

describe('validating a plan', () => {
  it('sends only what was given, and is over when it is answered', async () => {
    const plan = vi.fn().mockResolvedValue({ title: 'Manga', books: [], issues: [] });
    const context = build({ plan });
    const { libraryId: _libraryId, ...planCommand } = command;
    void _libraryId;

    const mapping = { mangaTitle: 'Manga', chapters: [], volumes: [] };
    const aSignal: unknown = expect.any(AbortSignal);
    const result = await call('workflow:plan', {
      ...planCommand,
      mapping,
      mode: 'bind-and-convert',
      singleBook: true,
      details: { author: 'Someone' },
    });

    expect(result).toEqual({ ok: true, value: { title: 'Manga', books: [], issues: [] } });
    expect(plan).toHaveBeenCalledExactlyOnceWith(
      {
        sessionId: 'session',
        libraryPath,
        settings: defaultMangapressSettings,
        format: 'cbz',
        mapping,
        mode: 'bind-and-convert',
        singleBook: true,
        details: { author: 'Someone' },
      },
      { signal: aSignal },
    );
    expect(context.activeJobs.size).toBe(0);
  });

  it('refuses a job that is already running, and a failure frees the job', async () => {
    const context = build({ plan: vi.fn().mockRejectedValue(new Error('boom')) });
    const { libraryId: _libraryId, ...planCommand } = command;
    void _libraryId;
    context.activeJobs.set('taken', new AbortController());

    const second = await call('workflow:plan', { ...planCommand, jobId: 'taken' });
    const third = await call('workflow:plan', planCommand);

    expect(second).toMatchObject({ ok: false, error: { code: 'job_exists' } });
    expect(third.ok).toBe(false);
    expect(context.activeJobs.has('job')).toBe(false);
  });

  it('cannot run without a place for the pending books', async () => {
    const context = build({ plan: vi.fn() });
    (context as { pendingRuns: unknown }).pendingRuns = undefined;
    const { libraryId: _libraryId, ...planCommand } = command;
    void _libraryId;

    expect((await call('workflow:plan', planCommand)).ok).toBe(false);
  });
});

describe('converting one input', () => {
  it('tells the screen about each book and the progress, and sends no path', async () => {
    const convert = vi.fn(
      (
        _request: unknown,
        options: { onProgress: (p: unknown) => void; onArtifact?: (a: ConversionArtifact) => void },
      ) => {
        options.onProgress({ stage: 'processing', message: 'Page 1' });
        return Promise.resolve([{ ...book('one'), warnings: [{ code: 'w', message: 'careful' }] }]);
      },
    );
    build({ convert });

    const mapping = { mangaTitle: 'Manga', chapters: [], volumes: [] };
    const result = await call('workflow:convert', {
      ...command,
      mapping,
      mode: 'convert-only',
      singleBook: false,
      details: { title: 'Typed' },
    });

    expect(result).toEqual({
      ok: true,
      value: [
        {
          id: 'one',
          name: 'one.epub',
          bytes: 100,
          format: 'epub',
          warnings: [{ code: 'w', message: 'careful' }],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain(libraryPath);
    expect(send).toHaveBeenCalledWith('workflow:progress', {
      jobId: 'job',
      stage: 'processing',
      message: 'Page 1',
    });
    expect(convert.mock.calls[0]?.[0]).toMatchObject({
      sessionId: 'session',
      libraryPath,
      mapping,
      mode: 'convert-only',
      singleBook: false,
      details: { title: 'Typed' },
    });
  });

  it('sends only what was given', async () => {
    const convert = vi.fn().mockResolvedValue([]);
    build({ convert });

    await call('workflow:convert', command);

    const request = convert.mock.calls[0]?.[0] as Record<string, unknown>;
    for (const field of ['mapping', 'mode', 'singleBook', 'details']) {
      expect(request).not.toHaveProperty(field);
    }
  });

  it('says which library is not there when the run was not prepared', async () => {
    build({ convert: vi.fn() });

    expect(await call('workflow:convert', { ...command, libraryId: 'gone' })).toMatchObject({
      ok: false,
      error: { code: 'library_not_found' },
    });
  });
});

describe('converting a library', () => {
  it('sends each title’s details and options on, and says what each title made or why not', async () => {
    const convertLibrary = vi.fn(
      (_request: unknown, options: { onProgress: (p: unknown) => void }) => {
        options.onProgress({ stage: 'binding', message: 'Binding' });
        return Promise.resolve([
          { title: 'Good', status: 'done', artifacts: [book('good')] },
          {
            title: 'Bad',
            status: 'failed',
            artifacts: [],
            error: new ToolExecutionError(
              {
                tool: 'mangapress',
                severity: 'error',
                code: 'process_failed',
                stage: 'processing',
                recoverable: false,
                message: 'mangapress crashed.',
              },
              1,
            ),
          },
        ]);
      },
    );
    build({ convertLibrary });
    const own = {
      title: 'Good',
      settings: { ...defaultMangapressSettings, webtoon: true },
      format: 'epub',
    };

    const result = await call('workflow:convert-library', {
      ...command,
      titles: ['Good', 'Bad'],
      mode: 'bind-and-convert',
      singleBook: false,
      titleDetails: [{ title: 'Good', details: { author: 'Someone' } }],
      titleOptions: [own],
    });

    expect(convertLibrary.mock.calls[0]?.[0]).toMatchObject({
      sessionId: 'session',
      libraryPath,
      titles: ['Good', 'Bad'],
      mode: 'bind-and-convert',
      singleBook: false,
      titleDetails: [{ title: 'Good', details: { author: 'Someone' } }],
      titleOptions: [own],
    });
    expect(result).toMatchObject({
      ok: true,
      value: [
        { title: 'Good', status: 'done', artifacts: [{ id: 'good' }] },
        {
          title: 'Bad',
          status: 'failed',
          artifacts: [],
          failure: { code: 'process_failed', message: 'mangapress crashed.' },
        },
      ],
    });
    expect(send).toHaveBeenCalledWith('workflow:progress', {
      jobId: 'job',
      stage: 'binding',
      message: 'Binding',
    });
  });

  it('sends nothing the person did not choose', async () => {
    const convertLibrary = vi.fn().mockResolvedValue([]);
    build({ convertLibrary });

    await call('workflow:convert-library', command);

    const request = convertLibrary.mock.calls[0]?.[0] as Record<string, unknown>;
    for (const field of ['titles', 'mode', 'singleBook', 'titleDetails', 'titleOptions']) {
      expect(request).not.toHaveProperty(field);
    }
  });
});

describe('reading a library, writing a title’s mapping and keeping details', () => {
  it('plans a library once at a time', async () => {
    const planLibrary = vi.fn().mockResolvedValue({ titles: [], issues: [] });
    const context = build({ planLibrary });
    context.activeJobs.set('busy', new AbortController());

    expect(
      await call('workflow:plan-library', { jobId: 'busy', sessionId: 'session' }),
    ).toMatchObject({ ok: false, error: { code: 'job_exists' } });
    expect(await call('workflow:plan-library', { jobId: 'new', sessionId: 'session' })).toEqual({
      ok: true,
      value: { titles: [], issues: [] },
    });
    expect(planLibrary).toHaveBeenCalledExactlyOnceWith('session', expect.any(AbortSignal));
    expect(context.activeJobs.has('new')).toBe(false);
  });

  it('writes a title’s mapping and keeps details with its folder', async () => {
    const writeTitleMapping = vi.fn().mockResolvedValue(undefined);
    const saveDetails = vi.fn().mockResolvedValue(undefined);
    build({ writeTitleMapping, saveDetails });
    const mapping = { mangaTitle: 'Good', chapters: [], volumes: [] };

    expect(
      await call('workflow:write-title-mapping', { sessionId: 'session', title: 'Good', mapping }),
    ).toEqual({ ok: true, value: undefined });
    expect(
      await call('workflow:save-book-details', {
        sessionId: 'session',
        title: 'Good',
        details: { author: 'Someone' },
      }),
    ).toEqual({ ok: true, value: undefined });

    expect(writeTitleMapping).toHaveBeenCalledExactlyOnceWith('session', 'Good', mapping);
    expect(saveDetails).toHaveBeenCalledExactlyOnceWith('session', { author: 'Someone' }, 'Good');
  });
});

describe('cancelling a job', () => {
  it('stops the job that runs, and says so for one that is not', async () => {
    const context = build({});
    const controller = new AbortController();
    context.activeJobs.set('running', controller);

    expect(await call('workflow:cancel', 'running')).toEqual({ ok: true, value: undefined });
    expect(controller.signal.aborted).toBe(true);
    expect(await call('workflow:cancel', 'gone')).toMatchObject({
      ok: false,
      error: { code: 'job_not_found' },
    });
  });
});
