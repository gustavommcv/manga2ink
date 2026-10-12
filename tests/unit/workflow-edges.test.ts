import { describe, expect, it, vi } from 'vitest';

import { ConversionWorkflow } from '@/application/workflows/conversion-workflow';
import type { ConversionProgress } from '@/domain/conversion';
import { defaultMangapressSettings } from '@/domain/output-profile';

import {
  dependencies,
  folder,
  mappedDraft,
  numbered,
  openLibrary,
} from './support/conversion-workflow';

// More of what the mutation run found no test noticing, for how a run is reported and for what a
// library does with a title that did not bind.

function folderWorkflow(ports: ReturnType<typeof dependencies>) {
  let id = 0;
  return new ConversionWorkflow(
    ports.binding,
    ports.conversion,
    () => `id-${String(++id)}`,
    ports.bookFiles,
  );
}

async function runFolder(
  ports: ReturnType<typeof dependencies>,
  overrides: { readonly mode?: 'bind-only' | 'bind-and-convert' } = {},
) {
  const workflow = folderWorkflow(ports);
  const inspected = await workflow.inspect(folder);
  const progress: ConversionProgress[] = [];
  await workflow.convert(
    {
      sessionId: inspected.sessionId,
      libraryPath: '/library',
      settings: defaultMangapressSettings,
      format: 'epub',
      mapping: mappedDraft(),
      ...overrides,
    },
    { onProgress: (update) => progress.push(update) },
  );
  return progress;
}

describe('what a run says when it has made its books', () => {
  it('counts them in the singular for one, and shows nothing of volumes', async () => {
    const progress = await runFolder(dependencies({ volumePaths: ['/work/volume-1.cbz'] }));

    const saved = progress.at(-1);
    expect(saved).toMatchObject({ stage: 'saving', message: '1 book saved.' });
    expect(saved).not.toHaveProperty('completed');
    expect(saved).not.toHaveProperty('total');
    expect(saved).not.toHaveProperty('volumes');
  });

  it('counts them in the plural for several, each volume done', async () => {
    const progress = await runFolder(dependencies());

    expect(progress.at(-1)).toMatchObject({
      stage: 'saving',
      message: '2 books saved.',
      completed: 2,
      total: 2,
      volumes: [
        { number: 1, status: 'done' },
        { number: 2, status: 'done' },
      ],
    });
  });

  it('says only how many when it joined the volumes and made no book of its own', async () => {
    const progress = await runFolder(dependencies(), { mode: 'bind-only' });

    const saved = progress.at(-1);
    expect(saved).toMatchObject({ stage: 'saving', message: '2 books saved.' });
    expect(saved).not.toHaveProperty('volumes');
  });
});

describe('a library whose titles could not all be bound', () => {
  const run = async (
    ports: ReturnType<typeof dependencies>,
    request: { readonly singleBook?: boolean } = {},
  ) => {
    const { workflow, sessionId } = await openLibrary(ports);
    return workflow.convertLibrary(
      {
        sessionId,
        libraryPath: '/output',
        settings: defaultMangapressSettings,
        format: 'epub',
        ...request,
      },
      { onProgress: vi.fn() },
    );
  };

  it('fails a title that bound badly even when it left a combined file, and one with no file', async () => {
    const ports = dependencies();
    ports.bindBatch.mockResolvedValue({
      workspaceId: 'batch',
      titles: [
        {
          title: 'Failed with a file',
          status: 'failed',
          volumes: [],
          combinedOutputPath: '/work/batch/left-over.cbz',
          issues: [],
        },
        { title: 'Completed with no file', status: 'completed', volumes: [], issues: [] },
        {
          title: 'Fine',
          status: 'completed',
          volumes: [],
          combinedOutputPath: '/work/batch/fine.cbz',
          issues: [],
        },
      ],
      issues: [],
    });

    const outcomes = await run(ports, { singleBook: true });

    expect(outcomes.map((outcome) => [outcome.title, outcome.status])).toEqual([
      ['Failed with a file', 'failed'],
      ['Completed with no file', 'failed'],
      ['Fine', 'done'],
    ]);
    expect(ports.convert).toHaveBeenCalledTimes(1);
  });

  it('fails a title with no volumes, and one that failed with some', async () => {
    const ports = dependencies();
    ports.bindBatch.mockResolvedValue({
      workspaceId: 'batch',
      titles: [
        { title: 'Failed', status: 'failed', volumes: numbered(['/work/f.cbz']), issues: [] },
        { title: 'Empty', status: 'completed', volumes: [], issues: [] },
        { title: 'Fine', status: 'completed', volumes: numbered(['/work/ok.cbz']), issues: [] },
      ],
      issues: [],
    });

    const outcomes = await run(ports);

    expect(outcomes.map((outcome) => [outcome.title, outcome.status])).toEqual([
      ['Failed', 'failed'],
      ['Empty', 'failed'],
      ['Fine', 'done'],
    ]);
  });

  it('tells a book of a title bound as one what the joining left out, and no table of contents is nested otherwise', async () => {
    const ports = dependencies();
    ports.bindBatch.mockResolvedValue({
      workspaceId: 'batch',
      titles: [
        {
          title: 'One book',
          status: 'completed',
          volumes: [],
          combinedOutputPath: '/work/batch/one.cbz',
          issues: [
            {
              tool: 'mangabind',
              severity: 'warning',
              code: 'unsupported_page_files',
              stage: 'binding',
              recoverable: true,
              message: 'notes.txt is not a page',
              volume: '2',
            },
          ],
        },
      ],
      issues: [],
    });

    const single = await run(ports, { singleBook: true });

    expect(single[0]?.artifacts[0]?.warnings?.length).toBeGreaterThan(0);
    expect(ports.convert.mock.calls[0]?.[0].nestedToc).toBe(true);

    ports.convert.mockClear();
    ports.bindBatch.mockResolvedValue({
      workspaceId: 'batch',
      titles: [
        { title: 'Volumes', status: 'completed', volumes: numbered(['/work/v1.cbz']), issues: [] },
      ],
      issues: [],
    });

    await run(ports);

    expect(ports.convert.mock.calls[0]?.[0].nestedToc).toBe(false);
  });
});

describe('reading a library again', () => {
  it('leaves out a title that has no chapter in it, as the first reading did', async () => {
    const ports = dependencies();
    const { workflow, sessionId } = await openLibrary(ports);
    const real = (await ports.planBatch.getMockImplementation()?.('/input/Library')) ?? {
      titles: [],
      issues: [],
    };
    ports.planBatch.mockResolvedValueOnce({
      issues: [],
      titles: [
        ...real.titles,
        {
          title: 'Empty folder',
          inputPath: '/input/Library/Empty folder',
          status: 'completed',
          draft: { mangaTitle: 'Empty folder', chapters: [], volumes: [] },
          volumes: [],
          issues: [],
        },
      ],
    });

    const plan = await workflow.planLibrary(sessionId);

    expect(plan.titles.map((title) => title.title)).toEqual(['Good Manga']);
  });
});
