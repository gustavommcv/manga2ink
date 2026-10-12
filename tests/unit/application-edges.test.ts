import { describe, expect, it, vi } from 'vitest';

import { ProcessStartError } from '@/application/ports/process-runner';
import type { SettingsStorePort } from '@/application/ports/settings-store';
import { trustedMapping } from '@/application/workflows/input-sessions';
import { PreferencesWorkflow } from '@/application/workflows/preferences';
import { produceVolumes } from '@/application/workflows/volume-production';
import type { ConversionArtifact, ConversionProgress } from '@/domain/conversion';
import { ConversionWorkflowError } from '@/domain/conversion';
import { createMappingDraft } from '@/domain/mapping';
import { defaultPreferences } from '@/domain/preferences';

// More of what the mutation run found no test noticing, for the application layer.

type Report = (progress: ConversionProgress) => void;

function book(index: number): ConversionArtifact {
  return {
    id: `book-${String(index + 1)}`,
    name: `Volume ${String(index + 1)}.epub`,
    path: `/pending/Volume ${String(index + 1)}.epub`,
    bytes: 100,
    format: 'epub',
    title: 'Manga',
    author: 'Unknown',
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

const settle = (): Promise<void> => new Promise((done) => setTimeout(done, 0));

describe('what is said while several volumes are made at once', () => {
  it('names the volume each update is about, how many are done, and what each has made so far', async () => {
    const jobs = [
      deferred<ConversionArtifact>(),
      deferred<ConversionArtifact>(),
      deferred<ConversionArtifact>(),
    ];
    const reports: Report[] = [];
    const updates: ConversionProgress[] = [];
    const run = produceVolumes(
      3,
      (index, _signal, report) => {
        reports[index] = report;
        return jobs[index]!.promise;
      },
      {
        maxParallelConversions: 3,
        sequential: false,
        onProgress: (update) => updates.push(structuredClone(update)),
      },
    );

    // Before anything is made.
    expect(updates[0]).toMatchObject({
      stage: 'processing',
      volume: '1 of 3',
      message: '0 of 3 volumes converted.',
      completed: 0,
      total: 3,
    });
    expect(updates[0]).not.toHaveProperty('title');
    expect(updates[0]?.volumes).toEqual([
      { number: 1, status: 'waiting' },
      { number: 2, status: 'waiting' },
      { number: 3, status: 'waiting' },
    ]);

    // Half the pages of the second volume: half a volume of the three.
    reports[1]!({ stage: 'processing', message: 'Page', completed: 1, total: 2 });
    expect(updates.at(-1)).toMatchObject({ volume: '2 of 3', completed: 0.5, total: 3 });
    expect(updates.at(-1)?.volumes?.[1]).toStrictEqual({
      number: 2,
      status: 'processing',
      completed: 1,
      total: 2,
    });

    // An update with no count says what the volume is doing and nothing it does not know.
    reports[2]!({ stage: 'processing', message: 'Starting' });
    expect(updates.at(-1)?.volumes?.[2]).toStrictEqual({ number: 3, status: 'processing' });
    reports[2]!({ stage: 'saving', message: 'Writing' });
    expect(updates.at(-1)?.volumes?.[2]).toStrictEqual({ number: 3, status: 'saving' });
    expect(updates.at(-1)?.completed).toBe(0.5);

    // A volume that is made is done, with all its pages counted when it said how many there were.
    jobs[1]!.resolve(book(1));
    await settle();
    expect(updates.at(-1)?.volumes?.[1]).toStrictEqual({
      number: 2,
      status: 'done',
      completed: 2,
      total: 2,
    });
    expect(updates.at(-1)).toMatchObject({ message: '1 of 3 volumes converted.', completed: 1 });

    // And one that never said how many pages has no count to complete.
    jobs[2]!.resolve(book(2));
    await settle();
    expect(updates.at(-1)?.volumes?.[2]).toStrictEqual({ number: 3, status: 'done' });
    jobs[0]!.resolve(book(0));
    expect((await run).status).toBe('done');
  });

  it('counts a page count only when it has both numbers, and a total of nothing is no progress', async () => {
    const jobs = [
      deferred<ConversionArtifact>(),
      deferred<ConversionArtifact>(),
      deferred<ConversionArtifact>(),
    ];
    const reports: Report[] = [];
    const updates: ConversionProgress[] = [];
    const run = produceVolumes(
      3,
      (index, _signal, report) => {
        reports[index] = report;
        return jobs[index]!.promise;
      },
      {
        maxParallelConversions: 3,
        sequential: false,
        onProgress: (update) => updates.push(structuredClone(update)),
      },
    );

    reports[0]!({ stage: 'processing', message: 'Only a count', completed: 3 });
    expect(updates.at(-1)?.volumes?.[0]).toStrictEqual({ number: 1, status: 'processing' });
    reports[1]!({ stage: 'processing', message: 'Only a total', total: 8 });
    expect(updates.at(-1)?.volumes?.[1]).toStrictEqual({ number: 2, status: 'processing' });
    // Pages of nothing: the volume is said to have them, and the whole has not moved.
    reports[2]!({ stage: 'processing', message: 'Empty', completed: 1, total: 0 });
    expect(updates.at(-1)?.volumes?.[2]).toStrictEqual({
      number: 3,
      status: 'processing',
      completed: 1,
      total: 0,
    });
    expect(updates.at(-1)?.completed).toBe(0);

    for (const job of jobs) job.resolve(book(0));
    await run;
  });

  it('puts the series in front of what it says', async () => {
    const updates: ConversionProgress[] = [];
    await produceVolumes(2, (index) => Promise.resolve(book(index)), {
      maxParallelConversions: 2,
      sequential: false,
      title: 'Chainsaw Man',
      onProgress: (update) => updates.push(update),
    });

    expect(updates.every((update) => update.title === 'Chainsaw Man')).toBe(true);
    expect(updates.at(-1)?.message).toBe('Chainsaw Man · 2 of 2 volumes converted.');
  });
});

describe('the mapping a person sends back', () => {
  const chapters = [
    { id: 'c1', name: 'Chapter 1', path: '/m/1', pageCount: 2, chapter: 1 },
    { id: 'c2', name: 'Chapter 2', path: '/m/2', pageCount: 2, chapter: 2 },
  ] as const;
  const trusted = createMappingDraft({ mangaTitle: 'Trusted', chapters });

  it('is built from the chapters the tool read, with only the grouping and the title taken from it', () => {
    const mapping = trustedMapping(trusted, {
      mangaTitle: 'Sent',
      chapters: [{ id: 'forged', name: 'x', path: '/etc', pageCount: 1 }],
      volumes: [{ id: 'v1', number: '1', chapterIds: ['c1'] }],
      source: { provider: 'mangadex', id: 'work' },
    });

    expect(mapping.mangaTitle).toBe('Sent');
    expect(mapping.chapters.map((chapter) => chapter.path)).toEqual(['/m/1', '/m/2']);
    expect(mapping.source).toEqual({ provider: 'mangadex', id: 'work' });
    expect(mapping.volumes.map((volume) => volume.chapterIds)).toEqual([['c1']]);
  });

  it('may leave chapters out, which is a warning and not a reason to refuse it', () => {
    const mapping = trustedMapping(trusted, {
      mangaTitle: 'Sent',
      chapters,
      volumes: [{ id: 'v1', number: '1', chapterIds: ['c1'] }],
    });

    expect(mapping).not.toHaveProperty('source');
    expect(mapping.volumes).toHaveLength(1);
  });

  it('is refused for a chapter that is not there, with what was wrong kept', () => {
    try {
      trustedMapping(trusted, {
        mangaTitle: 'Sent',
        chapters,
        volumes: [{ id: 'v1', number: '1', chapterIds: ['nowhere'] }],
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConversionWorkflowError);
      expect(error).toMatchObject({ code: 'invalid_mapping' });
      expect((error as Error).cause).toBeInstanceOf(Error);
    }
  });

  it('is refused for an error in it, and only the errors are what was wrong', () => {
    try {
      // An empty volume is an error, and the chapter left out is only a warning.
      trustedMapping(trusted, {
        mangaTitle: 'Sent',
        chapters,
        volumes: [
          { id: 'v1', number: '1', chapterIds: ['c1'] },
          { id: 'v2', number: '2', chapterIds: [] },
        ],
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({ code: 'invalid_mapping' });
      const causes = (error as Error).cause as { code: string; severity: string }[];
      expect(causes.map((cause) => cause.code)).toEqual(['empty_volume']);
      expect(causes.every((cause) => cause.severity === 'error')).toBe(true);
    }
  });
});

describe('a tool that could not be started', () => {
  it('keeps the reason, which is what the log is for', () => {
    const cause = new Error('spawn ENOENT');

    const error = new ProcessStartError(cause);

    expect(error.cause).toBe(cause);
    expect(error.name).toBe('ProcessStartError');
  });
});

describe('writing the options down', () => {
  const store = () => {
    const save = vi.fn<SettingsStorePort['save']>(() => Promise.resolve());
    const port: SettingsStorePort = {
      load: () => Promise.resolve({ settings: defaultPreferences, unreadable: false, reset: [] }),
      save,
      settled: () => Promise.resolve(),
    };
    return { workflow: new PreferencesWorkflow(port, () => Promise.resolve(true)), save };
  };

  it('writes the network only when one was chosen, and the folders only when there are some', async () => {
    const { workflow, save } = store();

    await workflow.save(defaultPreferences, undefined, undefined, undefined);
    await workflow.save(defaultPreferences, '/books', '/downloads', {
      name: 'Ethernet',
      address: '10.0.0.2',
    });

    expect(save.mock.calls[0]?.[0]).toEqual(defaultPreferences);
    expect(save.mock.calls[0]?.[0]).not.toHaveProperty('preferredNetworkInterface');
    expect(save.mock.calls[0]?.[0]).not.toHaveProperty('outputFolder');
    expect(save.mock.calls[0]?.[0]).not.toHaveProperty('lastPickerFolder');
    expect(save.mock.calls[1]?.[0]).toEqual({
      ...defaultPreferences,
      outputFolder: '/books',
      lastPickerFolder: '/downloads',
      preferredNetworkInterface: { name: 'Ethernet', address: '10.0.0.2' },
    });
  });

  it('restores the network only when one was kept', async () => {
    const withoutNetwork = new PreferencesWorkflow(
      {
        load: () => Promise.resolve({ settings: defaultPreferences, unreadable: false, reset: [] }),
        save: () => Promise.resolve(),
        settled: () => Promise.resolve(),
      },
      () => Promise.resolve(true),
    );
    const withNetwork = new PreferencesWorkflow(
      {
        load: () =>
          Promise.resolve({
            settings: {
              ...defaultPreferences,
              preferredNetworkInterface: { name: 'Wi-Fi', address: '192.168.0.4' },
            },
            unreadable: false,
            reset: [],
          }),
        save: () => Promise.resolve(),
        settled: () => Promise.resolve(),
      },
      () => Promise.resolve(true),
    );

    expect(await withoutNetwork.restore()).not.toHaveProperty('preferredNetworkInterface');
    expect((await withNetwork.restore()).preferredNetworkInterface).toEqual({
      name: 'Wi-Fi',
      address: '192.168.0.4',
    });
  });
});
