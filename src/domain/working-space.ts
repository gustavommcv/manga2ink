import { type InspectedRow, type QueueRow, runnableRows } from './input-queue';
import type { ProcessMode } from './process-mode';

/**
 * How much a page is taken to need, in each place the app works in. It is more than a page of a
 * converted book takes, on purpose: a warning that comes early costs a click, and one that comes
 * late costs a conversion that stops half-way.
 */
export const bytesPerPage = 1024 * 1024;

/** Less than this left is said even for a small queue: the drive is about to be full whatever is run. */
export const smallestRoom = 1024 * 1024 * 1024;

/**
 * What is left to write on the drives the app works on (ADR 0060). A drive whose room cannot be said
 * is null, and says nothing. When both places are on one drive its room is not there twice.
 */
export interface WorkingSpace {
  /** Where volumes are built while the app converts. */
  readonly scratchFreeBytes: number | null;
  /** Where finished books wait until they are saved. */
  readonly pendingFreeBytes: number | null;
  /** Whether the two places share a drive, so that what is made in one is room taken from the other. */
  readonly sameDrive: boolean;
}

/** What a run is taken to need in each place. */
export interface RoomNeeded {
  readonly scratchBytes: number;
  readonly pendingBytes: number;
}

/** What is short: the room that is left on a drive, and what the queue would need of it. */
export interface LowSpace {
  readonly freeBytes: number;
  readonly neededBytes: number;
}

/**
 * The pages a row would make books of: the chapters of a folder that are in a volume (all of them
 * when the folder is converted whole), the volumes still to be made of a library.
 */
export function pagesToMake(row: InspectedRow, process: ProcessMode): number {
  if (row.kind === 'folder') {
    const { mapping } = row;
    if (mapping === undefined) return 0;
    const inVolumes = new Set(mapping.volumes.flatMap((volume) => volume.chapterIds));
    return mapping.chapters
      .filter((chapter) => process === 'convert-only' || inVolumes.has(chapter.id))
      .reduce((total, chapter) => total + chapter.pageCount, 0);
  }
  if (row.kind === 'library') {
    return (row.titles ?? [])
      .filter((title) => title.outcome?.status !== 'done')
      .flatMap((title) => title.volumes)
      .reduce((total, volume) => total + volume.pageCount, 0);
  }
  // A comic file is converted as it is: how many pages it holds is not known before it is opened.
  return 0;
}

/**
 * What a run of the queue is taken to need. Volumes are built only where a process joins chapters;
 * a book waits in the other place whatever the process is.
 */
export function roomNeeded(rows: readonly QueueRow[], mode: ProcessMode): RoomNeeded {
  let scratchBytes = 0;
  let pendingBytes = 0;
  for (const { row, mode: process } of runnableRows(rows, mode)) {
    const bytes = pagesToMake(row, process) * bytesPerPage;
    pendingBytes += bytes;
    if (process !== 'convert-only') scratchBytes += bytes;
  }
  return { scratchBytes, pendingBytes };
}

/**
 * The drive that is short for a run, or null when there is room. A drive is short when it has less
 * than the run needs of it or less than `smallestRoom`; when the places share a drive, what each
 * needs is taken from the same room. Of two drives that are short, the one with less left is said.
 * A drive the run does not use is never short, so a queue of comic files, whose pages are not
 * counted, is never short.
 */
export function lowSpace(space: WorkingSpace, needed: RoomNeeded): LowSpace | null {
  const drives = space.sameDrive
    ? [
        {
          freeBytes: space.pendingFreeBytes,
          neededBytes: needed.scratchBytes + needed.pendingBytes,
        },
      ]
    : [
        { freeBytes: space.scratchFreeBytes, neededBytes: needed.scratchBytes },
        { freeBytes: space.pendingFreeBytes, neededBytes: needed.pendingBytes },
      ];
  let shortest: LowSpace | null = null;
  for (const { freeBytes, neededBytes } of drives) {
    if (neededBytes === 0 || freeBytes === null) continue;
    if (freeBytes >= Math.max(neededBytes, smallestRoom)) continue;
    if (shortest === null || freeBytes < shortest.freeBytes) shortest = { freeBytes, neededBytes };
  }
  return shortest;
}
