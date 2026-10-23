import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { mappingDraftFromMangabindReport } from '@/adapters/mangabind/mapping-draft';
import { parseMangabindReport } from '@/adapters/mangabind/protocol';
import {
  assignChapters,
  dominantLanguage,
  toMangabindMetadata,
  validateMapping,
} from '@/domain/mapping';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
function protocolFixture(name: string): ReturnType<typeof parseMangabindReport> {
  return parseMangabindReport(
    fs.readFileSync(path.join(repositoryRoot, 'tests', 'fixtures', 'protocol', name), 'utf8'),
  );
}
const report = protocolFixture('mangabind-v1-plan.json');
// Real mangabind 0.4.0 reports, recorded from the pinned binary.
const groupedReport = protocolFixture('mangabind-v1-vol-ch-title.json');
const mixedReport = protocolFixture('mangabind-v1-mixed-grouping.json');
const duplicateReport = protocolFixture('mangabind-v1-duplicate-chapters.json');
// Real mangabind 0.8.0 reports, recorded from the pinned binary: a series kept as one folder for
// each volume, and one kept with the chapters in a folder for each volume, numbered again in each.
const volumeUnitsReport = protocolFixture('mangabind-v1-volume-units.json');
const volumeFoldersReport = protocolFixture('mangabind-v1-volume-folders.json');

describe('mangabind report to mapping draft', () => {
  it('starts from parsed chapters with no volume assignments and no provider', () => {
    const draft = mappingDraftFromMangabindReport(report, { seed: 'empty' });

    expect(draft.mangaTitle).toBe('Mangá São José');
    expect(draft.source).toBeUndefined();
    expect(draft.volumes).toEqual([]);
    expect(draft.chapters).toMatchObject([
      { name: 'Chapter 1', chapter: 1, pageCount: 2 },
      { name: 'Chapter 3', chapter: 3, pageCount: 1 },
    ]);
  });

  it('can seed the exact same draft from effective suggested assignments', () => {
    const draft = mappingDraftFromMangabindReport(report, {
      seed: 'effective-volumes',
      source: { provider: 'external', id: 'api-work-id' },
    });

    expect(draft.source).toEqual({ provider: 'external', id: 'api-work-id' });
    expect(draft.volumes).toMatchObject([
      {
        id: 'effective-volume-1',
        number: '1',
        chapterIds: ['/fixtures/Mangá São José/Chapter 1'],
      },
    ]);
  });

  it('rejects a missing manga selection', () => {
    expect(() =>
      mappingDraftFromMangabindReport(report, { mangaIndex: 99, seed: 'empty' }),
    ).toThrow(RangeError);
  });

  it('preserves parser volume and special fields when present and omits unparsed units', () => {
    const enriched = structuredClone(report);
    const manga = enriched.manga[0]!;
    manga.units.push({
      name: 'Unparsed notes',
      path: '/fixtures/notes',
      kind: 'folder',
      page_count: 0,
      parser: { matched: false },
      metadata_assignment: { status: 'not_applicable' },
      disposition: 'unparsed',
    });
    manga.units.push({
      name: 'Parsed without a number',
      path: '/fixtures/numberless',
      kind: 'folder',
      page_count: 1,
      parser: { matched: true, name: 'future-parser' },
      metadata_assignment: { status: 'not_found' },
      disposition: 'unassigned',
    });
    Object.assign(manga.units[0]!.parser, { special: 'x1', volume: 4 });

    const draft = mappingDraftFromMangabindReport(enriched, { seed: 'effective-volumes' });

    expect(draft.chapters).toHaveLength(3);
    expect(draft.chapters[0]).toMatchObject({ special: 'x1', parsedVolume: 4 });
  });
});

describe('the language the folder names declare', () => {
  it('reaches each chapter, so a lookup can be made in that language', () => {
    const draft = mappingDraftFromMangabindReport(groupedReport, { seed: 'empty' });

    expect(draft.chapters.length).toBeGreaterThan(0);
    expect(draft.chapters.every((chapter) => chapter.language === 'pt-br')).toBe(true);
    expect(dominantLanguage(draft.chapters)).toBe('pt-br');
  });

  it('is left out when the names declare none', () => {
    const draft = mappingDraftFromMangabindReport(report, { seed: 'empty' });

    expect(draft.chapters.some((chapter) => 'language' in chapter)).toBe(false);
    expect(dominantLanguage(draft.chapters)).toBeUndefined();
  });
});

describe('seeding the mapping from mangabind grouping', () => {
  const chapterPath = (name: string): string => `/fixtures/Chainsaw Man/${name}`;

  it('groups a folder whose names carry the volumes, with nothing left to fix', () => {
    const draft = mappingDraftFromMangabindReport(groupedReport, { seed: 'effective-volumes' });

    expect(draft.mangaTitle).toBe('Chainsaw Man');
    expect(draft.volumes).toMatchObject([
      {
        id: 'effective-volume-1',
        number: '1',
        chapterIds: [
          chapterPath(
            'Vol.01 Ch.0001 - Cachorro & Motosserra (pt-br) [Morro dos Scans, Power Scans]',
          ),
          chapterPath('Vol.01 Ch.0002 - O Cachorro Que Foi ao Encontro (pt-br) [Morro dos Scans]'),
        ],
      },
      {
        id: 'effective-volume-2',
        number: '2',
        chapterIds: [
          chapterPath('Vol.02 Ch.0008 - Titulo Qualquer (pt-br) [Morro dos Scans]'),
          chapterPath('Vol.02 Ch.0009 - Outro Titulo (pt-br) [Power Scans]'),
        ],
      },
    ]);
    expect(validateMapping(draft)).toEqual([]);
  });

  it('still starts empty when asked to', () => {
    const draft = mappingDraftFromMangabindReport(groupedReport, { seed: 'empty' });

    expect(draft.volumes).toEqual([]);
    expect(draft.chapters).toHaveLength(4);
  });

  it('leaves a chapter that names no volume unassigned, with only a warning', () => {
    const draft = mappingDraftFromMangabindReport(mixedReport, { seed: 'effective-volumes' });

    expect(draft.volumes.map((volume) => volume.number)).toEqual(['1', '2']);
    expect(draft.chapters).toHaveLength(3);
    expect(validateMapping(draft)).toMatchObject([
      {
        code: 'unassigned_chapters',
        severity: 'warning',
        chapterIds: ['/fixtures/Mixed Manga/Chapter 2'],
      },
    ]);
  });

  it('never seeds a duplicate chapter, which mangabind reports as a conflict and skips', () => {
    const conflicting = duplicateReport.manga[0]!.units.filter(
      (unit) => unit.disposition === 'conflict',
    );
    expect(conflicting).toHaveLength(2);
    expect(conflicting.every((unit) => unit.effective_volume === 1)).toBe(true);

    const draft = mappingDraftFromMangabindReport(duplicateReport, { seed: 'effective-volumes' });

    expect(draft.volumes).toMatchObject([
      {
        number: '1',
        chapterIds: ['/fixtures/Dupes Manga/Vol.01 Ch.0002 - Next (en) [GroupA]'],
      },
    ]);
    expect(draft.chapters).toHaveLength(3);
    expect(validateMapping(draft).filter((issue) => issue.severity === 'error')).toEqual([]);
  });

  it('does not seed a unit mangabind includes but that has no chapter number or a bad suffix', () => {
    const edited = structuredClone(groupedReport);
    const [first, second] = edited.manga[0]!.units;
    delete first!.parser.chapter;
    second!.parser.special = 'not-a-suffix';

    const draft = mappingDraftFromMangabindReport(edited, { seed: 'effective-volumes' });

    expect(draft.chapters).toHaveLength(4);
    expect(draft.volumes).toMatchObject([{ number: '2' }]);
    expect(draft.volumes).toHaveLength(1);
    expect(validateMapping(draft).filter((issue) => issue.severity === 'error')).toEqual([]);
  });

  it('ignores an included unit that has no effective volume or is not a parsed chapter', () => {
    const edited = structuredClone(groupedReport);
    const [first, second] = edited.manga[0]!.units;
    delete first!.effective_volume;
    second!.parser = { matched: false };

    const draft = mappingDraftFromMangabindReport(edited, { seed: 'effective-volumes' });

    expect(draft.chapters).toHaveLength(3);
    expect(draft.volumes).toMatchObject([{ number: '2' }]);
  });

  it('orders volumes numerically however mangabind lists the units', () => {
    const edited = structuredClone(groupedReport);
    edited.manga[0]!.units.reverse();

    const draft = mappingDraftFromMangabindReport(edited, { seed: 'effective-volumes' });

    expect(draft.volumes.map((volume) => volume.number)).toEqual(['1', '2']);
  });
});

describe('a series kept as one folder for each volume (mangabind 0.8.0)', () => {
  const draft = mappingDraftFromMangabindReport(volumeUnitsReport, { seed: 'effective-volumes' });

  it('puts each volume with its own folder, each with the one chapter it has', () => {
    expect(draft.chapters).toMatchObject([
      { chapter: 1, parsedVolume: 1, pageCount: 2 },
      { chapter: 1, parsedVolume: 2, pageCount: 2 },
    ]);
    expect(draft.volumes).toMatchObject([
      { number: '1', chapterIds: [draft.chapters[0]!.id] },
      { number: '2', chapterIds: [draft.chapters[1]!.id] },
    ]);
  });

  it('is a mapping with nothing to fix, though both volumes are chapter 1', () => {
    expect(validateMapping(draft).filter((issue) => issue.severity === 'error')).toEqual([]);
  });

  it('asks the file for nothing, since each folder says its volume', () => {
    expect(toMangabindMetadata(draft).volumes).toEqual([
      { number: '1', chapters: [] },
      { number: '2', chapters: [] },
    ]);
  });
});

describe('a series kept with the chapters in a folder for each volume (mangabind 0.8.0)', () => {
  const draft = mappingDraftFromMangabindReport(volumeFoldersReport, { seed: 'effective-volumes' });
  const idOf = (name: string) => draft.chapters.find((chapter) => chapter.name === name)!.id;

  it('has the volume of the folder as the volume of each chapter, and says the folder in its name', () => {
    // The draft is in the order of the chapter numbers, so the folders alternate; the name says which.
    const byName = [...draft.chapters].sort((left, right) => left.name.localeCompare(right.name));
    expect(byName.map((chapter) => [chapter.name, chapter.chapter, chapter.parsedVolume])).toEqual([
      ['第1巻/第1話', 1, 1],
      ['第1巻/第2話', 2, 1],
      ['第2巻/第1話', 1, 2],
      ['第2巻/第2話', 2, 2],
    ]);
    expect(draft.volumes.map((volume) => [volume.number, volume.chapterIds.length])).toEqual([
      ['1', 2],
      ['2', 2],
    ]);
  });

  it('is a mapping with nothing to fix, though both volumes start again at chapter 1', () => {
    expect(validateMapping(draft).filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(toMangabindMetadata(draft).volumes).toEqual([
      { number: '1', chapters: [] },
      { number: '2', chapters: [] },
    ]);
  });

  it('does not let a chapter be put in another volume than its folder, which mangabind keeps', () => {
    const moved = assignChapters(draft, draft.volumes[1]!.id, [idOf('第1巻/第1話')]);

    const errors = validateMapping(moved).filter((issue) => issue.severity === 'error');
    expect(errors.map((issue) => issue.code)).toEqual(['filename_volume_conflict']);
    expect(errors[0]!.chapterIds).toEqual([idOf('第1巻/第1話')]);
  });

  it('names the folder by the last part of its path whichever separator it was written with', () => {
    const windows = structuredClone(volumeFoldersReport);
    for (const unit of windows.manga[0]!.units) {
      unit.volume_folder = unit
        .volume_folder!.replace('/fixtures/', 'C:\\fixtures\\')
        .replaceAll('/', '\\');
    }

    const names = mappingDraftFromMangabindReport(windows, { seed: 'empty' })
      .chapters.map((chapter) => chapter.name)
      .sort();

    expect(names).toEqual(['第1巻/第1話', '第1巻/第2話', '第2巻/第1話', '第2巻/第2話']);
  });

  it('takes the volume the name says over the folder, when a chapter says one of its own', () => {
    const own = structuredClone(volumeFoldersReport);
    const unit = own.manga[0]!.units[0]!;
    unit.parser.volume = 7;
    unit.effective_volume = 7;

    const chapter = mappingDraftFromMangabindReport(own, { seed: 'empty' }).chapters[0]!;

    expect(chapter.parsedVolume).toBe(7);
  });

  it('has no volume of its own for a chapter in a folder when mangabind reports none', () => {
    const none = structuredClone(volumeFoldersReport);
    delete none.manga[0]!.units[0]!.effective_volume;

    const chapter = mappingDraftFromMangabindReport(none, { seed: 'empty' }).chapters[0]!;

    expect(chapter.parsedVolume).toBeUndefined();
  });
});
