import type { MangabindReport } from './protocol';

import type { VersionGroup } from '@/domain/chapter-versions';
import {
  createMappingDraft,
  isMappableChapter,
  type MappingDraft,
  type MappingSource,
  type MappingVolume,
} from '@/domain/mapping';

/** The last part of a folder's path, whichever separator the system that wrote it uses. */
function folderName(folder: string): string {
  return folder
    .replace(/[\\/]+$/u, '')
    .split(/[\\/]/u)
    .pop()!;
}

export function mappingDraftFromMangabindReport(
  report: MangabindReport,
  options: {
    readonly mangaIndex?: number;
    readonly seed: 'empty' | 'effective-volumes';
    readonly source?: MappingSource;
  },
): MappingDraft {
  const manga = report.manga[options.mangaIndex ?? 0];
  if (manga === undefined) {
    throw new RangeError('The mangabind report does not contain the requested manga.');
  }

  // The files that claim one chapter are one chapter of the draft, standing for all of them: the
  // first in the order mangabind found them. What is chosen among them is kept apart (ADR 0093).
  const groupOfPath = new Map<
    string,
    MangabindReport['manga'][number]['chapter_versions'][number]
  >();
  for (const group of manga.chapter_versions) {
    for (const unitPath of group.units) groupOfPath.set(unitPath, group);
  }
  const standsFor = (unitPath: string): string => groupOfPath.get(unitPath)?.units[0] ?? unitPath;

  const chapters = manga.units
    .filter((unit) => unit.parser.matched && standsFor(unit.path) === unit.path)
    .map((unit) => {
      // A chapter in the folder of a volume has that volume, though its own name says none, and
      // mangabind keeps it over the file the app writes: it is a volume of its own, like a name's.
      const volume =
        unit.parser.volume ??
        (unit.volume_folder === undefined ? undefined : unit.effective_volume);
      return {
        id: unit.path,
        // Two volume folders may hold a chapter of one name, so the folder is part of what is shown.
        name:
          unit.volume_folder === undefined
            ? unit.name
            : `${folderName(unit.volume_folder)}/${unit.name}`,
        path: unit.path,
        kind: unit.kind,
        pageCount: unit.page_count,
        ...(unit.parser.chapter === undefined ? {} : { chapter: unit.parser.chapter }),
        ...(unit.parser.special === undefined ? {} : { special: unit.parser.special }),
        ...(volume === undefined ? {} : { parsedVolume: volume }),
        ...(unit.parser.language === undefined ? {} : { language: unit.parser.language }),
      };
    });

  const volumes: MappingVolume[] = [];
  if (options.seed === 'effective-volumes') {
    // Start from mangabind's own grouping (volumes named in the folder names, or already
    // mapped by an existing mangabind.json). Only units mangabind actually includes qualify:
    // a duplicate chapter reports `conflict` even though it carries an effective volume, and
    // mangabind skips every copy. A unit with no usable chapter number would open the editor
    // with an error the user can't explain, so it stays unassigned instead.
    const chapterByPath = new Map(chapters.map((chapter) => [chapter.path, chapter]));
    const volumeByNumber = new Map<number, { id: string; chapterIds: string[] }>();
    const placed = new Set<string>();
    for (const unit of manga.units) {
      // A chapter with versions is placed once, by whichever of its files mangabind includes.
      const chapter = chapterByPath.get(standsFor(unit.path));
      if (
        chapter === undefined ||
        unit.disposition !== 'included' ||
        unit.effective_volume === undefined ||
        !isMappableChapter(chapter) ||
        placed.has(chapter.id)
      ) {
        continue;
      }
      placed.add(chapter.id);
      const existing = volumeByNumber.get(unit.effective_volume) ?? {
        id: `effective-volume-${String(unit.effective_volume)}`,
        chapterIds: [],
      };
      existing.chapterIds.push(chapter.id);
      volumeByNumber.set(unit.effective_volume, existing);
    }
    // Numeric order: "Merge into volume N-1" in the editor follows array order.
    for (const [number, volume] of [...volumeByNumber].sort(([left], [right]) => left - right)) {
      volumes.push({ ...volume, number: String(number) });
    }
  }

  const unitByPath = new Map(manga.units.map((unit) => [unit.path, unit]));
  const versions: VersionGroup[] = manga.chapter_versions.map((group) => {
    const candidates = group.units.map((unitPath) => {
      const unit = unitByPath.get(unitPath)!;
      return {
        id: unit.path,
        name:
          unit.volume_folder === undefined
            ? unit.name
            : `${folderName(unit.volume_folder)}/${unit.name}`,
        path: unit.path,
        kind: unit.kind,
        pageCount: unit.page_count,
        ...(unit.first_page === undefined ? {} : { firstPage: unit.first_page }),
      };
    });
    return {
      token: `${String(group.chapter)}${group.special ?? ''}`,
      chapter: group.chapter,
      ...(group.special === undefined ? {} : { special: group.special }),
      ...(group.volume === undefined ? {} : { volume: group.volume }),
      candidates,
      // What the mapping file chose is every file mangabind did not set aside.
      ...(group.resolution === 'chosen'
        ? {
            use: candidates
              .filter((candidate) => unitByPath.get(candidate.id)!.disposition !== 'not_chosen')
              .map((candidate) => candidate.id),
          }
        : {}),
    };
  });

  return createMappingDraft({
    chapters,
    mangaTitle: manga.name,
    volumes,
    versions,
    ...(options.source === undefined ? {} : { source: options.source }),
  });
}
