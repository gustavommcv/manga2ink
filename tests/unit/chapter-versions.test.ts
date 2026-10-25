import { describe, expect, it } from 'vitest';

import {
  alternativeVersionGroups,
  chooseVersions,
  clearVersionChoice,
  decisionOf,
  groupOfChapter,
  leftOutVersionIds,
  pendingVersionGroups,
  type VersionCandidate,
  type VersionGroup,
  versionGroups,
  withSubmittedChoices,
} from '@/domain/chapter-versions';
import {
  createMappingDraft,
  MappingOperationError,
  type MappingDraft,
  mappingSignature,
  toMangabindMetadata,
} from '@/domain/mapping';
import { message } from '@/domain/message';

function candidate(id: string, overrides: Partial<VersionCandidate> = {}): VersionCandidate {
  return { id, name: id, path: `/series/${id}.cbz`, kind: 'cbz', pageCount: 12, ...overrides };
}

const six: VersionGroup = {
  token: '6',
  chapter: 6,
  candidates: [candidate('six-a'), candidate('six-b')],
};
const fifteen: VersionGroup = {
  token: '15',
  chapter: 15,
  candidates: [candidate('fifteen-a'), candidate('fifteen-b'), candidate('fifteen-c')],
};

/** A series of chapters 1, 6 and 15, the last two with more than one file; none is placed. */
function draft(overrides: { versions?: readonly VersionGroup[] } = {}): MappingDraft {
  return createMappingDraft({
    mangaTitle: 'Ubunchu',
    chapters: [
      { id: 'one', name: 'one', path: '/series/one.cbz', pageCount: 12, chapter: 1 },
      { id: 'six-a', name: 'six-a', path: '/series/six-a.cbz', pageCount: 12, chapter: 6 },
      { id: 'fifteen-a', name: 'f-a', path: '/series/fifteen-a.cbz', pageCount: 12, chapter: 15 },
    ],
    versions: overrides.versions ?? [six, fifteen],
  });
}

describe('the versions of a chapter', () => {
  it('knows the groups of a draft, and that a draft without them has none', () => {
    expect(versionGroups(draft())).toHaveLength(2);
    expect(versionGroups(draft({ versions: [] }))).toEqual([]);
    expect(versionGroups(undefined)).toEqual([]);
  });

  it('waits for a choice on every group that has none, and for no other', () => {
    const chosen = chooseVersions(draft(), '6', ['six-b']);

    expect(pendingVersionGroups(draft()).map((group) => group.token)).toEqual(['6', '15']);
    expect(pendingVersionGroups(chosen).map((group) => group.token)).toEqual(['15']);
    expect(pendingVersionGroups(undefined)).toEqual([]);
  });

  it('says what a choice comes to: one version, all of them as alternatives, or none', () => {
    const [pending, one, all, none] = [
      six,
      { ...six, use: ['six-b'] },
      { ...six, use: ['six-a', 'six-b'] },
      { ...six, use: [] },
    ];

    expect([pending, one, all, none].map((group) => decisionOf(group))).toEqual([
      undefined,
      'one',
      'all',
      'none',
    ]);
  });

  it('counts as alternatives only the chapters that keep more than one file', () => {
    let made = draft();
    made = chooseVersions(made, '6', ['six-a', 'six-b']);
    made = chooseVersions(made, '15', ['fifteen-c']);

    expect(alternativeVersionGroups(made).map((group) => group.token)).toEqual(['6']);
    expect(alternativeVersionGroups(undefined)).toEqual([]);
    // A chapter still waiting for a choice keeps nothing yet.
    expect(alternativeVersionGroups(draft())).toEqual([]);
  });

  it('lists the files that are left out: those not chosen, and all of a chapter left out', () => {
    let made = draft();
    expect([...leftOutVersionIds(made)]).toEqual([]);
    made = chooseVersions(made, '6', ['six-b']);
    made = chooseVersions(made, '15', []);

    expect([...leftOutVersionIds(made)].sort()).toEqual(
      ['fifteen-a', 'fifteen-b', 'fifteen-c', 'six-a'].sort(),
    );
    expect(leftOutVersionIds(undefined).size).toBe(0);
  });

  it('finds the group that a chapter of the draft stands for, by the first file', () => {
    expect(groupOfChapter(draft(), 'six-a')?.token).toBe('6');
    expect(groupOfChapter(draft(), 'one')).toBeUndefined();
  });
});

describe('choosing among the versions of a chapter', () => {
  it('keeps the files that are named, in the order the chapter has them, each once', () => {
    const made = chooseVersions(draft(), '15', ['fifteen-c', 'fifteen-a', 'fifteen-c']);

    expect(versionGroups(made)[1]!.use).toEqual(['fifteen-a', 'fifteen-c']);
    expect(versionGroups(made)[0]!.use).toBeUndefined();
  });

  it('refuses a file that the chapter does not have, and a chapter that has no versions', () => {
    expect(() => chooseVersions(draft(), '6', ['fifteen-a'])).toThrow(MappingOperationError);
    expect(() => chooseVersions(draft(), '6', ['fifteen-a'])).toThrow(
      expect.objectContaining({
        code: 'unknown_version',
        said: message('mapping.unknownVersion', { id: 'fifteen-a' }),
      }) as Error,
    );
    expect(() => chooseVersions(draft(), '99', [])).toThrow(
      expect.objectContaining({
        code: 'unknown_version_group',
        said: message('mapping.unknownVersionGroup', { token: '99' }),
      }) as Error,
    );
  });

  it('takes a choice back, so that the chapter waits for one again', () => {
    const made = chooseVersions(draft(), '6', ['six-a']);

    const taken = clearVersionChoice(made, '6');

    expect(pendingVersionGroups(taken).map((group) => group.token)).toEqual(['6', '15']);
    expect(versionGroups(taken)[0]).not.toHaveProperty('use');
    expect(() => clearVersionChoice(made, '99')).toThrow(MappingOperationError);
  });

  it('is part of what a draft says, so that a change of choice is a change', () => {
    const start = mappingSignature(draft());

    expect(mappingSignature(chooseVersions(draft(), '6', ['six-a']))).not.toBe(start);
    expect(mappingSignature(chooseVersions(draft(), '6', ['six-a']))).toBe(
      mappingSignature(chooseVersions(draft(), '6', ['six-a'])),
    );
    expect(mappingSignature(chooseVersions(draft(), '6', ['six-a']))).not.toBe(
      mappingSignature(chooseVersions(draft(), '6', ['six-b'])),
    );
    // A draft with no such chapters is signed as it always was.
    expect(mappingSignature(draft({ versions: [] }))).not.toContain('versions');
  });

  describe('where the files have a volume of their own', () => {
    const inVolume: VersionGroup = { ...six, volume: 2 };

    it('places the chapter in that volume once it is no longer in conflict', () => {
      const made = chooseVersions(draft({ versions: [inVolume] }), '6', ['six-b']);

      expect(made.volumes).toEqual([
        { id: 'effective-volume-2', number: '2', chapterIds: ['six-a'] },
      ]);
    });

    it('uses the volume the draft already has for that number', () => {
      const base = createMappingDraft({
        mangaTitle: 'Ubunchu',
        chapters: draft().chapters,
        versions: [inVolume],
        volumes: [{ id: 'mine', number: '2', chapterIds: ['one'] }],
      });

      const made = chooseVersions(base, '6', ['six-a', 'six-b']);

      expect(made.volumes).toEqual([{ id: 'mine', number: '2', chapterIds: ['one', 'six-a'] }]);
    });

    it('leaves a chapter where it is when it already has a volume, or is left out', () => {
      const placed = createMappingDraft({
        mangaTitle: 'Ubunchu',
        chapters: draft().chapters,
        versions: [inVolume],
        volumes: [{ id: 'other', number: '3', chapterIds: ['six-a'] }],
      });

      expect(chooseVersions(placed, '6', ['six-b']).volumes).toEqual(placed.volumes);
      expect(chooseVersions(draft({ versions: [inVolume] }), '6', []).volumes).toEqual([]);
    });
  });

  it('writes only the choices that were made, by the path each file is named in the folder', () => {
    const made = chooseVersions(draft(), '6', ['six-b']);

    const file = toMangabindMetadata(made, (path) => path.replace('/series/', ''));

    expect(file.chapter_versions).toEqual([{ chapter: '6', use: ['six-b.cbz'] }]);
    expect(toMangabindMetadata(draft()).chapter_versions).toBeUndefined();
    // Without a way to say it, a file is named by the path the app knows.
    expect(toMangabindMetadata(made).chapter_versions).toEqual([
      { chapter: '6', use: ['/series/six-b.cbz'] },
    ]);
  });
});

describe('the choices a page submits', () => {
  it('are laid over the groups the app read, and the files are the app’s own', () => {
    const submitted = createMappingDraft({
      mangaTitle: 'Ubunchu',
      chapters: draft().chapters,
      versions: [
        {
          ...six,
          // A page cannot change what the files are.
          candidates: [candidate('six-a', { path: '/elsewhere.cbz' })],
          use: ['six-b'],
        },
        fifteen,
      ],
    });

    const trusted = withSubmittedChoices(draft(), submitted);

    expect(versionGroups(trusted)[0]!.use).toEqual(['six-b']);
    expect(versionGroups(trusted)[0]!.candidates).toEqual(six.candidates);
    // No choice for a group is a group still waiting for one, whatever the app had read.
    expect(versionGroups(trusted)[1]).not.toHaveProperty('use');
  });

  it('forget what the app read when the page says nothing of a chapter', () => {
    const read = chooseVersions(draft(), '6', ['six-a']);
    const submitted = createMappingDraft({ mangaTitle: 'Ubunchu', chapters: draft().chapters });

    expect(pendingVersionGroups(withSubmittedChoices(read, submitted)).map((g) => g.token)).toEqual(
      ['6', '15'],
    );
  });

  it('are refused when they name a file the chapter does not have', () => {
    const submitted = createMappingDraft({
      mangaTitle: 'Ubunchu',
      chapters: draft().chapters,
      versions: [{ ...six, use: ['/etc/passwd'] }],
    });

    expect(() => withSubmittedChoices(draft(), submitted)).toThrow(MappingOperationError);
  });

  it('leave a draft with no such chapters as it is', () => {
    const plain = draft({ versions: [] });

    expect(withSubmittedChoices(plain, draft())).toBe(plain);
  });
});
