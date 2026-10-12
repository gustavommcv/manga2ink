import { describe, expect, it, vi } from 'vitest';
import { defaultMangapressSettings } from '@/domain/output-profile';

import { dependencies, numbered, openLibrary } from './support/conversion-workflow';

const own = { ...defaultMangapressSettings, webtoon: true, deviceProfile: 'KoC' };

describe('the options a title of a library is made with', () => {
  function twoTitles(ports: ReturnType<typeof dependencies>, combined = false): void {
    ports.bindBatch.mockResolvedValue({
      workspaceId: 'batch-workspace',
      titles: [
        {
          title: 'Good Manga',
          status: 'completed',
          volumes: combined ? [] : numbered(['/work/batch/good-1.cbz', '/work/batch/good-2.cbz']),
          ...(combined ? { combinedOutputPath: '/work/batch/good-combined.cbz' } : {}),
          issues: [],
        },
        {
          title: 'Other Manga',
          status: 'completed',
          volumes: combined ? [] : numbered(['/work/batch/other-1.cbz']),
          ...(combined ? { combinedOutputPath: '/work/batch/other-combined.cbz' } : {}),
          issues: [],
        },
      ],
      issues: [],
    });
  }
  const madeWith = (ports: ReturnType<typeof dependencies>) =>
    ports.convert.mock.calls.map(([request]) => [request.settings, request.format]);

  it('are its own for the title they were set for, and the library’s for every other', async () => {
    const ports = dependencies();
    twoTitles(ports);
    const { workflow, sessionId } = await openLibrary(ports);

    await workflow.convertLibrary(
      {
        sessionId,
        libraryPath: '/output',
        settings: defaultMangapressSettings,
        format: 'cbz',
        titleOptions: [{ title: 'Good Manga', settings: own, format: 'epub' }],
      },
      { onProgress: vi.fn() },
    );

    expect(madeWith(ports)).toEqual([
      [own, 'epub'],
      [own, 'epub'],
      [defaultMangapressSettings, 'cbz'],
    ]);
  });

  it('also apply to the one book of a title made into one', async () => {
    const ports = dependencies();
    twoTitles(ports, true);
    const { workflow, sessionId } = await openLibrary(ports);

    await workflow.convertLibrary(
      {
        sessionId,
        libraryPath: '/output',
        settings: defaultMangapressSettings,
        format: 'epub',
        singleBook: true,
        titleOptions: [{ title: 'Other Manga', settings: own, format: 'epub' }],
      },
      { onProgress: vi.fn() },
    );

    expect(madeWith(ports)).toEqual([
      [defaultMangapressSettings, 'epub'],
      [own, 'epub'],
    ]);
  });

  it('are refused before anything is bound when they cannot be used', async () => {
    const ports = dependencies();
    twoTitles(ports);
    const { workflow, sessionId } = await openLibrary(ports);

    await expect(
      workflow.convertLibrary(
        {
          sessionId,
          libraryPath: '/output',
          settings: defaultMangapressSettings,
          format: 'cbz',
          titleOptions: [
            { title: 'Good Manga', settings: { ...own, deviceProfile: 'OTHER' }, format: 'cbz' },
          ],
        },
        { onProgress: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: 'invalid_settings' });
    expect(ports.bindBatch).not.toHaveBeenCalled();
  });

  it('cannot take a title out of one book per series', async () => {
    const ports = dependencies();
    twoTitles(ports);
    const { workflow, sessionId } = await openLibrary(ports);

    await expect(
      workflow.convertLibrary(
        {
          sessionId,
          libraryPath: '/output',
          settings: defaultMangapressSettings,
          format: 'epub',
          singleBook: true,
          titleOptions: [{ title: 'Good Manga', settings: own, format: 'pdf' }],
        },
        { onProgress: vi.fn() },
      ),
    ).rejects.toMatchObject({ code: 'invalid_settings' });
    expect(ports.bindBatch).not.toHaveBeenCalled();
  });

  it('are not looked at when only joining, since mangapress is not run', async () => {
    const ports = dependencies();
    twoTitles(ports);
    const { workflow, sessionId } = await openLibrary(ports);

    await workflow.convertLibrary(
      {
        sessionId,
        libraryPath: '/output',
        settings: defaultMangapressSettings,
        format: 'cbz',
        mode: 'bind-only',
        titleOptions: [
          { title: 'Good Manga', settings: { ...own, deviceProfile: 'OTHER' }, format: 'cbz' },
        ],
      },
      { onProgress: vi.fn() },
    );

    expect(ports.convert).not.toHaveBeenCalled();
  });
});
