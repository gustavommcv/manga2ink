import { describe, expect, it } from 'vitest';

import type { InspectedRow, QueueRow } from '@/domain/input-queue';
import { createMappingDraft } from '@/domain/mapping';
import {
  bytesPerPage,
  lowSpace,
  pagesToMake,
  roomNeeded,
  smallestRoom,
  type WorkingSpace,
} from '@/domain/working-space';

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;

const chapters = [
  { id: 'c1', name: 'Chapter 1', path: '/m/1', pageCount: 100, chapter: 1 },
  { id: 'c2', name: 'Chapter 2', path: '/m/2', pageCount: 50, chapter: 2 },
  { id: 'c3', name: 'Chapter 3', path: '/m/3', pageCount: 30, chapter: 3 },
] as const;

/** Two chapters in a volume and one left out: 150 pages go into books, 180 are in the folder. */
const folder: InspectedRow = {
  id: 'a',
  kind: 'folder',
  displayName: 'Work',
  displayPath: '/m/Work',
  state: 'inspected',
  sessionId: 's-a',
  confirmed: true,
  mapping: createMappingDraft({
    mangaTitle: 'Work',
    chapters,
    volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
  }),
};
const cbz: InspectedRow = {
  id: 'b',
  kind: 'cbz',
  displayName: 'One.cbz',
  displayPath: '/m/One.cbz',
  state: 'inspected',
  sessionId: 's-b',
  confirmed: false,
};
const library: InspectedRow = {
  id: 'l',
  kind: 'library',
  displayName: 'Shelf',
  displayPath: '/m/Shelf',
  state: 'inspected',
  sessionId: 's-l',
  confirmed: false,
  titles: [
    {
      title: 'Made',
      draft: createMappingDraft({ mangaTitle: 'Made', chapters: [] }),
      volumes: [{ name: 'Made 1', pageCount: 400 }],
      outcome: { status: 'done' },
    },
    {
      title: 'To make',
      draft: createMappingDraft({ mangaTitle: 'To make', chapters: [] }),
      volumes: [
        { name: 'To make 1', pageCount: 20 },
        { name: 'To make 2', pageCount: 10 },
      ],
    },
    {
      title: 'Waiting',
      draft: createMappingDraft({ mangaTitle: 'Waiting', chapters: [] }),
      volumes: [],
    },
  ],
};

const pages = (count: number): number => count * bytesPerPage;

describe('what a run is taken to need', () => {
  it('is a megabyte a page', () => {
    expect(bytesPerPage).toBe(MiB);
  });

  it('counts the chapters of a folder that are in a volume, in the place volumes are built and the place books wait', () => {
    expect(roomNeeded([folder], 'bind-and-convert')).toEqual({
      scratchBytes: pages(150),
      pendingBytes: pages(150),
    });
  });

  it('counts a series with no volumes only when it is made into one book', () => {
    const series = {
      ...folder,
      mapping: createMappingDraft({ mangaTitle: 'Work', chapters }),
    };

    expect(roomNeeded([series], 'bind-and-convert')).toEqual({ scratchBytes: 0, pendingBytes: 0 });
    expect(roomNeeded([series], 'bind-and-convert', { singleBook: true })).toEqual({
      scratchBytes: pages(180),
      pendingBytes: pages(180),
    });
  });

  it('counts every chapter of a folder converted whole, and builds no volume for it', () => {
    expect(roomNeeded([folder], 'convert-only')).toEqual({
      scratchBytes: 0,
      pendingBytes: pages(180),
    });
  });

  it('counts the volumes of a library that are not saved yet, not the ones that are or the title with none', () => {
    expect(roomNeeded([library], 'bind-and-convert')).toEqual({
      scratchBytes: pages(30),
      pendingBytes: pages(30),
    });
  });

  it('does not count the pages of a comic file, which are not known before it is opened', () => {
    expect(roomNeeded([cbz], 'bind-and-convert')).toEqual({ scratchBytes: 0, pendingBytes: 0 });
  });

  it('adds the rows a run would process and nothing else', () => {
    const reading: QueueRow = {
      id: 'r',
      kind: 'folder',
      displayName: 'Reading',
      displayPath: '/m/Reading',
      state: 'inspecting',
    };
    const unassigned: InspectedRow = {
      ...folder,
      id: 'u',
      confirmed: false,
      mapping: createMappingDraft({ mangaTitle: 'Work', chapters, volumes: [] }),
    };

    expect(roomNeeded([folder, library, cbz, reading, unassigned], 'bind-and-convert')).toEqual({
      scratchBytes: pages(180),
      pendingBytes: pages(180),
    });
  });

  it('counts a folder without a mapping as no pages', () => {
    const bare: InspectedRow = { ...folder, mapping: undefined };

    expect(roomNeeded([bare], 'convert-only')).toEqual({ scratchBytes: 0, pendingBytes: 0 });
  });

  it('is nothing for an empty queue', () => {
    expect(roomNeeded([], 'bind-and-convert')).toEqual({ scratchBytes: 0, pendingBytes: 0 });
  });
});

describe('the pages a row would make books of', () => {
  it('is none for a library that has not been read into titles', () => {
    const unread: InspectedRow = { ...library, titles: undefined };

    expect(pagesToMake(unread, 'bind-and-convert')).toBe(0);
  });
});

describe('whether a run is short of room', () => {
  const space = (overrides: Partial<WorkingSpace> = {}): WorkingSpace => ({
    scratchFreeBytes: 50 * GiB,
    pendingFreeBytes: 50 * GiB,
    sameDrive: false,
    ...overrides,
  });
  const needing = (scratchBytes: number, pendingBytes = scratchBytes) => ({
    scratchBytes,
    pendingBytes,
  });

  it('is not when both drives have more than the run needs and more than the smallest room', () => {
    expect(lowSpace(space(), needing(pages(2000)))).toBeNull();
  });

  it('says the drive that has less than the run needs of it', () => {
    expect(lowSpace(space({ pendingFreeBytes: 3 * GiB }), needing(5 * GiB))).toEqual({
      freeBytes: 3 * GiB,
      neededBytes: 5 * GiB,
    });
  });

  it('says a drive with less than the smallest room even for a small run', () => {
    expect(lowSpace(space({ scratchFreeBytes: 500 * MiB }), needing(pages(10)))).toEqual({
      freeBytes: 500 * MiB,
      neededBytes: pages(10),
    });
    expect(smallestRoom).toBe(GiB);
  });

  it('is not short with exactly the room that is needed, when that is the smallest room or more', () => {
    expect(lowSpace(space({ pendingFreeBytes: 2 * GiB }), needing(2 * GiB))).toBeNull();
    expect(lowSpace(space({ pendingFreeBytes: GiB }), needing(pages(10)))).toBeNull();
  });

  it('says the one with less left when both are short', () => {
    expect(
      lowSpace(space({ scratchFreeBytes: 2 * GiB, pendingFreeBytes: 700 * MiB }), needing(4 * GiB)),
    ).toEqual({ freeBytes: 700 * MiB, neededBytes: 4 * GiB });
    expect(
      lowSpace(space({ scratchFreeBytes: 700 * MiB, pendingFreeBytes: 2 * GiB }), needing(4 * GiB)),
    ).toEqual({ freeBytes: 700 * MiB, neededBytes: 4 * GiB });
  });

  it('takes what both places need from one drive when they share it', () => {
    const shared = space({ sameDrive: true, pendingFreeBytes: 6 * GiB, scratchFreeBytes: 6 * GiB });

    expect(lowSpace(shared, needing(5 * GiB))).toEqual({
      freeBytes: 6 * GiB,
      neededBytes: 10 * GiB,
    });
    expect(lowSpace({ ...shared, sameDrive: false }, needing(5 * GiB))).toBeNull();
  });

  it('says nothing of a drive whose room cannot be said', () => {
    expect(
      lowSpace(space({ scratchFreeBytes: null, pendingFreeBytes: null }), needing(100 * GiB)),
    ).toBeNull();
  });

  it('says nothing of a drive the run does not use, however little it has', () => {
    expect(lowSpace(space({ scratchFreeBytes: 10 * MiB }), needing(0, pages(10)))).toBeNull();
    expect(lowSpace(space({ pendingFreeBytes: 10 * MiB }), needing(pages(10), 0))).toBeNull();
  });
});
