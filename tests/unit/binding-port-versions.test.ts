import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import {
  MangabindBindingAdapter,
  type WorkspaceFileSystem,
} from '@/adapters/mangabind/binding-port';
import type { MangabindCliAdapter, MangabindRunResult } from '@/adapters/mangabind/cli';
import { parseMangabindReport } from '@/adapters/mangabind/protocol';
import { chooseVersions, pendingVersionGroups, versionGroups } from '@/domain/chapter-versions';

const recorded = (name: string): MangabindRunResult['report'] =>
  parseMangabindReport(
    fs.readFileSync(
      path.join(import.meta.dirname, '..', 'fixtures', 'protocol', `mangabind-v1-${name}.json`),
      'utf8',
    ),
  );

// The folder the reports were recorded in: five CBZ files, two of them chapter 3.
const folder = '/fixtures/Folders Series';
const root = path.join(os.tmpdir(), 'tests', 'manga2ink-versions');
const groupA = `${folder}/Ch.0003 - Koala (en) [GroupA].cbz`;
const groupB = `${folder}/Ch.0003 - Koala (en) [GroupB].cbz`;
const kept = (token: string, ...files: string[]): string =>
  JSON.stringify({
    schema_version: 1,
    volumes: [],
    chapter_versions: [{ chapter: token, use: files }],
    manga2ink: {
      versions_seen: {
        [token]: {
          'Ch.0003 - Koala (en) [GroupA].cbz': { size: 20, modified: 100 },
          'Ch.0003 - Koala (en) [GroupB].cbz': { size: 30, modified: 100 },
        },
      },
    },
  });

function fakeFiles(folderFile?: string): WorkspaceFileSystem & {
  readonly writeText: ReturnType<typeof vi.fn<WorkspaceFileSystem['writeText']>>;
  readonly writeTextAtomically: ReturnType<
    typeof vi.fn<WorkspaceFileSystem['writeTextAtomically']>
  >;
  readonly readText: ReturnType<typeof vi.fn<WorkspaceFileSystem['readText']>>;
  readonly fileSignature: ReturnType<typeof vi.fn<WorkspaceFileSystem['fileSignature']>>;
} {
  return {
    createTemporaryDirectory: vi.fn(() => Promise.resolve(root)),
    createDirectory: vi.fn(() => Promise.resolve()),
    writeText: vi.fn(() => Promise.resolve()),
    writeTextAtomically: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve(folderFile)),
    // The files are as they were: a CBZ is its size, and its time to the second.
    fileSignature: vi.fn((file: string) =>
      Promise.resolve({ size: file === groupA ? 20 : 30, modified: 100 }),
    ),
    removeFile: vi.fn(() => Promise.resolve()),
    removeDirectory: vi.fn(() => Promise.resolve()),
  };
}

function adapterOver(report: MangabindRunResult['report'], files: WorkspaceFileSystem) {
  const run = vi.fn<MangabindCliAdapter['run']>(() =>
    Promise.resolve({ report: structuredClone(report), exitCode: 0, stderr: '' }),
  );
  return {
    run,
    adapter: new MangabindBindingAdapter(
      { run },
      files,
      path.join(os.tmpdir(), 'tests'),
      () => 'workspace',
    ),
  };
}

describe('the choice among the versions of a chapter, kept with the folder', () => {
  it('is read back when the same folder is added again, and used as it was made', async () => {
    const files = fakeFiles(kept('3', 'Ch.0003 - Koala (en) [GroupB].cbz'));
    const { adapter } = adapterOver(recorded('chapter-versions-one'), files);

    const { draft } = await adapter.inspect(folder);

    expect(versionGroups(draft)[0]!.use).toEqual([groupB]);
    expect(pendingVersionGroups(draft)).toEqual([]);
    expect(files.readText).toHaveBeenCalledWith(path.join(folder, 'mangabind.json'));
  });

  it('is asked again when a file is new, and the earlier choice is offered with it', async () => {
    // The folder noted only one of the two files: the other came after.
    const noted = JSON.stringify({
      schema_version: 1,
      volumes: [],
      manga2ink: {
        versions_seen: {
          '3': { 'Ch.0003 - Koala (en) [GroupB].cbz': { size: 30, modified: 100 } },
        },
      },
    });
    const { adapter } = adapterOver(recorded('chapter-versions-one'), fakeFiles(noted));

    const { draft } = await adapter.inspect(folder);

    const group = versionGroups(draft)[0]!;
    expect(group.use).toBeUndefined();
    expect(group.remembered).toEqual([groupB]);
    expect(group.candidates.map((candidate) => candidate.attention)).toEqual(['new', undefined]);
  });

  it('is asked again when a file changed since', async () => {
    const files = fakeFiles(kept('3', 'Ch.0003 - Koala (en) [GroupB].cbz'));
    files.fileSignature.mockImplementation((file) =>
      Promise.resolve({ size: file === groupB ? 31 : 20, modified: 100 }),
    );
    const { adapter } = adapterOver(recorded('chapter-versions-one'), files);

    const { draft } = await adapter.inspect(folder);

    expect(versionGroups(draft)[0]!.candidates.map((candidate) => candidate.attention)).toEqual([
      undefined,
      'changed',
    ]);
  });

  it('is taken as the choice of whoever wrote it when the folder’s file cannot be read', async () => {
    const files = fakeFiles();
    files.readText.mockRejectedValue(new Error('denied'));
    const { adapter } = adapterOver(recorded('chapter-versions-one'), files);

    const { draft } = await adapter.inspect(folder);

    expect(versionGroups(draft)[0]!.use).toEqual([groupB]);
  });

  it('is not looked for in a folder whose chapters have no choice to remember', async () => {
    for (const name of ['chapter-versions-unresolved', 'plan']) {
      const files = fakeFiles();
      const { adapter } = adapterOver(recorded(name), files);

      await adapter.inspect(folder);

      expect(files.readText).not.toHaveBeenCalled();
    }
  });

  describe('when the files are made into books', () => {
    async function bound(report: MangabindRunResult['report'], choice: readonly string[]) {
      const files = fakeFiles();
      const { adapter, run } = adapterOver(report, files);
      const { workspaceId, draft } = await adapter.inspect(folder);
      const mapping = chooseVersions(draft, '3', choice);
      return { adapter, files, mapping, run, workspaceId };
    }

    it('tells mangabind the choice in the scratch file, by each file’s path in the folder', async () => {
      const { adapter, files, mapping, workspaceId } = await bound(
        recorded('chapter-versions-conflict'),
        [groupA, groupB],
      );

      await adapter.bind(workspaceId, mapping);

      const scratch = JSON.parse(files.writeText.mock.calls[0]![1]) as {
        chapter_versions: unknown;
      };
      expect(scratch.chapter_versions).toEqual([
        {
          chapter: '3',
          use: ['Ch.0003 - Koala (en) [GroupA].cbz', 'Ch.0003 - Koala (en) [GroupB].cbz'],
        },
      ]);
    });

    it('keeps the choice with the folder, with the files as they were when it was made', async () => {
      const { adapter, files, mapping, workspaceId } = await bound(
        recorded('chapter-versions-conflict'),
        [groupB],
      );

      await adapter.bind(workspaceId, mapping);

      const [written, text] = files.writeTextAtomically.mock.calls[0]!;
      expect(written).toBe(path.join(folder, 'mangabind.json'));
      expect(JSON.parse(text)).toMatchObject({
        chapter_versions: [{ chapter: '3', use: ['Ch.0003 - Koala (en) [GroupB].cbz'] }],
        manga2ink: {
          versions_seen: {
            '3': {
              'Ch.0003 - Koala (en) [GroupA].cbz': { size: 20, modified: 100 },
              'Ch.0003 - Koala (en) [GroupB].cbz': { size: 30, modified: 100 },
            },
          },
        },
      });
    });

    it('does not write the folder again when nothing was chosen anew', async () => {
      const files = fakeFiles(kept('3', 'Ch.0003 - Koala (en) [GroupB].cbz'));
      const { adapter } = adapterOver(recorded('chapter-versions-one'), files);
      const { workspaceId, draft } = await adapter.inspect(folder);

      await adapter.bind(workspaceId, draft);

      expect(files.writeTextAtomically).not.toHaveBeenCalled();
    });

    it('knows a folder of pages by how many it has, since the size of a folder is the system’s', async () => {
      const report = recorded('chapter-versions-conflict');
      for (const unit of report.manga[0]!.units) unit.kind = 'folder';
      const { adapter, files, mapping, workspaceId } = await bound(report, [groupB]);

      await adapter.bind(workspaceId, mapping);

      const seen = (
        JSON.parse(files.writeTextAtomically.mock.calls[0]![1]) as {
          manga2ink: { versions_seen: Record<string, Record<string, unknown>> };
        }
      ).manga2ink.versions_seen['3'];
      expect(seen).toEqual({
        'Ch.0003 - Koala (en) [GroupA].cbz': { size: 2, modified: 100 },
        'Ch.0003 - Koala (en) [GroupB].cbz': { size: 3, modified: 100 },
      });
    });

    it('does not note a file it cannot find', async () => {
      const { adapter, files, mapping, workspaceId } = await bound(
        recorded('chapter-versions-conflict'),
        [groupB],
      );
      files.fileSignature.mockImplementation((file) =>
        Promise.resolve(file === groupA ? undefined : { size: 30, modified: 100 }),
      );

      await adapter.bind(workspaceId, mapping);

      const text = files.writeTextAtomically.mock.calls[0]![1];
      expect(
        Object.keys(
          (JSON.parse(text) as { manga2ink: { versions_seen: { '3': object } } }).manga2ink
            .versions_seen['3'],
        ),
      ).toEqual(['Ch.0003 - Koala (en) [GroupB].cbz']);
    });

    it('plans with the same choice', async () => {
      const report = recorded('chapter-versions-conflict');
      for (const volume of report.manga[0]!.volumes) {
        volume.output_path = path.join(root, 'volumes', path.basename(volume.output_path));
      }
      const { adapter, files, mapping, run, workspaceId } = await bound(report, [groupB]);

      await adapter.plan(workspaceId, mapping);

      const scratch = JSON.parse(files.writeText.mock.calls[0]![1]) as {
        chapter_versions: unknown;
      };
      expect(scratch.chapter_versions).toEqual([
        { chapter: '3', use: ['Ch.0003 - Koala (en) [GroupB].cbz'] },
      ]);
      expect(run).toHaveBeenLastCalledWith(
        expect.objectContaining({
          dryRun: true,
          metadataFilePath: path.join(root, 'mangabind.json'),
        }),
        {},
      );
    });
  });
});

describe('a series made into one book that has no volumes', () => {
  async function opened(name = 'chapter-versions-unresolved') {
    const files = fakeFiles();
    const report = recorded(name);
    for (const volume of report.manga[0]!.volumes) {
      volume.output_path = path.join(root, 'volumes', path.basename(volume.output_path));
    }
    report.manga[0]!.combined_output_path = path.join(root, 'volumes', 'Folders Series.cbz');
    const { adapter, run } = adapterOver(report, files);
    const { workspaceId, draft } = await adapter.inspect(folder);
    return { adapter, draft, files, run, workspaceId };
  }

  const scratchOf = (files: ReturnType<typeof fakeFiles>) =>
    JSON.parse(files.writeText.mock.calls[0]![1]) as {
      volumes: { number: string; chapters: string[] }[];
    };

  it('is told to the tool as one volume, and the folder is not told of a volume nobody made', async () => {
    const { adapter, draft, files, workspaceId } = await opened();
    const mapping = chooseVersions(draft, '3', [groupB]);

    await adapter.bind(workspaceId, mapping, undefined, true, undefined, { wholeSeries: true });

    expect(scratchOf(files).volumes).toEqual([{ number: '1', chapters: ['1', '2', '3', '4'] }]);
    // What is kept with the folder is the person's own: the choice, and no volume.
    expect(JSON.parse(files.writeTextAtomically.mock.calls[0]![1])).toMatchObject({
      volumes: [],
      chapter_versions: [{ chapter: '3', use: ['Ch.0003 - Koala (en) [GroupB].cbz'] }],
    });
  });

  it('is planned the same way', async () => {
    const { adapter, draft, files, workspaceId } = await opened();
    const mapping = chooseVersions(draft, '3', [groupB]);

    await adapter.plan(workspaceId, mapping, undefined, { wholeSeries: true });

    expect(scratchOf(files).volumes).toEqual([{ number: '1', chapters: ['1', '2', '3', '4'] }]);
  });

  it('is left to the volumes the person made, where there are any', async () => {
    const { adapter, draft, files, workspaceId } = await opened('chapter-versions-conflict');
    const mapping = chooseVersions(draft, '3', [groupB]);

    await adapter.bind(workspaceId, mapping, undefined, true, undefined, { wholeSeries: true });

    expect(scratchOf(files).volumes).toEqual([{ number: '1', chapters: ['1', '2', '3', '4'] }]);
    expect(mapping.volumes).toHaveLength(1);
  });

  it('asks for the chapters to be named by their numbers, in the plan and in the run, and not in the first look', async () => {
    const { adapter, draft, run, workspaceId } = await opened();
    const mapping = chooseVersions(draft, '3', [groupB]);

    await adapter.plan(workspaceId, mapping);
    await adapter.bind(workspaceId, mapping);

    expect(run.mock.calls[0]![0]).not.toHaveProperty('chapterLabels');
    expect(run.mock.calls[1]![0]).toMatchObject({ dryRun: true, chapterLabels: 'number' });
    expect(run.mock.calls[2]![0]).toMatchObject({ dryRun: false, chapterLabels: 'number' });
  });

  it('plans with the chapters as the book will name them, and the files set aside', async () => {
    const { adapter, draft, workspaceId } = await opened('chapter-versions-one');

    const plan = await adapter.plan(workspaceId, draft);

    expect(plan.volumes[0]?.chapters?.map((chapter) => chapter.label)).toEqual([
      'Ch.1',
      'Ch.2',
      'Ch.3 - Koala',
      'Ch.4',
    ]);
    expect(plan.volumes[0]?.chapters?.[2]).toEqual({ label: 'Ch.3 - Koala', pageCount: 3 });
    expect(plan.leftOut).toEqual(['Ch.0003 - Koala (en) [GroupA]']);
  });

  it('plans with what the tool tells, which is no chapters and nothing set aside for a tool that tells none', async () => {
    const { adapter, draft, workspaceId } = await opened('chapter-versions-conflict');

    const plan = await adapter.plan(workspaceId, draft);

    expect(plan.leftOut).toBeUndefined();
    expect(plan.volumes[0]?.chapters).toBeDefined();
    const old = await opened('plan');
    const older = await old.adapter.plan(old.workspaceId, old.draft);
    expect(older.volumes.every((volume) => volume.chapters === undefined)).toBe(true);
  });
});
