import { decisionOf, versionGroups } from './chapter-versions';
import {
  chapterTokenOf,
  isMappableChapter,
  type MangabindMetadataFile,
  type MappingDraft,
  toMangabindMetadata,
} from './mapping';

/**
 * The draft with one volume holding the chapters of a series that has none of its own, for the book
 * that is the whole series (ADR 0094). A series made into one book needs no volumes: its chapters
 * are the book's table of contents, and volumes are a level above them only where the series has
 * them. The volume is the way the tool is told to put every chapter in the book, and is not the
 * person's: it is made for the run and never kept with the folder.
 *
 * It leaves out the chapters that cannot be named in a mapping file, those whose name already says a
 * volume (the tool keeps that volume whatever the file says) and the chapters a person chose to leave
 * out. A draft that has volumes is the person's, and is not touched.
 */
export function withSeriesVolume(draft: MappingDraft): MappingDraft {
  if (draft.volumes.length > 0) return draft;
  const leftOut = new Set(
    versionGroups(draft)
      .filter((group) => decisionOf(group) === 'none')
      .map((group) => group.candidates[0]!.id),
  );
  const chapterIds = draft.chapters
    .filter(
      (chapter) =>
        isMappableChapter(chapter) &&
        chapter.parsedVolume === undefined &&
        !leftOut.has(chapter.id),
    )
    .map((chapter) => chapter.id);
  if (chapterIds.length === 0) return draft;
  return { ...draft, volumes: [{ id: 'whole-series', number: '1', chapterIds }] };
}

/**
 * What the tool is told for a series made into one book: the person's own mapping when the series has
 * volumes, and for one with none, the volume made for the run with every chapter listed once.
 *
 * A mapping the person makes is checked, and two chapters of one number in a volume are an error they
 * are asked to fix. The volume made for the run has no one to ask: when two files claim a chapter and the
 * tool cannot tell them apart (a release that does not choose among versions), the number is listed once
 * and the tool leaves both out and says so, as it does for any conflict, and the book is made of the rest.
 */
export function toSeriesMetadata(
  draft: MappingDraft,
  pathBelow?: (path: string) => string,
): MangabindMetadataFile {
  const placed = withSeriesVolume(draft);
  if (placed === draft) return toMangabindMetadata(draft, pathBelow);
  const chapters = new Map(draft.chapters.map((chapter) => [chapter.id, chapter]));
  const tokens = new Set(
    placed.volumes[0]!.chapterIds.map((id) => chapterTokenOf(chapters.get(id)!)),
  );
  // With no volumes the mapping has no errors to refuse: what the file says of volumes is this alone.
  const file = toMangabindMetadata({ ...draft, volumes: [] }, pathBelow);
  return { ...file, volumes: [{ number: '1', chapters: [...tokens] }] };
}

export function serializeSeriesMetadata(
  draft: MappingDraft,
  pathBelow?: (path: string) => string,
): string {
  return `${JSON.stringify(toSeriesMetadata(draft, pathBelow), null, 2)}\n`;
}
