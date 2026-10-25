import { describe, expect, it, vi } from 'vitest';

import { ConversionWorkflow } from '@/application/workflows/conversion-workflow';
import type { VersionGroup } from '@/domain/chapter-versions';
import { createMappingDraft } from '@/domain/mapping';
import { message } from '@/domain/message';
import { defaultMangaprepSettings } from '@/domain/output-profile';

import { dependencies, folder } from './support/conversion-workflow';

// A folder of chapters 1 and 2 where chapter 2 comes in two files.
const versions: readonly VersionGroup[] = [
  {
    token: '2',
    chapter: 2,
    candidates: [
      { id: 'c2', name: 'c2', path: '/trusted/c2', kind: 'cbz', pageCount: 3 },
      { id: 'c2-b', name: 'c2-b', path: '/trusted/c2-b', kind: 'cbz', pageCount: 4 },
    ],
  },
];
const chapters = [
  { id: 'c1', name: 'Chapter 1', path: '/trusted/c1', pageCount: 2, chapter: 1 },
  { id: 'c2', name: 'Chapter 2', path: '/trusted/c2', pageCount: 3, chapter: 2 },
] as const;
const withVersions = createMappingDraft({ mangaTitle: 'Trusted Manga', chapters, versions });

function setup() {
  const ports = dependencies();
  ports.inspect.mockResolvedValue({
    workspaceId: 'workspace-1',
    draft: withVersions,
    issues: [],
  });
  let id = 0;
  const workflow = new ConversionWorkflow(
    ports.binding,
    ports.conversion,
    () => `id-${String(++id)}`,
    ports.bookFiles,
  );
  const request = async (submitted: ReturnType<typeof createMappingDraft>) => ({
    sessionId: (await workflow.inspect(folder)).sessionId,
    libraryPath: '/library',
    settings: defaultMangaprepSettings,
    format: 'epub' as const,
    mapping: submitted,
  });
  return { ports, request, workflow };
}

const placed = (use?: readonly string[]) =>
  createMappingDraft({
    mangaTitle: 'Trusted Manga',
    chapters,
    volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
    versions: [{ ...versions[0]!, ...(use === undefined ? {} : { use }) }],
  });

describe('a run, when a chapter comes in more than one file', () => {
  it('waits for a person to say which to use, for both convert and plan', async () => {
    const { ports, request, workflow } = setup();
    const pending = await request(placed());

    await expect(workflow.convert(pending, { onProgress: vi.fn() })).rejects.toMatchObject({
      code: 'versions_pending',
      said: message('workflow.versionsPending', { count: 1 }),
    });
    await expect(workflow.plan(pending)).rejects.toMatchObject({ code: 'versions_pending' });
    expect(ports.bind).not.toHaveBeenCalled();
    expect(ports.bindingPlan).not.toHaveBeenCalled();
  });

  it('goes on with the choice the page submitted, handing the files to the tool as the app read them', async () => {
    const { ports, request, workflow } = setup();

    await workflow.convert(await request(placed(['c2-b'])), { onProgress: vi.fn() });

    const mapping = ports.bind.mock.calls[0]![1];
    expect(mapping.versions).toEqual([{ ...versions[0], use: ['c2-b'] }]);
  });

  it('plans with the same choice', async () => {
    const { ports, request, workflow } = setup();

    await workflow.plan(await request(placed(['c2', 'c2-b'])));

    expect(ports.bindingPlan.mock.calls[0]![1].versions?.[0]?.use).toEqual(['c2', 'c2-b']);
  });

  it('refuses a choice that names a file the chapter does not have', async () => {
    const { request, workflow } = setup();

    await expect(
      workflow.convert(await request(placed(['/etc/passwd'])), { onProgress: vi.fn() }),
    ).rejects.toMatchObject({ code: 'invalid_mapping' });
  });

  it('has nothing to wait for in a folder with no such chapter', async () => {
    const ports = dependencies();
    let id = 0;
    const workflow = new ConversionWorkflow(
      ports.binding,
      ports.conversion,
      () => `id-${String(++id)}`,
      ports.bookFiles,
    );
    const inspected = await workflow.inspect(folder);

    await expect(
      workflow.plan({
        sessionId: inspected.sessionId,
        libraryPath: '/library',
        settings: defaultMangaprepSettings,
        format: 'epub',
        mapping: createMappingDraft({
          mangaTitle: 'Trusted Manga',
          chapters,
          volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
        }),
      }),
    ).resolves.toMatchObject({ tool: 'mangabind' });
  });
});
