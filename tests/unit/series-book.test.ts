import { describe, expect, it, vi } from 'vitest';

import { buildMangabindArguments } from '@/adapters/mangabind/arguments';
import { MangabindCliAdapter } from '@/adapters/mangabind/cli';
import { chooseVersions, type VersionGroup } from '@/domain/chapter-versions';
import { createMappingDraft } from '@/domain/mapping';
import { withSeriesVolume } from '@/domain/series-book';
import type { ProcessRunner } from '@/application/ports/process-runner';

import { chapters as folderChapters } from './support/series-fixtures';

const six: VersionGroup = {
  token: '6',
  chapter: 6,
  candidates: [
    { id: 'six-a', name: 'a', path: '/m/a.cbz', kind: 'cbz', pageCount: 2 },
    { id: 'six-b', name: 'b', path: '/m/b.cbz', kind: 'cbz', pageCount: 3 },
  ],
};

describe('a series made into one book, with no volumes of its own', () => {
  const draft = (extra: Parameters<typeof createMappingDraft>[0]['volumes'] = []) =>
    createMappingDraft({ mangaTitle: 'Ubunchu!', chapters: folderChapters, volumes: extra });

  it('has one volume made for the run, holding the chapters that a file can name', () => {
    const made = withSeriesVolume(draft());

    expect(made.volumes).toEqual([
      { id: 'whole-series', number: '1', chapterIds: ['one', 'two', 'six-a'] },
    ]);
    // The draft the person has is not changed by it.
    expect(draft().volumes).toEqual([]);
  });

  it('leaves out what a file cannot name: no number, a volume in its own name', () => {
    const made = withSeriesVolume(
      createMappingDraft({
        mangaTitle: 'Mixed',
        chapters: [
          { id: 'ok', name: 'ok', path: '/m/ok', pageCount: 1, chapter: 1 },
          { id: 'extra', name: 'extra', path: '/m/extra', pageCount: 1 },
          {
            id: 'named',
            name: 'named',
            path: '/m/named',
            pageCount: 1,
            chapter: 2,
            parsedVolume: 2,
          },
        ],
      }),
    );

    expect(made.volumes[0]?.chapterIds).toEqual(['ok']);
  });

  it('leaves out the chapter that was chosen to be left out, and keeps one of which a version was', () => {
    const base = createMappingDraft({
      mangaTitle: 'Ubunchu!',
      chapters: folderChapters,
      versions: [six],
    });

    expect(withSeriesVolume(chooseVersions(base, '6', [])).volumes[0]?.chapterIds).toEqual([
      'one',
      'two',
    ]);
    expect(withSeriesVolume(chooseVersions(base, '6', ['six-b'])).volumes[0]?.chapterIds).toEqual([
      'one',
      'two',
      'six-a',
    ]);
  });

  it('is the draft as it is when the series has volumes, or has nothing to put in one', () => {
    const volumes = [{ id: 'v1', number: '1', chapterIds: ['one'] }];
    const has = draft(volumes);
    const bare = createMappingDraft({ mangaTitle: 'None', chapters: [] });

    expect(withSeriesVolume(has)).toBe(has);
    expect(withSeriesVolume(bare)).toBe(bare);
  });
});

describe('a series made into one book with no volumes, asked of the tool', () => {
  const base = { inputPath: '/in', outputPath: '/out', dryRun: false } as const;

  it('is asked as a flag, and only when it is', () => {
    expect(buildMangabindArguments({ ...base, noVolumes: true })).toEqual([
      '--input',
      '/in',
      '--output',
      '/out',
      '--no-volumes',
      '--json',
    ]);
    expect(buildMangabindArguments({ ...base, noVolumes: false })).not.toContain('--no-volumes');
    expect(buildMangabindArguments(base)).not.toContain('--no-volumes');
  });
});

describe('naming the chapters of a volume by their numbers', () => {
  const base = { inputPath: '/in', outputPath: '/out', dryRun: false } as const;

  it('is asked of the tool as a flag with the value', () => {
    expect(buildMangabindArguments({ ...base, chapterLabels: 'number' })).toEqual([
      '--input',
      '/in',
      '--output',
      '/out',
      '--chapter-labels',
      'number',
      '--json',
    ]);
    expect(buildMangabindArguments(base)).not.toContain('--chapter-labels');
  });

  describe('is sent only to a release that knows the flag', () => {
    const runner = (): { runner: ProcessRunner; run: ReturnType<typeof vi.fn> } => {
      const run = vi.fn<ProcessRunner['run']>(() =>
        Promise.resolve({
          stdout: JSON.stringify({
            protocol_version: 1,
            tool: 'mangabind',
            tool_version: '1',
            kind: 'report',
            mode: 'plan',
            status: 'completed',
            batch: false,
            manga: [],
            issues: [],
            summary: { manga: 0, volumes: 0, pages: 0, errors: 0, warnings: 0 },
          }),
          stderr: '',
          exitCode: 0,
          signal: null,
        }),
      );
      return { runner: { run }, run };
    };

    it.each([
      ['knows it', true, true],
      ['does not know it', false, false],
    ])('a release that %s', async (_case, supported, sent) => {
      const { runner: process, run } = runner();

      await new MangabindCliAdapter('mangabind', process, false, supported).run({
        ...base,
        chapterLabels: 'number',
      });

      const given = (run.mock.calls[0]![0] as { arguments: string[] }).arguments;
      expect(given.includes('--chapter-labels')).toBe(sent);
    });
  });
});
