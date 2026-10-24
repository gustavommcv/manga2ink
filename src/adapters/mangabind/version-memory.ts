import type { VersionCandidate } from '@/domain/chapter-versions';
import type { MappingDraft } from '@/domain/mapping';

/**
 * What the app saw of a file when a choice was made among the files that claim a chapter: how big it
 * was and when it last changed, to the second. A file is the same one if both are what they were.
 */
export interface FileSignature {
  readonly size: number;
  readonly modified: number;
}

/**
 * The files of each chapter as they were when a choice was made, by the chapter (`6`, `21x1`) and
 * the path of each file below the manga folder. They are kept with the folder, in its mangabind.json,
 * under the app's own key, so that adding the same folder again can tell a file that came after the
 * choice, or changed since, from the ones that were chosen among (ADR 0093).
 */
export type SeenVersions = Readonly<Record<string, Readonly<Record<string, FileSignature>>>>;

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isSignature = (value: unknown): value is FileSignature =>
  isRecord(value) && Number.isFinite(value.size) && Number.isFinite(value.modified);

/**
 * What the file at this text holds of it. A file that cannot be read this way, or an entry that is
 * not usable, is taken as holding nothing: reading a folder never fails for want of it.
 */
export function readSeenVersions(text: string | undefined): SeenVersions {
  if (text === undefined) return {};
  let document: unknown;
  try {
    document = JSON.parse(text);
  } catch {
    return {};
  }
  const own = isRecord(document) ? document.manga2ink : undefined;
  const seen = isRecord(own) ? own.versions_seen : undefined;
  if (!isRecord(seen)) return {};
  const read: Record<string, Record<string, FileSignature>> = {};
  for (const [token, files] of Object.entries(seen)) {
    if (!isRecord(files)) continue;
    read[token] = Object.fromEntries(
      Object.entries(files)
        .filter((entry): entry is [string, FileSignature] => isSignature(entry[1]))
        .map(([file, signature]) => [file, { size: signature.size, modified: signature.modified }]),
    );
  }
  return read;
}

export type SignatureOf = (candidate: VersionCandidate) => Promise<FileSignature | undefined>;

/**
 * The draft with every choice kept only where the files are as they were when it was made. A chapter
 * whose files include one that came after the choice, or that changed since, is asked again: its
 * choice is offered as the one remembered, and the files that need a second look say why. A chapter
 * the folder has no record of is taken as chosen by whoever wrote the choice.
 */
export async function withRememberedChoices(
  draft: MappingDraft,
  seen: SeenVersions,
  below: (path: string) => string,
  signatureOf: SignatureOf,
): Promise<MappingDraft> {
  if (draft.versions === undefined) return draft;
  const versions = await Promise.all(
    draft.versions.map(async (group) => {
      const record = seen[group.token];
      if (group.use === undefined || record === undefined) return group;
      const candidates = await Promise.all(
        group.candidates.map(async (candidate): Promise<VersionCandidate> => {
          const before = record[below(candidate.path)];
          if (before === undefined) return { ...candidate, attention: 'new' };
          const now = await signatureOf(candidate);
          return now?.size === before.size && now.modified === before.modified
            ? candidate
            : { ...candidate, attention: 'changed' };
        }),
      );
      if (!candidates.some((candidate) => candidate.attention !== undefined)) return group;
      const { use, ...rest } = group;
      return { ...rest, candidates, remembered: use };
    }),
  );
  return versions.every((group, index) => group === draft.versions![index])
    ? draft
    : { ...draft, versions };
}

/** The files of the chapters that have a choice, as they are now: what to keep with the folder. */
export async function seenNow(
  draft: MappingDraft,
  below: (path: string) => string,
  signatureOf: SignatureOf,
): Promise<SeenVersions> {
  const seen: Record<string, Record<string, FileSignature>> = {};
  for (const group of draft.versions ?? []) {
    if (group.use === undefined) continue;
    const files: Record<string, FileSignature> = {};
    for (const candidate of group.candidates) {
      const signature = await signatureOf(candidate);
      if (signature !== undefined) files[below(candidate.path)] = signature;
    }
    seen[group.token] = files;
  }
  return seen;
}
