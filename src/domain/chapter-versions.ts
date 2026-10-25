import {
  addVolume,
  assignChapters,
  assignedVolumeId,
  MappingOperationError,
  type MappingDraft,
} from './mapping';
import { message } from './message';

/** One file among those that claim the same chapter. */
export interface VersionCandidate {
  /** The path of the file or folder: it is what the choice is made by, and the chapter id when it stands for the group. */
  readonly id: string;
  readonly name: string;
  readonly path: string;
  readonly kind: 'folder' | 'cbz';
  readonly pageCount: number;
  /** The first page in reading order, as the tool names it: what the file is shown by. */
  readonly firstPage?: string;
  /** Why this file needs a second look, when it does: it came after the choice, or changed since. */
  readonly attention?: 'new' | 'changed';
}

/**
 * The files that claim one chapter: the same chapter from two scan groups, in two languages, or twice
 * (ADR 0093). The chapter list of the draft has one chapter for the group, standing for all of them;
 * the files themselves are here.
 */
export interface VersionGroup {
  /** The chapter as the mapping file writes it: `6`, `6.5`, `21x1`. */
  readonly token: string;
  readonly chapter: number;
  readonly special?: string;
  /** The volume the files have of their own (their names, their folder), when they have one. */
  readonly volume?: number;
  readonly candidates: readonly VersionCandidate[];
  /** The ids of the files to use: all of them, some, one or none. Absent while nothing is decided. */
  readonly use?: readonly string[];
  /** What was chosen when the folder was read before, offered again when something about it changed. */
  readonly remembered?: readonly string[];
}

/** The first page of a file that claims a chapter, as it is on disk: enough to show the file by. */
export interface PagePreview {
  readonly mime: string;
  readonly bytes: Uint8Array;
}

/** A page of a version, with the version it is the first page of. */
export interface ChapterPreview extends PagePreview {
  readonly id: string;
}

/** What a choice comes to, for saying it: one version, all kept as alternatives, or the chapter left out. */
export type VersionDecision = 'one' | 'all' | 'none';

export function versionGroups(draft: MappingDraft | undefined): readonly VersionGroup[] {
  return draft?.versions ?? [];
}

/** The groups still waiting for a choice. A run cannot start while there are any. */
export function pendingVersionGroups(draft: MappingDraft | undefined): readonly VersionGroup[] {
  return versionGroups(draft).filter((group) => group.use === undefined);
}

/** The groups that keep more than one file: their files are alternatives of one chapter. */
export function alternativeVersionGroups(draft: MappingDraft | undefined): readonly VersionGroup[] {
  return versionGroups(draft).filter((group) => (group.use?.length ?? 0) > 1);
}

/** What a group's choice comes to, or undefined while it has none. */
export function decisionOf(group: VersionGroup): VersionDecision | undefined {
  if (group.use === undefined) return undefined;
  if (group.use.length === 0) return 'none';
  return group.use.length === 1 ? 'one' : 'all';
}

/** The ids of every file that is left out because another was chosen over it, or none was. */
export function leftOutVersionIds(draft: MappingDraft | undefined): ReadonlySet<string> {
  const left = new Set<string>();
  for (const group of versionGroups(draft)) {
    if (group.use === undefined) continue;
    const kept = new Set(group.use);
    for (const candidate of group.candidates) {
      if (!kept.has(candidate.id)) left.add(candidate.id);
    }
  }
  return left;
}

function groupByToken(draft: MappingDraft, token: string): VersionGroup {
  const group = versionGroups(draft).find((candidate) => candidate.token === token);
  if (group === undefined) {
    throw new MappingOperationError(
      'unknown_version_group',
      message('mapping.unknownVersionGroup', { token }),
    );
  }
  return group;
}

function withGroup(draft: MappingDraft, group: VersionGroup): MappingDraft {
  return {
    ...draft,
    versions: versionGroups(draft).map((candidate) =>
      candidate.token === group.token ? group : candidate,
    ),
  };
}

/** The group's files that these ids name, in the order the group has them, each once. */
function knownCandidates(group: VersionGroup, ids: readonly string[]): readonly string[] {
  const named = new Set(ids);
  for (const id of named) {
    if (!group.candidates.some((candidate) => candidate.id === id)) {
      throw new MappingOperationError('unknown_version', message('mapping.unknownVersion', { id }));
    }
  }
  return group.candidates.filter((candidate) => named.has(candidate.id)).map((c) => c.id);
}

/**
 * Chooses which files of a chapter to use: one, several kept as alternatives, or none. A chapter that
 * the names or the folders put in a volume, and that the mapping had not placed because its files
 * were in conflict, goes to that volume now that it is no longer one.
 */
export function chooseVersions(
  draft: MappingDraft,
  token: string,
  use: readonly string[],
): MappingDraft {
  const group = groupByToken(draft, token);
  const chosen = withGroup(draft, { ...group, use: knownCandidates(group, use) });
  return group.volume === undefined || use.length === 0 ? chosen : placedInItsVolume(chosen, group);
}

/** Takes a choice back: the chapter waits for one again. */
export function clearVersionChoice(draft: MappingDraft, token: string): MappingDraft {
  const { use, ...rest } = groupByToken(draft, token);
  void use;
  return withGroup(draft, rest);
}

/** The group that stands for a chapter of the draft, found by the id the chapter has. */
export function groupOfChapter(draft: MappingDraft, chapterId: string): VersionGroup | undefined {
  return versionGroups(draft).find((group) => group.candidates[0]?.id === chapterId);
}

function placedInItsVolume(draft: MappingDraft, group: VersionGroup): MappingDraft {
  const representative = group.candidates[0]!.id;
  if (assignedVolumeId(draft, representative) !== undefined) return draft;
  const number = String(group.volume);
  const existing = draft.volumes.find((volume) => volume.number === number);
  const volumeId = existing?.id ?? `effective-volume-${number}`;
  const withVolume = existing === undefined ? addVolume(draft, volumeId, number) : draft;
  return assignChapters(withVolume, volumeId, [representative]);
}

/**
 * The draft with the choices the page submitted laid over the groups the app read. The files, their
 * names and their paths are the app's; the page may only say which of them to use, and a choice that
 * names a file the group does not have is refused.
 */
export function withSubmittedChoices(trusted: MappingDraft, submitted: MappingDraft): MappingDraft {
  const groups = versionGroups(trusted);
  if (groups.length === 0) return trusted;
  const chosen = new Map(versionGroups(submitted).map((group) => [group.token, group.use]));
  return {
    ...trusted,
    versions: groups.map((group) => {
      const use = chosen.get(group.token);
      const { use: unused, ...rest } = group;
      void unused;
      return use === undefined ? rest : { ...rest, use: knownCandidates(group, use) };
    }),
  };
}
