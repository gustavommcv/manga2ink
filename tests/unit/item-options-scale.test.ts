import { describe, expect, it, vi } from 'vitest';

import {
  emptyQueue,
  type InspectedRow,
  type QueueInput,
  queueReducer,
  type ReadTitle,
} from '@/domain/input-queue';
import type { BookFormat } from '@/domain/conversion';
import { effectiveOptions, type RunOptions } from '@/domain/item-options';
import { createMappingDraft } from '@/domain/mapping';
import { defaultMangapressSettings, type MangapressSettings } from '@/domain/output-profile';
import { libraryConversionCommandSchema } from '@/shared/workflow-contract';

import { dependencies, numbered, openLibrary } from './support/conversion-workflow';

const queue: RunOptions = { settings: defaultMangapressSettings, format: 'cbz' };
const pad = (index: number): string => String(index).padStart(4, '0');

/** What title `index` sets for itself, or nothing for most: a different value in each. */
function ownOf(
  index: number,
): { settings: typeof defaultMangapressSettings; format: 'epub' | 'pdf' } | undefined {
  if (index % 3 !== 0) return undefined;
  return {
    settings: {
      ...defaultMangapressSettings,
      jpegQuality: 40 + (index % 60),
      webtoon: index % 6 === 0,
    },
    format: index % 2 === 0 ? 'epub' : 'pdf',
  };
}

function readTitles(count: number): readonly ReadTitle[] {
  return Array.from({ length: count }, (_, index) => ({
    title: `Title ${pad(index)}`,
    draft: createMappingDraft({
      mangaTitle: `Title ${pad(index)}`,
      chapters: [
        { id: 'c1', name: 'Chapter 1', path: `/m/${pad(index)}`, pageCount: 2, chapter: 1 },
      ],
    }),
    volumes: [{ name: `Title ${pad(index)} - Vol.01.cbz`, pageCount: 2 }],
  }));
}

describe('options of their own at the size of a large library', () => {
  const folder: QueueInput = {
    id: 'lib',
    kind: 'folder',
    displayName: 'Huge Library',
    displayPath: 'D:\\Manga\\Huge Library',
  };

  it('stay with the title they were set for among a thousand, and survive the library being read again', () => {
    const count = 1000;
    const started = performance.now();
    let rows = queueReducer(queueReducer(emptyQueue, { type: 'add', inputs: [folder] }), {
      type: 'inspected',
      id: 'lib',
      sessionId: 'session',
      kind: 'library',
      titles: readTitles(count),
    });
    for (let index = 0; index < count; index += 1) {
      const own = ownOf(index);
      if (own === undefined) continue;
      rows = queueReducer(rows, {
        type: 'set-title-options',
        id: 'lib',
        title: `Title ${pad(index)}`,
        options: {
          settings: {
            jpegQuality: own.settings.jpegQuality ?? null,
            webtoon: own.settings.webtoon,
          },
          format: own.format,
        },
      });
    }
    rows = queueReducer(rows, { type: 'library-planned', id: 'lib', titles: readTitles(count) });

    const titles = (rows[0] as InspectedRow).titles ?? [];
    expect(titles).toHaveLength(count);
    titles.forEach((title, index) => {
      const own = ownOf(index);
      if (own === undefined) {
        expect(title).not.toHaveProperty('options');
        return;
      }
      const run = effectiveOptions(queue, title.options, false);
      expect(run.format).toBe(own.format);
      expect(run.settings.jpegQuality).toBe(own.settings.jpegQuality);
      expect(run.settings.webtoon).toBe(own.settings.webtoon);
      // Everything else is the queue's.
      expect({ ...run.settings, jpegQuality: undefined, webtoon: false }).toEqual({
        ...defaultMangapressSettings,
        jpegQuality: undefined,
        webtoon: false,
      });
    });
    // A loose bound: it is the shape that matters (each change touches the list once), not a benchmark.
    expect(performance.now() - started).toBeLessThan(10_000);
  });

  it('are accepted by the contract for as many titles as a library can hold, with every field', () => {
    const titleOptions = Array.from({ length: 1000 }, (_, index) => ({
      title: `Title ${pad(index)}`,
      settings: { ...defaultMangapressSettings, jpegQuality: 40 + (index % 60) },
      format: 'epub' as const,
    }));
    const started = performance.now();

    const parsed = libraryConversionCommandSchema.parse({
      jobId: 'job',
      sessionId: 'session',
      libraryId: 'library',
      settings: defaultMangapressSettings,
      format: 'cbz',
      titleOptions,
    });

    expect(parsed.titleOptions).toHaveLength(1000);
    expect(parsed.titleOptions?.[999]?.settings.jpegQuality).toBe(40 + (999 % 60));
    expect(performance.now() - started).toBeLessThan(5_000);
  });

  it('reach each title’s books when many titles are converted in parallel', async () => {
    const count = 150;
    const ports = dependencies();
    ports.bindBatch.mockResolvedValue({
      workspaceId: 'batch-workspace',
      titles: Array.from({ length: count }, (_, index) => ({
        title: `Title ${pad(index)}`,
        status: 'completed' as const,
        volumes: numbered([`/work/batch/t${pad(index)}-1.cbz`, `/work/batch/t${pad(index)}-2.cbz`]),
        issues: [],
      })),
      issues: [],
    });
    const { workflow, sessionId } = await openLibrary(ports, 4);
    const titleOptions: { title: string; settings: MangapressSettings; format: BookFormat }[] =
      Array.from({ length: count }, (_, index) => ({ index, own: ownOf(index) }))
        .filter((entry) => entry.own !== undefined)
        .map(({ index, own }) => ({
          title: `Title ${pad(index)}`,
          settings: own?.settings ?? defaultMangapressSettings,
          format: own?.format ?? 'cbz',
        }));

    const outcomes = await workflow.convertLibrary(
      {
        sessionId,
        libraryPath: '/output',
        settings: defaultMangapressSettings,
        format: 'cbz',
        titleOptions,
      },
      { onProgress: vi.fn() },
    );

    expect(outcomes).toHaveLength(count);
    expect(outcomes.every((outcome) => outcome.status === 'done')).toBe(true);
    expect(ports.convert).toHaveBeenCalledTimes(count * 2);
    // Found by the volume's own file, since parallel conversions finish in any order.
    for (const [request] of ports.convert.mock.calls) {
      const index = Number(/t(\d{4})-/u.exec(request.inputPath)?.[1]);
      const own = ownOf(index);
      expect(request.format).toBe(own?.format ?? 'cbz');
      expect(request.settings).toEqual(own?.settings ?? defaultMangapressSettings);
    }
  });
});
