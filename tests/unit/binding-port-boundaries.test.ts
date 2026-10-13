import fs from 'node:fs';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  MangabindBindingAdapter,
  workspaceFileSystem,
  type WorkspaceFileSystem,
} from '@/adapters/mangabind/binding-port';
import type { MangabindCliAdapter, MangabindRunResult } from '@/adapters/mangabind/cli';
import { parseMangabindReport } from '@/adapters/mangabind/protocol';
import { createMappingDraft } from '@/domain/mapping';

const fixture = parseMangabindReport(
  fs.readFileSync(
    path.join(import.meta.dirname, '..', 'fixtures', 'protocol', 'mangabind-v1-plan.json'),
    'utf8',
  ),
);

/** A report with nothing written, so that no path of it has to lie inside a workspace. */
const quietReport = (): MangabindRunResult['report'] => {
  const report = structuredClone(fixture);
  report.status = 'completed';
  for (const manga of report.manga) manga.volumes = [];
  return report;
};
const ranWith = (
  overrides: { readonly report?: MangabindRunResult['report']; readonly exitCode?: number } = {},
): MangabindRunResult => ({
  report: overrides.report ?? quietReport(),
  exitCode: overrides.exitCode ?? 0,
  stderr: '',
});

const files = (): WorkspaceFileSystem => ({
  createTemporaryDirectory: () => Promise.resolve(path.join(os.tmpdir(), 'mangabound-boundaries')),
  createDirectory: () => Promise.resolve(),
  writeText: () => Promise.resolve(),
  writeTextAtomically: () => Promise.resolve(),
  readText: () => Promise.resolve(undefined),
  removeFile: () => Promise.resolve(),
  removeDirectory: () => Promise.resolve(),
});

const mapping = () =>
  createMappingDraft({
    mangaTitle: 'Boundary Work',
    chapters: [{ id: 'c1', name: 'Chapter 1', path: '/trusted/1', pageCount: 2, chapter: 1 }],
    volumes: [{ id: 'v1', number: '1', chapterIds: ['c1'] }],
  });

function adapterOver(run: MangabindCliAdapter['run']): {
  readonly adapter: MangabindBindingAdapter;
  readonly run: ReturnType<typeof vi.fn<MangabindCliAdapter['run']>>;
} {
  const spy = vi.fn<MangabindCliAdapter['run']>(run);
  return {
    adapter: new MangabindBindingAdapter({ run: spy }, files(), os.tmpdir(), () => 'workspace'),
    run: spy,
  };
}
const quiet = (): MangabindCliAdapter['run'] => () => Promise.resolve(ranWith());

/** What the last run of the tool was started with. */
const lastRun = (run: { mock: { lastCall?: Parameters<MangabindCliAdapter['run']> } }) => {
  const [request, options] = run.mock.lastCall ?? [];
  if (request === undefined) throw new Error('The tool was never run');
  return { request, options: options ?? {} };
};

const progress = {
  protocol_version: 1,
  tool: 'mangabind',
  tool_version: 'test',
  kind: 'progress',
  stage: 'write',
  state: 'advanced',
  manga: 'Boundary Work',
  volume_index: 1,
  volume_count: 2,
  volume_number: 1,
  completed_pages: 4,
  total_pages: 9,
} as const;

describe('stopping a run of mangabind', () => {
  type Starter = (adapter: MangabindBindingAdapter, signal?: AbortSignal) => Promise<unknown>;
  const starters: readonly (readonly [string, Starter])[] = [
    ['inspecting a folder', (adapter, signal) => adapter.inspect('/input', signal)],
    [
      'planning a folder',
      async (adapter, signal) => {
        const { workspaceId } = await adapter.inspect('/input');
        return adapter.plan(workspaceId, mapping(), signal);
      },
    ],
    [
      'binding a folder',
      async (adapter, signal) => {
        const { workspaceId } = await adapter.inspect('/input');
        return adapter.bind(workspaceId, mapping(), signal);
      },
    ],
    ['planning a library', (adapter, signal) => adapter.planBatch('/library', signal)],
    ['binding a library', (adapter, signal) => adapter.bindBatch('/library', signal)],
    [
      'binding some titles of a library',
      (adapter, signal) => adapter.bindTitles('/library', ['/library/A'], signal),
    ],
  ];

  it.each(starters)('reaches the tool when %s, so that cancelling stops it', async (_, start) => {
    const { adapter, run } = adapterOver(quiet());
    const controller = new AbortController();

    await start(adapter, controller.signal);

    expect(lastRun(run).options.signal).toBe(controller.signal);
  });

  it.each(starters)('has nothing to hand the tool when %s without one', async (_, start) => {
    const { adapter, run } = adapterOver(quiet());

    await start(adapter);

    expect(lastRun(run).options).not.toHaveProperty('signal');
  });
});

describe('progress of a run of mangabind', () => {
  it('is handed on as the page counts it, for a folder, a library and some titles', async () => {
    const received: unknown[] = [];
    const { adapter, run } = adapterOver((_, options) => {
      options?.onProgress?.(progress);
      return Promise.resolve(ranWith());
    });

    const { workspaceId } = await adapter.inspect('/input');
    await adapter.bind(workspaceId, mapping(), undefined, false, (event) => received.push(event));
    await adapter.bindBatch('/library', undefined, false, (event) => received.push(event));
    await adapter.bindTitles('/library', ['/library/A'], undefined, false, (event) =>
      received.push(event),
    );

    const counted = {
      stage: 'write',
      state: 'advanced',
      manga: 'Boundary Work',
      volumeIndex: 1,
      volumeCount: 2,
      completedPages: 4,
      totalPages: 9,
    };
    expect(received).toEqual([counted, counted, counted]);
    expect(run).toHaveBeenCalledTimes(4);
  });

  it('gives the tool no way to report it when nobody listens', async () => {
    const { adapter, run } = adapterOver(quiet());

    const { workspaceId } = await adapter.inspect('/input');
    await adapter.bind(workspaceId, mapping());
    expect(lastRun(run).options).not.toHaveProperty('onProgress');
    await adapter.bindBatch('/library');
    expect(lastRun(run).options).not.toHaveProperty('onProgress');
    await adapter.bindTitles('/library', ['/library/A']);
    expect(lastRun(run).options).not.toHaveProperty('onProgress');
  });
});

describe('a run of mangabind that did not succeed', () => {
  /** A report that says it failed, and the exit code the tool had. */
  const failure = (exitCode: number): MangabindRunResult => {
    const report = quietReport();
    report.status = 'failed';
    report.issues = [
      {
        tool: 'mangabind',
        severity: 'error',
        code: 'output_write_failed',
        stage: 'write',
        recoverable: false,
        message: 'The volume could not be written.',
      },
    ];
    return ranWith({ report, exitCode });
  };
  /** A folder that was read well, and then a run that fails: reading comes first, so it can bind. */
  const readThenFail = async (
    exitCode: number,
  ): Promise<{ adapter: MangabindBindingAdapter; workspaceId: string }> => {
    let runs = 0;
    const { adapter } = adapterOver(() =>
      Promise.resolve(++runs === 1 ? ranWith() : failure(exitCode)),
    );
    const { workspaceId } = await adapter.inspect('/input');
    return { adapter, workspaceId };
  };

  it('is no bound volume: binding throws what the tool reported', async () => {
    const { adapter, workspaceId } = await readThenFail(1);

    await expect(adapter.bind(workspaceId, mapping())).rejects.toMatchObject({
      exitCode: 1,
      issue: { code: 'output_write_failed', message: 'The volume could not be written.' },
    });
  });

  it('is no plan: planning throws what the tool reported', async () => {
    const { adapter, workspaceId } = await readThenFail(1);

    await expect(adapter.plan(workspaceId, mapping())).rejects.toMatchObject({
      exitCode: 1,
      issue: { code: 'output_write_failed' },
    });
  });

  it.each(['binding', 'planning'] as const)(
    'is no success for %s when the tool exited cleanly and its report says it failed',
    async (what) => {
      const { adapter, workspaceId } = await readThenFail(0);

      const attempt =
        what === 'binding'
          ? adapter.bind(workspaceId, mapping())
          : adapter.plan(workspaceId, mapping());

      await expect(attempt).rejects.toMatchObject({ exitCode: 0 });
    },
  );
});

describe('the workspace on disk', () => {
  const directories: string[] = [];
  afterEach(() => {
    for (const directory of directories.splice(0)) {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
  const scratch = async (): Promise<string> => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'mangabound-workspace-fs-'));
    directories.push(directory);
    return directory;
  };

  it('makes a folder of several levels at once, and again without complaint', async () => {
    const root = await scratch();
    const nested = path.join(root, 'volumes', 'one', 'two');

    await workspaceFileSystem.createDirectory(nested);
    await workspaceFileSystem.createDirectory(nested);

    expect(fs.statSync(nested).isDirectory()).toBe(true);
  });

  it('writes text as UTF-8, and gives back what it wrote, and nothing for a file that is not there', async () => {
    const root = await scratch();
    const file = path.join(root, 'mangabind.json');

    await workspaceFileSystem.writeText(file, '{"título":"São José"}');

    expect((await readFile(file)).equals(Buffer.from('{"título":"São José"}', 'utf8'))).toBe(true);
    expect(await workspaceFileSystem.readText(file)).toBe('{"título":"São José"}');
    expect(await workspaceFileSystem.readText(path.join(root, 'missing.json'))).toBeUndefined();
  });

  it('does not hide a file it cannot read for another reason than there being none', async () => {
    const root = await scratch();

    // A folder is not a file: this is not "no such file", and must not look like it.
    await expect(workspaceFileSystem.readText(root)).rejects.toMatchObject({ code: 'EISDIR' });
  });

  it('takes away a file, and does nothing for one that is not there', async () => {
    const root = await scratch();
    const file = path.join(root, 'gone.txt');
    await writeFile(file, 'x');

    await workspaceFileSystem.removeFile(file);
    await workspaceFileSystem.removeFile(file);

    expect(fs.existsSync(file)).toBe(false);
  });

  it('takes away a folder with everything in it, and does nothing for one that is not there', async () => {
    const root = await scratch();
    const folder = path.join(root, 'volumes');
    await workspaceFileSystem.createDirectory(path.join(folder, 'deep'));
    await writeFile(path.join(folder, 'deep', 'v1.cbz'), 'x');

    await workspaceFileSystem.removeDirectory(folder);
    await workspaceFileSystem.removeDirectory(folder);

    expect(fs.existsSync(folder)).toBe(false);
  });
});
