import { describe, expect, it } from 'vitest';

import { canonicalLanguageTag } from '@/domain/book-details';
import { warningNotices } from '@/domain/book-warnings';
import { plannedVolumeBookName } from '@/domain/conversion';
import {
  describeRow,
  emptyQueue,
  type InspectedRow,
  type QueueInput,
  type QueueRow,
  queueReducer,
  type ReadTitle,
} from '@/domain/input-queue';
import { createMappingDraft } from '@/domain/mapping';
import {
  createMappingHistory,
  dispatchMappingCommand,
  redoMappingCommand,
  undoMappingCommand,
} from '@/domain/mapping-editor';
import {
  defaultMangapressSettings,
  resolveDeviceProfileFallback,
  validateMangapressSettings,
} from '@/domain/output-profile';
import { finishRunReport } from '@/domain/run-report';

// More of what the mutation run found no test noticing, for the domain layer.

const chapters = [
  { id: 'c1', name: 'Chapter 1', path: '/m/1', pageCount: 2, chapter: 1 },
  { id: 'c2', name: 'Chapter 2', path: '/m/2', pageCount: 2, chapter: 2 },
] as const;
const mapping = createMappingDraft({ mangaTitle: 'Manga', chapters });

const input = (id: string, kind: 'folder' | 'cbz' = 'folder'): QueueInput => ({
  id,
  kind,
  displayName: `Input ${id}`,
  displayPath: `D:\\Manga\\${id}`,
});

const title = (name: string): ReadTitle => ({
  title: name,
  draft: createMappingDraft({ mangaTitle: name, chapters }),
  volumes: [{ name: `${name} - Vol.01.cbz`, pageCount: 4 }],
});

function library(id: string, ...titles: ReadTitle[]): QueueRow[] {
  return [
    ...queueReducer(queueReducer(emptyQueue, { type: 'add', inputs: [input(id)] }), {
      type: 'inspected',
      id,
      sessionId: `session-${id}`,
      kind: 'library',
      titles,
    }),
  ];
}

describe('a failed read', () => {
  it('is only for the row that failed, among others being read', () => {
    const rows = queueReducer(emptyQueue, { type: 'add', inputs: [input('a'), input('b')] });

    const after = queueReducer(rows, { type: 'inspect-failed', id: 'a', message: 'Not readable.' });

    expect(after.map((row) => row.state)).toEqual(['unreadable', 'inspecting']);
  });

  it('says CBZ for a file and Folder for a folder', () => {
    const rows = queueReducer(
      queueReducer(emptyQueue, { type: 'add', inputs: [input('a', 'cbz'), input('b')] }),
      { type: 'inspect-failed', id: 'a', message: 'Not readable.' },
    );

    expect(describeRow(rows[0]!, 'bind-and-convert').detail).toBe('CBZ');
    expect(
      describeRow(
        queueReducer(rows, { type: 'inspect-failed', id: 'b', message: 'x' })[1]!,
        'bind-and-convert',
      ).detail,
    ).toBe('Folder');
  });
});

describe('a library among others in the queue', () => {
  it('is the only one a re-read, a result or typed details reach', () => {
    const rows = [...library('a', title('Good')), ...library('b', title('Good'))];
    const read = queueReducer(rows, {
      type: 'library-planned',
      id: 'a',
      titles: [title('Good'), title('New')],
    });
    const resulted = queueReducer(read, {
      type: 'library-results',
      id: 'a',
      results: [{ title: 'Good', outcome: { status: 'done' } }],
    });
    const typed = queueReducer(resulted, {
      type: 'set-title-details',
      id: 'a',
      title: 'Good',
      details: { author: 'Someone' },
    });

    const second = typed[1] as InspectedRow;
    expect(second.titles?.map((entry) => entry.title)).toEqual(['Good']);
    expect(second.titles?.[0]?.outcome).toBeUndefined();
    expect(second.titles?.[0]?.details).toBeUndefined();
    const first = typed[0] as InspectedRow;
    expect(first.titles?.map((entry) => entry.title)).toEqual(['Good', 'New']);
  });

  it('is not changed by a re-read of a row that was only a folder', () => {
    const folder = queueReducer(queueReducer(emptyQueue, { type: 'add', inputs: [input('a')] }), {
      type: 'inspected',
      id: 'a',
      sessionId: 'session-a',
      mapping,
    });

    const after = queueReducer(folder, {
      type: 'library-planned',
      id: 'a',
      titles: [title('Surprise')],
    });

    expect(after[0]).not.toHaveProperty('titles');
  });

  it('says only that no manga was found when it has no titles, with nothing left out to add', () => {
    const [row] = library('a');

    const view = describeRow(row!, 'bind-and-convert');

    expect(view.chip).toBe('Not recognized');
    expect(view.note).toBe('mangabind found no manga in this folder.');
  });
});

describe('a folder whose grouping was accepted with no volume at all', () => {
  it('is still one that needs volumes', () => {
    let rows = queueReducer(queueReducer(emptyQueue, { type: 'add', inputs: [input('a')] }), {
      type: 'inspected',
      id: 'a',
      sessionId: 'session-a',
      mapping,
    });
    rows = queueReducer(rows, { type: 'confirm-mapping', id: 'a', mapping });

    const view = describeRow(rows[0]!, 'bind-and-convert');

    expect(view.chip).toBe('Needs volumes');
    expect(view.runnable).toBe(false);
  });
});

describe('a language tag of three letters inside it', () => {
  it('is kept in lowercase, as only a two-letter region or a script is written otherwise', () => {
    expect(canonicalLanguageTag('zh-yue-hk')).toBe('zh-yue-HK');
    expect(canonicalLanguageTag('es-419')).toBe('es-419');
    expect(canonicalLanguageTag('sr-latn-rs')).toBe('sr-Latn-RS');
    expect(canonicalLanguageTag('en-1234')).toBe('en-1234');
  });
});

describe('the name of a joined volume’s book', () => {
  it('drops only the extension at the end', () => {
    expect(plannedVolumeBookName({ name: 'My.cbz.backup.cbz' }, undefined, 'epub')).toBe(
      'My.cbz.backup.epub',
    );
    expect(plannedVolumeBookName({ name: 'Vol.CBZ' }, undefined, 'pdf')).toBe('Vol.pdf');
  });
});

describe('what a run says of the rows it did not get to', () => {
  it('leaves out of it a row that was attempted, whatever came of it', () => {
    const rows = [
      ...queueReducer(queueReducer(emptyQueue, { type: 'add', inputs: [input('a')] }), {
        type: 'inspected',
        id: 'a',
        sessionId: 'session-a',
        mapping,
      }),
    ];

    const report = finishRunReport({
      rows,
      mode: 'bind-and-convert',
      settled: [],
      attempted: new Set(['a']),
      completedTitles: new Map(),
    });

    // It needed volumes and was attempted: the run said what it had to say about it already.
    expect(report.outcomes).toEqual([]);
    expect(report.completedRowIds).toEqual([]);
  });
});

describe('going back and forth through the editor’s history', () => {
  it('undoes one step at a time and redoes them in the same order', () => {
    let history = createMappingHistory(createMappingDraft({ mangaTitle: 'M', chapters }));
    history = dispatchMappingCommand(history, { type: 'add-volume', id: 'v1', number: '1' });
    history = dispatchMappingCommand(history, { type: 'add-volume', id: 'v2', number: '2' });
    history = dispatchMappingCommand(history, { type: 'add-volume', id: 'v3', number: '3' });

    const twice = undoMappingCommand(undoMappingCommand(history));
    expect(twice.present.volumes.map((volume) => volume.id)).toEqual(['v1']);
    expect(twice.past).toHaveLength(1);
    expect(twice.future.map((draft) => draft.volumes.length)).toEqual([2, 3]);

    const once = redoMappingCommand(twice);
    expect(once.present.volumes.map((volume) => volume.id)).toEqual(['v1', 'v2']);
    expect(once.past).toHaveLength(2);
    expect(once.future.map((draft) => draft.volumes.length)).toEqual([3]);
    const all = redoMappingCommand(once);
    expect(all.present.volumes).toHaveLength(3);
    expect(all.future).toEqual([]);
    // Nothing to undo or redo changes nothing.
    expect(redoMappingCommand(all)).toBe(all);
  });
});

describe('the options that are set to start with', () => {
  it('start with the compact PNG and the cover as it is', () => {
    expect(defaultMangapressSettings.pngLegacy).toBe(false);
    expect(defaultMangapressSettings.coverFill).toBe(false);
  });

  it('give no other device while no device is offered, and the default or the first when one is', () => {
    expect(resolveDeviceProfileFallback('GONE', [])).toBeUndefined();
    expect(
      resolveDeviceProfileFallback('GONE', [
        { code: 'K11', name: 'Kindle 11' },
        { code: 'KPW6', name: 'Kindle Paperwhite 6' },
      ]),
    ).toEqual({ code: 'KPW6', name: 'Kindle Paperwhite 6' });
    expect(resolveDeviceProfileFallback('GONE', [{ code: 'K11', name: 'Kindle 11' }])).toEqual({
      code: 'K11',
      name: 'Kindle 11',
    });
  });

  it('say which of the two sizes is missing for the custom device', () => {
    const onlyHeight = validateMangapressSettings(
      { ...defaultMangapressSettings, deviceProfile: 'OTHER', customHeight: 800 },
      'cbz',
    );
    const onlyWidth = validateMangapressSettings(
      { ...defaultMangapressSettings, deviceProfile: 'OTHER', customWidth: 600 },
      'cbz',
    );

    expect(onlyHeight.map((issue) => issue.field)).toEqual(['customWidth']);
    expect(onlyWidth.map((issue) => issue.field)).toEqual(['customHeight']);
  });
});

describe('a warning that is the same kind', () => {
  it('is one notice for every book it is about, whatever the book’s own sentence says', () => {
    const notices = warningNotices([
      { name: 'One.cbz', warnings: [{ code: 'page_entries_too_large', message: 'one page' }] },
      { name: 'Two.cbz', warnings: [{ code: 'page_entries_too_large', message: 'two pages' }] },
      { name: 'Three.cbz' },
    ]);

    expect(notices).toHaveLength(1);
    expect(notices[0]?.where).toContain('One.cbz');
    expect(notices[0]?.where).toContain('Two.cbz');
  });
});
