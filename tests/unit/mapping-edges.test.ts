import { describe, expect, it } from 'vitest';

import {
  addVolume,
  assignChapterRange,
  assignChapters,
  createMappingDraft,
  isMappableChapter,
  isVolumeNumber,
  type MappingChapter,
  type MappingDraft,
  MappingOperationError,
  mappingSignature,
  mergeVolumes,
  renumberVolume,
  serializeMangabindMetadata,
  splitVolume,
  validateMapping,
} from '@/domain/mapping';

// The cases the mutation run found nothing noticing: each is a way the mapping could be wrong
// while every test that existed still passed.

const chapter = (
  id: string,
  number?: number,
  extra: Partial<MappingChapter> = {},
): MappingChapter => ({
  id,
  name: `Chapter ${id}`,
  path: `/m/${id}`,
  pageCount: 2,
  ...(number === undefined ? {} : { chapter: number }),
  ...extra,
});

const five = [
  chapter('c1', 1),
  chapter('c2', 2),
  chapter('c3', 3),
  chapter('c4', 4),
  chapter('c5', 5),
];

function threeVolumes(): MappingDraft {
  let draft = createMappingDraft({ chapters: five, mangaTitle: 'Manga' });
  draft = addVolume(draft, 'v1', '1');
  draft = addVolume(draft, 'v2', '2');
  draft = addVolume(draft, 'v3', '3');
  draft = assignChapters(draft, 'v1', ['c1']);
  draft = assignChapters(draft, 'v2', ['c2', 'c3']);
  return assignChapters(draft, 'v3', ['c4']);
}

describe('a volume number', () => {
  it('may have any number of digits after the point, and only one point', () => {
    for (const accepted of ['1.5', '1.25', '10.125', '0.5']) {
      expect(isVolumeNumber(accepted)).toBe(true);
    }
    for (const refused of ['1.2.3', '1.', '.5', '1,5', '-1', '1e2', 'one', '']) {
      expect(isVolumeNumber(refused)).toBe(false);
    }
    const draft = addVolume(createMappingDraft({ chapters: five, mangaTitle: 'M' }), 'v', '1.25');
    expect(draft.volumes[0]?.number).toBe('1.25');
  });
});

describe('a special chapter', () => {
  it('is one with a letter x, y or z and a number after it, and nothing else', () => {
    for (const special of ['x1', 'y2', 'z10', 'x01']) {
      expect(isMappableChapter(chapter('c', 1, { special }))).toBe(true);
    }
    for (const special of ['x', 'x1a', 'ax1', 'xx1', 'X1', 'extra', '1x', 'x 1', '']) {
      expect(isMappableChapter(chapter('c', 1, { special }))).toBe(false);
    }
  });

  it('is a chapter with a number, that is not negative, not infinite and not missing', () => {
    expect(isMappableChapter(chapter('c', 0))).toBe(true);
    expect(isMappableChapter(chapter('c', 12.5))).toBe(true);
    expect(isMappableChapter(chapter('c'))).toBe(false);
    expect(isMappableChapter(chapter('c', -1))).toBe(false);
    expect(isMappableChapter(chapter('c', Number.POSITIVE_INFINITY))).toBe(false);
    expect(isMappableChapter(chapter('c', Number.NaN))).toBe(false);
  });
});

describe('the order a folder’s chapters are shown in', () => {
  it('is by number, a plain chapter before its specials, and the ones with no number last', () => {
    const draft = createMappingDraft({
      mangaTitle: 'M',
      chapters: [
        chapter('later', 6),
        chapter('five-y', 5, { special: 'y1' }),
        chapter('no-number'),
        chapter('five', 5),
        chapter('five-x', 5, { special: 'x1' }),
      ],
    });

    expect(draft.chapters.map((entry) => entry.id)).toEqual([
      'five',
      'five-x',
      'five-y',
      'later',
      'no-number',
    ]);
  });
});

describe('what a mapping says it is', () => {
  const base = threeVolumes();

  it('is the same however the chapters of a volume are listed, and whatever the volumes are called inside', () => {
    const reordered: MappingDraft = {
      ...base,
      volumes: base.volumes.map((volume) =>
        volume.id === 'v2'
          ? { ...volume, id: 'another-id', chapterIds: [...volume.chapterIds].reverse() }
          : volume,
      ),
    };

    expect(mappingSignature(reordered)).toBe(mappingSignature(base));
  });

  it('is not the same for another source, number or title', () => {
    const withSource: MappingDraft = { ...base, source: { provider: 'mangadex', id: 'work' } };
    const otherSource: MappingDraft = { ...base, source: { provider: 'mangadex', id: 'another' } };
    expect(mappingSignature(withSource)).not.toBe(mappingSignature(base));
    expect(mappingSignature(withSource)).not.toBe(mappingSignature(otherSource));
    expect(mappingSignature(renumberVolume(base, 'v1', '9'))).not.toBe(mappingSignature(base));
    expect(mappingSignature({ ...base, mangaTitle: 'Another' })).not.toBe(mappingSignature(base));
  });
});

describe('changing one volume among several', () => {
  it('renumbers only that one', () => {
    const draft = renumberVolume(threeVolumes(), 'v2', '20');

    expect(draft.volumes.map((volume) => volume.number)).toEqual(['1', '20', '3']);
  });

  it('merges only the two it is told, and leaves the rest as they were', () => {
    const draft = mergeVolumes(threeVolumes(), 'v1', 'v3');

    expect(draft.volumes.map((volume) => [volume.id, volume.chapterIds])).toEqual([
      ['v1', ['c1', 'c4']],
      ['v2', ['c2', 'c3']],
    ]);
  });

  it('refuses to split with the name of another volume, not only its own', () => {
    expect(() => splitVolume(threeVolumes(), 'v2', 'c3', 'v3', '4')).toThrow(
      expect.objectContaining({ code: 'duplicate_volume_id' }),
    );
    const split = splitVolume(threeVolumes(), 'v2', 'c3', 'v4', '2.5');
    expect(split.volumes.map((volume) => volume.id)).toEqual(['v1', 'v2', 'v4', 'v3']);
  });

  it('refuses a range that starts or ends at a chapter that is not there', () => {
    const draft = threeVolumes();

    for (const [from, to] of [
      ['nowhere', 'c3'],
      ['c1', 'nowhere'],
    ] as const) {
      expect(() => assignChapterRange(draft, 'v1', from, to)).toThrow(MappingOperationError);
      try {
        assignChapterRange(draft, 'v1', from, to);
      } catch (error) {
        expect(error).toMatchObject({ code: 'chapter_not_found' });
      }
    }
    // Either way round, a range is the chapters between them.
    expect(
      assignChapterRange(draft, 'v1', 'c5', 'c4').volumes.find((volume) => volume.id === 'v1')
        ?.chapterIds,
    ).toEqual(['c1', 'c4', 'c5']);
  });
});

describe('a draft with no source', () => {
  it('has none, rather than one that is empty', () => {
    expect(createMappingDraft({ chapters: five, mangaTitle: 'M' })).not.toHaveProperty('source');
  });
});

describe('what is wrong with a mapping, and where', () => {
  it('names the volume that is empty, the chapter that cannot be written and the volume it disagrees with', () => {
    let draft = createMappingDraft({
      mangaTitle: 'M',
      chapters: [chapter('ok', 1), chapter('no-number'), chapter('in-two', 2, { parsedVolume: 7 })],
    });
    draft = addVolume(draft, 'empty', '1');
    draft = addVolume(draft, 'holds', '2');
    draft = assignChapters(draft, 'holds', ['no-number', 'in-two']);

    const issues = validateMapping(draft);
    const of = (code: string) => issues.find((issue) => issue.code === code);

    expect(of('empty_volume')?.volumeIds).toEqual(['empty']);
    expect(of('unparseable_chapter')?.chapterIds).toEqual(['no-number']);
    expect(of('filename_volume_conflict')).toMatchObject({
      chapterIds: ['in-two'],
      volumeIds: ['holds'],
    });
  });

  it('counts the chapters left out in the words that fit the number', () => {
    const one = validateMapping(
      createMappingDraft({ chapters: [chapter('only', 1)], mangaTitle: 'M' }),
    );
    const many = validateMapping(createMappingDraft({ chapters: five, mangaTitle: 'M' }));

    expect(one.find((issue) => issue.code === 'unassigned_chapters')?.message).toBe(
      '1 chapter is not assigned to a volume.',
    );
    expect(many.find((issue) => issue.code === 'unassigned_chapters')?.message).toBe(
      '5 chapters are not assigned to a volume.',
    );
  });

  it('writes the chapters of a volume in order, one token each', () => {
    const written = JSON.parse(serializeMangabindMetadata(threeVolumes())) as {
      volumes: { number: string; chapters: string[] }[];
    };

    expect(written.volumes).toEqual([
      { number: '1', chapters: ['1'] },
      { number: '2', chapters: ['2', '3'] },
      { number: '3', chapters: ['4'] },
    ]);
  });
});
