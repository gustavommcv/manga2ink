import { describe, expect, it, vi } from 'vitest';

import { ConversionWorkflow } from '@/application/workflows/conversion-workflow';
import type { ConversionArtifact } from '@/domain/conversion';
import { defaultMangapressSettings } from '@/domain/output-profile';

import { dependencies, folder, mappedDraft } from './support/conversion-workflow';

/**
 * A folder of `volumes` books, converted by a workflow whose limit is `limit`, with every
 * conversion held until the test finishes it. The tool is never run: what is looked at is how many
 * conversions are in progress at the same time, and in what order the books come out.
 */
function titleOf(volumes: number, limit: () => number) {
  const paths = Array.from(
    { length: volumes },
    (_unused, index) => `/work/volume-${String(index + 1)}.cbz`,
  );
  const ports = dependencies({ volumePaths: paths });
  const running = new Map<number, (artifact: ConversionArtifact) => void>();
  const signals = new Map<number, AbortSignal | undefined>();
  const meter = { active: 0, peak: 0 };
  ports.convert.mockImplementation(
    (request, options) =>
      new Promise((resolve, reject) => {
        const number = paths.indexOf(request.inputPath) + 1;
        meter.active += 1;
        meter.peak = Math.max(meter.peak, meter.active);
        signals.set(number, options.signal);
        running.set(number, (artifact) => {
          meter.active -= 1;
          running.delete(number);
          resolve(artifact);
        });
        options.signal?.addEventListener('abort', () => {
          meter.active -= 1;
          running.delete(number);
          reject(options.signal?.reason as Error);
        });
      }),
  );
  let nextId = 0;
  const workflow = new ConversionWorkflow(
    ports.binding,
    ports.conversion,
    () => `id-${String(++nextId)}`,
    ports.bookFiles,
    limit,
  );
  const published: string[] = [];
  /** Starts converting the title; the promise is for the whole run, so it is only awaited once every book is finished. */
  const start = (signal?: AbortSignal): Promise<readonly ConversionArtifact[]> =>
    workflow.inspect(folder).then((inspected) =>
      workflow.convert(
        {
          sessionId: inspected.sessionId,
          libraryPath: '/library',
          settings: defaultMangapressSettings,
          format: 'epub',
          mapping: mappedDraft(),
        },
        {
          onProgress: vi.fn(),
          onArtifact: (artifact) => published.push(artifact.id),
          ...(signal === undefined ? {} : { signal }),
        },
      ),
    );
  const finish = (number: number): void => {
    running.get(number)?.({
      id: `artifact-${String(number)}`,
      name: `volume-${String(number)}.epub`,
      path: `/library/volume-${String(number)}.epub`,
      bytes: 100,
      format: 'epub',
      title: 'Trusted Manga',
      author: 'Unknown',
    });
  };
  /** Finishes the highest-numbered conversion in progress, `count` times: the last started ends first. */
  const finishBackwards = async (count: number): Promise<void> => {
    for (let finished = 0; finished < count; finished += 1) {
      await vi.waitFor(() => {
        expect(running.size).toBeGreaterThan(0);
      });
      finish(Math.max(...running.keys()));
    }
  };
  return { ports, running, signals, meter, published, start, finish, finishBackwards };
}

const ids = (numbers: readonly number[]): string[] =>
  numbers.map((number) => `artifact-${String(number)}`);

describe('how many volumes of a title the workflow converts at once', () => {
  it.each([1, 2, 3, 4, 6, 8])(
    'is never more than the %i it was given, and the books come out in the order of the volumes',
    async (limit) => {
      // Two more volumes than the limit, so that the pool is full and then has to go on.
      const volumes = limit + 2;
      const title = titleOf(volumes, () => limit);
      const numbers = Array.from({ length: volumes }, (_unused, index) => index + 1);

      const run = title.start();
      await vi.waitFor(() => {
        expect(title.running.size).toBe(limit);
      });
      // The last to start ends first each time, so the books finish out of order.
      await title.finishBackwards(volumes);
      const artifacts = await run;

      expect(title.meter.peak).toBe(limit);
      expect(artifacts.map((artifact) => artifact.id)).toEqual(ids(numbers));
      expect(title.published).toEqual(ids(numbers));
    },
  );

  it('is asked once for each title, when the title starts, and not for each volume', async () => {
    const limit = vi.fn(() => 2);
    const title = titleOf(4, limit);

    const run = title.start();
    await vi.waitFor(() => {
      expect(title.running.size).toBe(2);
    });
    expect(limit).toHaveBeenCalledOnce();
    await title.finishBackwards(4);
    await run;

    expect(limit).toHaveBeenCalledOnce();
  });

  it('is the one given when a title started, whatever is chosen while it converts, and the next title is asked again', async () => {
    let chosen = 1;
    const title = titleOf(3, () => chosen);

    const first = title.start();
    await vi.waitFor(() => {
      expect(title.running.size).toBe(1);
    });
    // A person chooses three while the first title converts: it is for the next one.
    chosen = 3;
    await title.finishBackwards(3);
    await first;
    expect(title.meter.peak).toBe(1);

    title.meter.peak = 0;
    const second = title.start();
    await vi.waitFor(() => {
      expect(title.running.size).toBe(3);
    });
    await title.finishBackwards(3);
    await second;
    expect(title.meter.peak).toBe(3);
  });

  it.each([2, 3, 6])(
    'stops all %i that are in progress when the person cancels, and starts no later volume',
    async (limit) => {
      const title = titleOf(limit + 2, () => limit);
      const controller = new AbortController();

      const run = title.start(controller.signal);
      await vi.waitFor(() => {
        expect(title.running.size).toBe(limit);
      });
      const inProgress = [...title.signals.values()];
      controller.abort(new DOMException('Cancelled by user', 'AbortError'));

      await expect(run).rejects.toMatchObject({ name: 'AbortError' });
      expect(inProgress).toHaveLength(limit);
      expect(inProgress.every((signal) => signal?.aborted === true)).toBe(true);
      expect(title.ports.convert).toHaveBeenCalledTimes(limit);
      expect(title.meter.active).toBe(0);
    },
  );

  it.each([0, -2, Number.NaN, Number.POSITIVE_INFINITY, 2.9])(
    'still converts every volume, never fewer than one at a time, for a limit of %f',
    async (limit) => {
      const title = titleOf(3, () => limit);

      const run = title.start();
      await vi.waitFor(() => {
        expect(title.running.size).toBeGreaterThan(0);
      });
      await title.finishBackwards(3);
      const artifacts = await run;

      expect(artifacts.map((artifact) => artifact.id)).toEqual(ids([1, 2, 3]));
      // A limit of 2.9 counts as 2; anything that is not a number or is below one counts as 1.
      expect(title.meter.peak).toBe(limit === 2.9 ? 2 : 1);
    },
  );
});
