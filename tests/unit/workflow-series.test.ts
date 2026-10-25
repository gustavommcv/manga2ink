import { describe, expect, it, vi } from 'vitest';

import { ConversionWorkflow } from '@/application/workflows/conversion-workflow';
import { createMappingDraft } from '@/domain/mapping';
import { message } from '@/domain/message';
import { defaultMangaprepSettings } from '@/domain/output-profile';

import { dependencies, folder, trustedDraft } from './support/conversion-workflow';

// A series that has no volumes: nothing in the names says one, and the person made none.
const noVolumes = createMappingDraft({
  mangaTitle: trustedDraft.mangaTitle,
  chapters: trustedDraft.chapters,
});
const withVolumes = createMappingDraft({
  mangaTitle: trustedDraft.mangaTitle,
  chapters: trustedDraft.chapters,
  volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
});

function setup(options: Parameters<typeof dependencies>[0] = {}) {
  const ports = dependencies(options);
  let id = 0;
  const workflow = new ConversionWorkflow(
    ports.binding,
    ports.conversion,
    () => `id-${String(++id)}`,
    ports.bookFiles,
  );
  const request = async (mapping: typeof noVolumes, details?: { title: string }) => ({
    sessionId: (await workflow.inspect(folder)).sessionId,
    libraryPath: '/library',
    settings: defaultMangaprepSettings,
    format: 'epub' as const,
    singleBook: true,
    mapping,
    ...(details === undefined ? {} : { details }),
  });
  return { ports, request, workflow };
}

describe('a series made into one book that has no volumes', () => {
  it('is bound as one, told to the tool as the whole series, and made into a book without a level for volumes', async () => {
    const { ports, request, workflow } = setup();

    const artifacts = await workflow.convert(await request(noVolumes), { onProgress: vi.fn() });

    expect(ports.bind).toHaveBeenCalledWith(
      'workspace-1',
      expect.objectContaining({ volumes: [] }),
      undefined,
      true,
      expect.any(Function),
      { wholeSeries: true },
    );
    expect(artifacts).toHaveLength(1);
    expect(ports.convert).toHaveBeenCalledTimes(1);
    expect(ports.convert.mock.calls[0]?.[0]).toMatchObject({
      inputPath: '/work/combined.cbz',
      nestedToc: false,
    });
  });

  it('takes the one book the tool made with no volumes, which is not a combined file', async () => {
    const { ports, request, workflow } = setup();
    ports.bind.mockResolvedValue({
      volumes: [{ number: 1, path: '/work/volumes/Trusted Manga.cbz' }],
      issues: [],
    });

    await workflow.convert(await request(noVolumes), { onProgress: vi.fn() });

    expect(ports.convert.mock.calls[0]?.[0]).toMatchObject({
      inputPath: '/work/volumes/Trusted Manga.cbz',
      nestedToc: false,
    });
  });

  it('has nothing to bind when the tool made no book', async () => {
    const { ports, request, workflow } = setup();
    ports.bind.mockResolvedValue({ volumes: [], issues: [] });

    await expect(
      workflow.convert(await request(noVolumes), { onProgress: vi.fn() }),
    ).rejects.toMatchObject({ code: 'no_volumes' });
  });

  it('has the level for volumes in its table of contents where the series has volumes', async () => {
    const { ports, request, workflow } = setup();

    await workflow.convert(await request(withVolumes), { onProgress: vi.fn() });

    expect(ports.convert.mock.calls[0]?.[0]).toMatchObject({ nestedToc: true });
  });

  it('has nothing to bind when no chapter can be placed, and says so before anything is made', async () => {
    const { ports, request, workflow } = setup();
    ports.inspect.mockResolvedValue({
      workspaceId: 'workspace-1',
      draft: createMappingDraft({
        mangaTitle: 'Odd',
        chapters: [{ id: 'x', name: 'Afterword', path: '/m/x', pageCount: 1 }],
      }),
      issues: [],
    });
    const odd = createMappingDraft({
      mangaTitle: 'Odd',
      chapters: [{ id: 'x', name: 'Afterword', path: '/m/x', pageCount: 1 }],
    });

    await expect(
      workflow.convert(await request(odd), { onProgress: vi.fn() }),
    ).rejects.toMatchObject({ code: 'no_volumes' });
    await expect(workflow.plan(await request(odd))).rejects.toMatchObject({ code: 'no_volumes' });
    expect(ports.bind).not.toHaveBeenCalled();
  });

  describe('is planned before it is made', () => {
    const planned = {
      title: 'Trusted Manga',
      volumes: [
        {
          name: 'Trusted Manga.cbz',
          pageCount: 5,
          number: 1,
          chapters: [
            { label: 'Ch.1 - One', pageCount: 2 },
            { label: 'Ch.2 - Two (version 1 of 2)', pageCount: 2 },
            { label: 'Ch.2 - Two (version 2 of 2)', pageCount: 1 },
          ],
        },
      ],
      issues: [],
      leftOut: ['Ch.0003 [B]'],
    };

    it('as one book with its file, its chapters, and the files left out', async () => {
      const { ports, request, workflow } = setup();
      ports.bindingPlan.mockResolvedValue(planned);

      const plan = await workflow.plan(await request(noVolumes));

      expect(plan.message).toEqual(message('plan.series', { volumes: 0, chapters: 3 }));
      expect(plan.books).toEqual([
        {
          name: 'Trusted Manga',
          pageCount: 5,
          wholeSeries: true,
          file: 'Trusted Manga.epub',
          chapters: planned.volumes[0]!.chapters,
        },
      ]);
      expect(plan.leftOut).toEqual(['Ch.0003 [B]']);
      expect(ports.bindingPlan).toHaveBeenCalledWith('workspace-1', expect.anything(), undefined, {
        wholeSeries: true,
      });
    });

    it('with the file named for the title that was typed, and the volumes that were made', async () => {
      const { ports, request, workflow } = setup();
      ports.bindingPlan.mockResolvedValue(planned);

      const plan = await workflow.plan(await request(withVolumes, { title: 'Ubunchu!' }));

      expect(plan.message).toEqual(message('plan.series', { volumes: 1, chapters: 3 }));
      expect(plan.books[0]).toMatchObject({ file: 'Ubunchu!.epub' });
    });

    it('as books of volumes, each with its chapters, when the books are one for each volume', async () => {
      const { ports, request, workflow } = setup();
      ports.bindingPlan.mockResolvedValue(planned);

      const plan = await workflow.plan({ ...(await request(withVolumes)), singleBook: false });

      expect(plan.message).toEqual(message('plan.mangabind', { volumes: 1, shape: 'books' }));
      expect(plan.books).toEqual([
        {
          name: 'Trusted Manga.epub',
          pageCount: 5,
          chapters: planned.volumes[0]!.chapters,
        },
      ]);
    });

    it('says only what the tool tells: no chapters, nothing left out', async () => {
      const { ports, request, workflow } = setup();
      ports.bindingPlan.mockResolvedValue({
        title: 'Trusted Manga',
        volumes: [{ name: 'Trusted Manga.cbz', pageCount: 5 }],
        issues: [],
      });

      const plan = await workflow.plan(await request(noVolumes));

      expect(plan.message).toEqual(message('plan.series', { volumes: 0, chapters: 0 }));
      expect(plan.books[0]).not.toHaveProperty('chapters');
      expect(plan).not.toHaveProperty('leftOut');
    });
  });
});
