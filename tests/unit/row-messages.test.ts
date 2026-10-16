import { describe, expect, it } from 'vitest';

import { describeRow, type InspectedRow, type QueueRow } from '@/domain/input-queue';
import { createMappingDraft } from '@/domain/mapping';
import { message, raw } from '@/domain/message';

const chapters = [
  { id: 'c1', name: 'Chapter 1', path: '/m/1', pageCount: 2, chapter: 1 },
  { id: 'c2', name: 'Chapter 2', path: '/m/2', pageCount: 2, chapter: 2 },
] as const;

const folder = (overrides: Partial<InspectedRow> = {}): InspectedRow => ({
  id: 'a',
  kind: 'folder',
  displayName: 'Work',
  displayPath: '/m/Work',
  state: 'inspected',
  sessionId: 's',
  confirmed: false,
  mapping: createMappingDraft({
    mangaTitle: 'Work',
    chapters,
    volumes: [{ id: 'v1', number: '1', chapterIds: ['c1', 'c2'] }],
  }),
  ...overrides,
});

describe('what a row says, by code', () => {
  it('says its status, its line and its notes as messages and not as sentences', () => {
    const view = describeRow(folder({ unrecognized: ['Extras'] }), 'bind-and-convert');

    expect(view.chip).toEqual(message('queue.chip.volumes', { count: 1 }));
    expect(view.detail).toEqual(
      message('queue.detail.folderChapters', { chapters: 2, grouping: 'plain' }),
    );
    expect(view.notes).toEqual([
      message('queue.note.unrecognizedChapters', { names: ['Extras'], again: 'folder' }),
    ]);
  });

  it('says why a row could not be read in the words of whoever said it', () => {
    const row: QueueRow = {
      id: 'b',
      kind: 'cbz',
      displayName: 'Broken.cbz',
      displayPath: '/m/Broken.cbz',
      state: 'unreadable',
      message: raw('The file could not be read.'),
    };

    expect(describeRow(row, 'bind-and-convert').notes).toEqual([
      raw('The file could not be read.'),
    ]);
  });

  it('says nothing more when there is nothing more to say', () => {
    expect(describeRow(folder(), 'bind-and-convert').notes).toEqual([]);
  });
});
