import { decisionOf, versionGroups } from './chapter-versions';
import { isMappableChapter, type MappingDraft } from './mapping';

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
