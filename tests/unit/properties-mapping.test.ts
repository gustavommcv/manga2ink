import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  addVolume,
  assignChapterRange,
  assignChapters,
  createMappingDraft,
  isVolumeNumber,
  type MappingChapter,
  type MappingDraft,
  MappingOperationError,
  mergeVolumes,
  removeVolume,
  renumberVolume,
  serializeMangabindMetadata,
  splitVolume,
  unassignChapters,
  validateMapping,
} from '@/domain/mapping';

/** A folder's chapters as mangabind reads them: some with no number, some special, some in a volume. */
const chapters = fc
  .array(
    fc.record({
      pageCount: fc.integer({ min: 1, max: 60 }),
      chapter: fc.option(
        fc.oneof(
          fc.integer({ min: 0, max: 400 }),
          fc.integer({ min: 0, max: 4000 }).map((tenths) => tenths / 10),
        ),
        { nil: undefined },
      ),
      special: fc.option(fc.constantFrom('x1', 'y2', 'z10', 'extra'), { nil: undefined }),
      parsedVolume: fc.option(fc.integer({ min: 1, max: 12 }), { nil: undefined }),
    }),
    { minLength: 1, maxLength: 14 },
  )
  .map((generated): MappingChapter[] =>
    generated.map((chapter, index) => ({
      id: `c${String(index)}`,
      name: `Chapter ${String(index)}`,
      path: `/manga/${String(index)}`,
      pageCount: chapter.pageCount,
      ...(chapter.chapter === undefined ? {} : { chapter: chapter.chapter }),
      ...(chapter.special === undefined ? {} : { special: chapter.special }),
      ...(chapter.parsedVolume === undefined ? {} : { parsedVolume: chapter.parsedVolume }),
    })),
  );

/** A volume number as typed: good ones, near misses and junk. */
const volumeNumber = fc.oneof(
  fc.integer({ min: 0, max: 100_001 }).map(String),
  fc.tuple(fc.nat(60), fc.nat(99)).map(([whole, part]) => `${String(whole)}.${String(part)}`),
  fc.constantFrom(' 3 ', '1e3', '-1', '1.', '.5', '', 'one', '0x10', '007', '1.50', '99999.9'),
);

type Operation =
  | { readonly kind: 'add'; readonly number: string }
  | { readonly kind: 'remove'; readonly volume: number }
  | { readonly kind: 'renumber'; readonly volume: number; readonly number: string }
  | { readonly kind: 'assign'; readonly volume: number; readonly picks: readonly number[] }
  | { readonly kind: 'range'; readonly volume: number; readonly from: number; readonly to: number }
  | { readonly kind: 'unassign'; readonly picks: readonly number[] }
  | {
      readonly kind: 'split';
      readonly volume: number;
      readonly at: number;
      readonly number: string;
    }
  | { readonly kind: 'merge'; readonly target: number; readonly source: number };

const index = fc.integer({ min: 0, max: 20 });
const operation: fc.Arbitrary<Operation> = fc.oneof(
  fc.record({ kind: fc.constant('add' as const), number: volumeNumber }),
  fc.record({ kind: fc.constant('remove' as const), volume: index }),
  fc.record({ kind: fc.constant('renumber' as const), volume: index, number: volumeNumber }),
  fc.record({
    kind: fc.constant('assign' as const),
    volume: index,
    picks: fc.array(index, { maxLength: 8 }),
  }),
  fc.record({ kind: fc.constant('range' as const), volume: index, from: index, to: index }),
  fc.record({ kind: fc.constant('unassign' as const), picks: fc.array(index, { maxLength: 8 }) }),
  fc.record({
    kind: fc.constant('split' as const),
    volume: index,
    at: index,
    number: volumeNumber,
  }),
  fc.record({ kind: fc.constant('merge' as const), target: index, source: index }),
);

/** Which volume or chapter a generated number points at; one past the end means "one that is not there". */
const pick = <T extends { readonly id: string }>(items: readonly T[], at: number): string =>
  items[at % (items.length + 1)]?.id ?? 'missing';

function apply(draft: MappingDraft, step: Operation, fresh: string): MappingDraft {
  switch (step.kind) {
    case 'add':
      return addVolume(draft, fresh, step.number);
    case 'remove':
      return removeVolume(draft, pick(draft.volumes, step.volume));
    case 'renumber':
      return renumberVolume(draft, pick(draft.volumes, step.volume), step.number);
    case 'assign':
      return assignChapters(
        draft,
        pick(draft.volumes, step.volume),
        step.picks.map((at) => pick(draft.chapters, at)),
      );
    case 'range':
      return assignChapterRange(
        draft,
        pick(draft.volumes, step.volume),
        pick(draft.chapters, step.from),
        pick(draft.chapters, step.to),
      );
    case 'unassign':
      return unassignChapters(
        draft,
        step.picks.map((at) => pick(draft.chapters, at)),
      );
    case 'split':
      return splitVolume(
        draft,
        pick(draft.volumes, step.volume),
        pick(draft.chapters, step.at),
        fresh,
        step.number,
      );
    case 'merge':
      return mergeVolumes(
        draft,
        pick(draft.volumes, step.target),
        pick(draft.volumes, step.source),
      );
  }
}

/** What has to be true of a draft however it was reached. */
function expectSound(draft: MappingDraft): void {
  const volumeIds = draft.volumes.map((volume) => volume.id);
  expect(new Set(volumeIds).size).toBe(volumeIds.length);
  const known = new Set(draft.chapters.map((chapter) => chapter.id));
  const placed = draft.volumes.flatMap((volume) => volume.chapterIds);
  // A chapter is in one volume at most, and only a chapter of the folder is in any.
  expect(new Set(placed).size).toBe(placed.length);
  for (const chapterId of placed) expect(known.has(chapterId)).toBe(true);
  for (const volume of draft.volumes) {
    expect(isVolumeNumber(volume.number)).toBe(true);
    expect(String(Number(volume.number))).toBe(volume.number);
  }
}

describe('grouping chapters into volumes, whatever order the person does it in', () => {
  it('never leaves a chapter in two volumes, a volume that is not there, or a number mangabind refuses', () => {
    fc.assert(
      fc.property(chapters, fc.array(operation, { maxLength: 30 }), (found, steps) => {
        let draft = createMappingDraft({ chapters: found, mangaTitle: 'Manga' });
        steps.forEach((step, count) => {
          const before = structuredClone(draft);
          try {
            draft = apply(draft, step, `v${String(count)}`);
          } catch (error) {
            // Only the refusals the editor knows how to say; anything else is a bug.
            expect(error).toBeInstanceOf(MappingOperationError);
            // A refused change changes nothing.
            expect(draft).toEqual(before);
          }
          expectSound(draft);
          // Saying what is wrong with a draft never fails, whatever state it is in.
          expect(() => validateMapping(draft)).not.toThrow();
        });
      }),
      { numRuns: 300 },
    );
  });

  it('writes a file mangabind can read exactly when the mapping has no error', () => {
    fc.assert(
      fc.property(chapters, fc.array(operation, { maxLength: 30 }), (found, steps) => {
        let draft = createMappingDraft({ chapters: found, mangaTitle: 'Manga' });
        steps.forEach((step, count) => {
          try {
            draft = apply(draft, step, `v${String(count)}`);
          } catch {
            // Refused: the draft stays as it was.
          }
        });
        const errors = validateMapping(draft).filter((issue) => issue.severity === 'error');
        if (errors.length > 0) {
          expect(() => serializeMangabindMetadata(draft)).toThrow();
          return;
        }
        const written = JSON.parse(serializeMangabindMetadata(draft)) as {
          schema_version: number;
          volumes: { number: string; chapters: string[] }[];
        };
        expect(written.schema_version).toBe(1);
        // Every chapter placed in the draft is in the file, once, under its own volume.
        const placed = draft.volumes.flatMap((volume) => volume.chapterIds);
        const inFile = written.volumes.flatMap((volume) => volume.chapters);
        expect(inFile).toHaveLength(placed.length);
        expect(written.volumes.map((volume) => volume.number).sort()).toEqual(
          draft.volumes.map((volume) => volume.number).sort(),
        );
      }),
      { numRuns: 300 },
    );
  });
});

describe('a volume number as it is typed', () => {
  it('is written one way only, and that way is accepted again as it is', () => {
    fc.assert(
      fc.property(volumeNumber, (typed) => {
        const base = createMappingDraft({
          chapters: [{ id: 'c0', name: 'Chapter 0', path: '/m/0', pageCount: 1, chapter: 0 }],
          mangaTitle: 'Manga',
        });
        if (!isVolumeNumber(typed)) {
          expect(() => addVolume(base, 'v', typed)).toThrow(MappingOperationError);
          return;
        }
        const written = addVolume(base, 'v', typed).volumes[0]?.number ?? '';
        expect(Number(written)).toBe(Number(typed.trim()));
        expect(isVolumeNumber(written)).toBe(true);
        expect(addVolume(base, 'v', written).volumes[0]?.number).toBe(written);
      }),
      { numRuns: 400 },
    );
  });
});
