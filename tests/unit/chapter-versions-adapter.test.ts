import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { mappingDraftFromMangabindReport } from '@/adapters/mangabind/mapping-draft';
import { parseMangabindReport } from '@/adapters/mangabind/protocol';
import {
  type FileSignature,
  readSeenVersions,
  seenNow,
  type SignatureOf,
  withRememberedChoices,
} from '@/adapters/mangabind/version-memory';
import { carryStoredDetails } from '@/adapters/mangabind/stored-details';
import { chooseVersions, pendingVersionGroups, versionGroups } from '@/domain/chapter-versions';
import {
  createMappingDraft,
  type MappingDraft,
  mappingSignature,
  toMangabindMetadata,
  validateMapping,
} from '@/domain/mapping';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
function recorded(name: string): ReturnType<typeof parseMangabindReport> {
  return parseMangabindReport(
    fs.readFileSync(
      path.join(repositoryRoot, 'tests', 'fixtures', 'protocol', `mangabind-v1-${name}.json`),
      'utf8',
    ),
  );
}

// Reports of a folder of five CBZ files, two of them chapter 3 from two scan groups, recorded from
// mangabind with the choice among versions (its ADR 0028).
const unresolved = recorded('chapter-versions-unresolved');
const conflict = recorded('chapter-versions-conflict');
const one = recorded('chapter-versions-one');
const both = recorded('chapter-versions-both');
const none = recorded('chapter-versions-none');

const folder = '/fixtures/Folders Series';
const groupA = `${folder}/Ch.0003 - Koala (en) [GroupA].cbz`;
const groupB = `${folder}/Ch.0003 - Koala (en) [GroupB].cbz`;
const draftOf = (report: typeof unresolved): MappingDraft =>
  mappingDraftFromMangabindReport(report, { seed: 'effective-volumes' });

describe('a folder whose chapters have more than one version, as mangabind reports it', () => {
  it('is one chapter for the files that claim it, with the files kept apart', () => {
    const draft = draftOf(unresolved);

    expect(draft.chapters.map((chapter) => chapter.name)).toEqual([
      'Ch.0001 (en)',
      'Ch.0002 (en)',
      'Ch.0003 - Koala (en) [GroupA]',
      'Ch.0004 (en)',
    ]);
    expect(draft.chapters.every((chapter) => chapter.kind === 'cbz')).toBe(true);
    expect(versionGroups(draft)).toEqual([
      {
        token: '3',
        chapter: 3,
        candidates: [
          {
            id: groupA,
            name: 'Ch.0003 - Koala (en) [GroupA]',
            path: groupA,
            kind: 'cbz',
            pageCount: 2,
            firstPage: '001.png',
          },
          {
            id: groupB,
            name: 'Ch.0003 - Koala (en) [GroupB]',
            path: groupB,
            kind: 'cbz',
            pageCount: 3,
            firstPage: '001.png',
          },
        ],
      },
    ]);
    expect(pendingVersionGroups(draft)).toHaveLength(1);
  });

  it('has the chapter wait for a choice and for a volume when the names give none', () => {
    const draft = draftOf(unresolved);

    expect(draft.volumes).toEqual([]);
    expect(validateMapping(draft).map((issue) => issue.code)).toEqual(['unassigned_chapters']);
  });

  it('does not take the files for copies of one another: they are one chapter of the mapping', () => {
    const draft = draftOf(conflict);

    // The conflict leaves the chapter out of the volume mangabind built, until a choice is made.
    expect(draft.volumes.map((volume) => volume.chapterIds.length)).toEqual([3]);
    expect(validateMapping(draft).map((issue) => issue.code)).toEqual(['unassigned_chapters']);
    expect(versionGroups(draft)[0]).toMatchObject({ token: '3', volume: 1 });
    expect(versionGroups(draft)[0]).not.toHaveProperty('use');
  });

  it('places the chapter in its volume when a choice was made, however it was made', () => {
    for (const [report, use] of [
      [one, [groupB]],
      [both, [groupA, groupB]],
    ] as const) {
      const draft = draftOf(report);

      expect(versionGroups(draft)[0]!.use).toEqual(use);
      expect(draft.volumes).toHaveLength(1);
      expect(draft.volumes[0]!.chapterIds).toHaveLength(4);
      expect(draft.volumes[0]!.chapterIds).toContain(groupA);
      expect(validateMapping(draft)).toEqual([]);
    }
  });

  it('leaves a chapter out when the choice is none of its files', () => {
    const draft = draftOf(none);

    expect(versionGroups(draft)[0]!.use).toEqual([]);
    expect(draft.volumes[0]!.chapterIds).not.toContain(groupA);
    expect(pendingVersionGroups(draft)).toEqual([]);
  });

  it('is written for mangabind with the choices, by the path of each file below the folder', () => {
    const below = (file: string): string => file.replace(`${folder}/`, '');

    const file = toMangabindMetadata(draftOf(both), below);

    expect(file.volumes).toEqual([{ number: '1', chapters: ['1', '2', '3', '4'] }]);
    expect(file.chapter_versions).toEqual([
      {
        chapter: '3',
        use: ['Ch.0003 - Koala (en) [GroupA].cbz', 'Ch.0003 - Koala (en) [GroupB].cbz'],
      },
    ]);
  });

  it('names a file by its volume folder, and knows a special chapter and a file with no known page', () => {
    const report = structuredClone(unresolved);
    const manga = report.manga[0]!;
    manga.chapter_versions[0]!.special = 'x1';
    manga.units[2]!.volume_folder = `${folder}/Vol 1`;
    delete manga.units[3]!.first_page;
    delete manga.chapter_versions[0]!.volume;

    const group = versionGroups(draftOf(report))[0]!;

    expect(group).toMatchObject({ token: '3x1', special: 'x1' });
    expect(group).not.toHaveProperty('volume');
    expect(group.candidates.map((candidate) => candidate.name)).toEqual([
      'Vol 1/Ch.0003 - Koala (en) [GroupA]',
      'Ch.0003 - Koala (en) [GroupB]',
    ]);
    expect(group.candidates.map((candidate) => candidate.firstPage)).toEqual([
      '001.png',
      undefined,
    ]);
  });

  it('is the same draft whatever the files, when the tool knows nothing of versions', () => {
    const old = recorded('plan');

    expect(draftOf(old).versions).toBeUndefined();
  });

  it('can be chosen in the app as the tool chose it, and is signed the same', () => {
    const asked = chooseVersions(draftOf(conflict), '3', [groupB]);

    expect(mappingSignature(asked)).toBe(mappingSignature(draftOf(one)));
  });
});

const below = (file: string): string => file.replace(`${folder}/`, '');
const sameFiles: SignatureOf = (candidate) =>
  Promise.resolve({ size: candidate.pageCount * 10, modified: 1000 });
const seen = {
  '3': {
    'Ch.0003 - Koala (en) [GroupA].cbz': { size: 20, modified: 1000 },
    'Ch.0003 - Koala (en) [GroupB].cbz': { size: 30, modified: 1000 },
  },
};

describe('remembering what was chosen with a folder', () => {
  it('reads the note the app keeps under its own key, and nothing from what is not a note', () => {
    const text = JSON.stringify({
      manga2ink: {
        versions_seen: {
          '3': { 'a.cbz': { size: 20, modified: 1000 }, 'b.cbz': { size: 'big' }, 'c.cbz': null },
          '4': 'nope',
        },
      },
    });

    expect(readSeenVersions(text)).toEqual({ '3': { 'a.cbz': { size: 20, modified: 1000 } } });
    for (const unreadable of [
      undefined,
      'not json',
      '[]',
      '{}',
      '{"manga2ink": 3}',
      '{"manga2ink": {"versions_seen": []}}',
    ]) {
      expect(readSeenVersions(unreadable)).toEqual({});
    }
  });

  it('keeps a choice whose files are the ones it was made among', async () => {
    const draft = draftOf(one);

    const kept = await withRememberedChoices(
      draft,
      readSeenVersions(JSON.stringify({ manga2ink: { versions_seen: seen } })),
      below,
      sameFiles,
    );

    expect(kept).toBe(draft);
  });

  it('asks again when a file came after the choice, and offers the choice as remembered', async () => {
    const draft = draftOf(one);
    const before = { '3': { 'Ch.0003 - Koala (en) [GroupB].cbz': { size: 30, modified: 1000 } } };

    const asked = await withRememberedChoices(draft, before, below, sameFiles);

    const group = versionGroups(asked)[0]!;
    expect(group).not.toHaveProperty('use');
    expect(group.remembered).toEqual([groupB]);
    expect(group.candidates.map((candidate) => candidate.attention)).toEqual(['new', undefined]);
    expect(pendingVersionGroups(asked)).toHaveLength(1);
  });

  it('asks again when a file changed since, in size or in time, or is gone', async () => {
    const draft = draftOf(one);
    const asks = async (signatureOf: SignatureOf) =>
      versionGroups(
        await withRememberedChoices(draft, seen, below, signatureOf),
      )[0]!.candidates.map((candidate) => candidate.attention);

    expect(
      await asks((c) => Promise.resolve({ size: c.pageCount * 10 + 1, modified: 1000 })),
    ).toEqual(['changed', 'changed']);
    expect(await asks((c) => Promise.resolve({ size: c.pageCount * 10, modified: 1001 }))).toEqual([
      'changed',
      'changed',
    ]);
    expect(
      await asks((c) =>
        Promise.resolve(c.id === groupA ? undefined : { size: 30, modified: 1000 }),
      ),
    ).toEqual(['changed', undefined]);
  });

  it('trusts a choice the folder has no note of, as the choice of whoever wrote it', async () => {
    const draft = draftOf(one);

    expect(await withRememberedChoices(draft, {}, below, () => Promise.resolve(undefined))).toBe(
      draft,
    );
  });

  it('has nothing to ask about a draft without versions, or whose chapters wait for a choice', async () => {
    const plain = draftOf(recorded('plan'));
    const waiting = draftOf(unresolved);

    expect(await withRememberedChoices(plain, seen, below, sameFiles)).toBe(plain);
    expect(await withRememberedChoices(waiting, seen, below, sameFiles)).toEqual(waiting);
  });

  it('notes the files of the chapters that have a choice, as they are now', async () => {
    const signatures: Record<string, FileSignature> = {
      [groupA]: { size: 20, modified: 5 },
    };

    const note = await seenNow(draftOf(both), below, (candidate) =>
      Promise.resolve(signatures[candidate.path]),
    );

    // A file that cannot be found now is not noted.
    expect(note).toEqual({
      '3': { 'Ch.0003 - Koala (en) [GroupA].cbz': { size: 20, modified: 5 } },
    });
    expect(await seenNow(draftOf(unresolved), below, sameFiles)).toEqual({});
    expect(await seenNow(draftOf(recorded('plan')), below, sameFiles)).toEqual({});
  });
});

describe('carrying the choices over when the mapping is saved', () => {
  const file = (document: unknown): string => `${JSON.stringify(document, null, 2)}\n`;
  const mapping = file({
    schema_version: 1,
    volumes: [{ number: '1', chapters: ['1-4'] }],
    chapter_versions: [{ chapter: '3', use: ['b.cbz'] }],
  });

  it('writes the choices and the note of the files when there was no file yet', () => {
    const written = JSON.parse(carryStoredDetails(undefined, mapping, seen)) as Record<
      string,
      unknown
    >;

    expect(written.chapter_versions).toEqual([{ chapter: '3', use: ['b.cbz'] }]);
    expect(written.manga2ink).toEqual({ versions_seen: seen });
    expect(carryStoredDetails(undefined, mapping)).toBe(mapping);
  });

  it('replaces the choice for a chapter and keeps the choices for the others', () => {
    const existing = file({
      schema_version: 1,
      volumes: [],
      chapter_versions: [
        { chapter: '3', use: ['old.cbz'] },
        { chapter: '9', use: ['nine.cbz'] },
        'not a choice',
      ],
      manga2ink: { versions_seen: { '9': { 'nine.cbz': { size: 1, modified: 2 } } }, other: true },
    });

    const written = JSON.parse(carryStoredDetails(existing, mapping, seen)) as Record<
      string,
      unknown
    >;

    expect(written.chapter_versions).toEqual([
      { chapter: '9', use: ['nine.cbz'] },
      'not a choice',
      { chapter: '3', use: ['b.cbz'] },
    ]);
    expect(written.manga2ink).toEqual({
      versions_seen: { '9': { 'nine.cbz': { size: 1, modified: 2 } }, ...seen },
      other: true,
    });
  });

  it('leaves the note of the app as it was when this mapping noted nothing', () => {
    const existing = file({
      schema_version: 1,
      volumes: [],
      manga2ink: { other: true },
    });

    const written = JSON.parse(carryStoredDetails(existing, mapping)) as Record<string, unknown>;

    expect(written.manga2ink).toEqual({ other: true });
  });

  it('keeps the choices of a file whose mapping chooses nothing', () => {
    const plain = file({ schema_version: 1, volumes: [{ number: '1', chapters: ['1-4'] }] });
    const existing = file({
      schema_version: 1,
      volumes: [],
      chapter_versions: [{ chapter: '3', use: ['a.cbz'] }],
    });

    const written = JSON.parse(carryStoredDetails(existing, plain)) as Record<string, unknown>;

    expect(written.chapter_versions).toEqual([{ chapter: '3', use: ['a.cbz'] }]);
  });
});

describe('a draft of the chapters that more than one file claims', () => {
  it('can be made with its versions, and without any', () => {
    const chapters = draftOf(unresolved).chapters;

    expect(createMappingDraft({ mangaTitle: 'x', chapters, versions: [] })).not.toHaveProperty(
      'versions',
    );
  });
});
