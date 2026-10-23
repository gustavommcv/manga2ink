import { randomUUID } from 'node:crypto';
import type * as NodeOs from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { QueueRuns } from '@/main/queue-runs';
import { bootstrapToolchain } from '@/main/toolchain-bootstrap';
import type {
  ToolchainStatus,
  ToolchainTarget,
  ToolVerificationStatus,
} from '@/shared/toolchain-status';
import { message, raw } from '@/domain/message';
import type { ParallelChoice } from '@/domain/parallel-conversions';

interface Made {
  readonly name: string;
  readonly args: readonly unknown[];
  readonly instance: object;
}
const fake = vi.hoisted(() => {
  const made: { name: string; args: readonly unknown[]; instance: object }[] = [];
  const recorder = (name: string): new (...args: unknown[]) => object =>
    class {
      constructor(...args: unknown[]) {
        made.push({ name, args, instance: this });
      }
    };
  return {
    made,
    recorder,
    isPackaged: false,
    processors: 8,
    memory: 16 * 1024 ** 3,
    verify: vi.fn<(options: unknown) => Promise<unknown>>(),
    runner: { run: vi.fn() },
  };
});
vi.mock('electron', () => ({
  app: {
    get isPackaged() {
      return fake.isPackaged;
    },
    getAppPath: () => '/opt/manga2ink/app',
  },
}));
vi.mock('node:os', async (importOriginal) => ({
  ...(await importOriginal<typeof NodeOs>()),
  availableParallelism: () => fake.processors,
  totalmem: () => fake.memory,
}));
vi.mock('@/adapters/toolchain/verification', () => ({ verifyBundledToolchain: fake.verify }));
vi.mock('@/adapters/process/node-process-runner', () => ({
  createNodeProcessRunner: () => fake.runner,
}));
vi.mock('@/adapters/mangabind/cli', () => ({
  MangabindCliAdapter: fake.recorder('mangabind-cli'),
}));
vi.mock('@/adapters/mangapress/cli', () => ({
  MangapressCliAdapter: fake.recorder('mangapress-cli'),
}));
vi.mock('@/adapters/mangabind/binding-port', () => ({
  MangabindBindingAdapter: fake.recorder('binding'),
}));
vi.mock('@/adapters/mangapress/conversion-port', () => ({
  MangapressConversionAdapter: fake.recorder('conversion'),
}));
vi.mock('@/adapters/library/fs-book-file-store', () => ({
  FsBookFileStore: fake.recorder('book-files'),
}));
vi.mock('@/application/workflows/conversion-workflow', () => ({
  ConversionWorkflow: fake.recorder('workflow'),
}));

const originalResources = Object.getOwnPropertyDescriptor(process, 'resourcesPath');
const tool = (
  name: ToolVerificationStatus['name'],
  capabilities?: readonly string[],
): ToolVerificationStatus => ({
  name,
  releaseTag: 'v1.0.0',
  state: 'ready',
  message: raw('Ready.'),
  ...(capabilities === undefined ? {} : { capabilities }),
});
const ready = (
  target: ToolchainTarget,
  tools: readonly ToolVerificationStatus[] = [tool('mangabind'), tool('mangapress')],
): ToolchainStatus => ({ state: 'ready', target, tools, message: raw('Ready.') });
const blocked: ToolchainStatus = { state: 'blocked', tools: [], message: raw('Not these tools.') };

const emptyContext = (): Parameters<typeof bootstrapToolchain>[0] => ({
  workflow: undefined,
  mangapressCli: undefined,
  coverStore: undefined,
  processing: undefined,
  queueRuns: new QueueRuns({ now: () => 0, newToken: () => 'queue' }),
  appSettings: undefined,
});
const madeOf = (name: string): Made[] => fake.made.filter((entry) => entry.name === name);

beforeEach(() => {
  fake.made.length = 0;
  fake.isPackaged = false;
  fake.processors = 8;
  fake.memory = 16 * 1024 ** 3;
  fake.verify.mockReset();
  Object.defineProperty(process, 'resourcesPath', {
    configurable: true,
    value: path.join(path.sep, 'opt', 'manga2ink', 'resources'),
  });
});
afterEach(() => {
  if (originalResources === undefined) Reflect.deleteProperty(process, 'resourcesPath');
  else Object.defineProperty(process, 'resourcesPath', originalResources);
});

describe('where the bundled tools are looked for', () => {
  it('is the vendor folder of the checkout when the app is not packaged', async () => {
    fake.verify.mockResolvedValue(blocked);

    await bootstrapToolchain(emptyContext());

    expect(fake.verify).toHaveBeenCalledExactlyOnceWith({
      arch: process.arch,
      platform: process.platform,
      toolchainRoot: path.join('/opt/manga2ink/app', 'vendor', 'toolchain'),
    });
  });

  it('is the toolchain folder of the app’s resources when it is packaged', async () => {
    fake.isPackaged = true;
    fake.verify.mockResolvedValue(blocked);

    await bootstrapToolchain(emptyContext());

    expect(fake.verify).toHaveBeenCalledExactlyOnceWith({
      arch: process.arch,
      platform: process.platform,
      toolchainRoot: path.join(path.sep, 'opt', 'manga2ink', 'resources', 'toolchain'),
    });
  });
});

describe('a toolchain that verified', () => {
  it('becomes the workflow every handler reaches, built on the executables of its target', async () => {
    fake.verify.mockResolvedValue(ready('linux-x64'));
    const context = emptyContext();
    const coverStore = { kept: true } as never;
    context.coverStore = coverStore;

    const status = await bootstrapToolchain(context);

    const root = path.join('/opt/manga2ink/app', 'vendor', 'toolchain', 'linux-x64');
    expect(status).toEqual(ready('linux-x64'));
    const [mangabindCli] = madeOf('mangabind-cli');
    const [mangapressCli] = madeOf('mangapress-cli');
    expect(mangabindCli?.args).toEqual([path.join(root, 'mangabind'), fake.runner, false]);
    expect(mangapressCli?.args).toEqual([path.join(root, 'mangapress'), fake.runner]);
    expect(context.mangapressCli).toBe(mangapressCli?.instance);
    // One runner for both tools, and the workflow is made of the adapters of those two.
    const [binding] = madeOf('binding');
    const [conversion] = madeOf('conversion');
    expect(binding?.args).toEqual([mangabindCli?.instance, undefined, undefined]);
    expect(conversion?.args).toEqual([mangapressCli?.instance]);
    const [workflow] = madeOf('workflow');
    expect(context.workflow).toBe(workflow?.instance);
    expect(workflow?.args).toEqual([
      binding?.instance,
      conversion?.instance,
      randomUUID,
      madeOf('book-files')[0]?.instance,
      expect.any(Function),
      coverStore,
    ]);
  });

  it('builds volumes where the app works now, getting the place ready each time it is asked', async () => {
    fake.verify.mockResolvedValue(ready('linux-x64'));
    const context = emptyContext();
    const prepare = vi.fn(() =>
      Promise.resolve({ pending: '/books/Pending', scratch: '/books/Scratch' }),
    );
    context.processing = { prepare } as never;

    await bootstrapToolchain(context);

    const [binding] = madeOf('binding');
    const where = binding?.args[2] as () => Promise<string>;
    expect(binding?.args[1]).toBeUndefined();
    expect(prepare).not.toHaveBeenCalled();
    expect(await where()).toBe('/books/Scratch');
    expect(await where()).toBe('/books/Scratch');
    expect(prepare).toHaveBeenCalledTimes(2);
  });

  it('names the executables of Windows with their extension', async () => {
    fake.verify.mockResolvedValue(ready('win32-x64'));

    await bootstrapToolchain(emptyContext());

    const root = path.join('/opt/manga2ink/app', 'vendor', 'toolchain', 'win32-x64');
    expect(madeOf('mangabind-cli')[0]?.args[0]).toBe(path.join(root, 'mangabind.exe'));
    expect(madeOf('mangapress-cli')[0]?.args[0]).toBe(path.join(root, 'mangapress.exe'));
  });

  it.each([
    ['advertises progress as JSON', ['report', 'progress-json'], true],
    ['advertises only a report', ['report'], false],
    ['advertises nothing', undefined, false],
  ])('tells mangabind it %s only when it does', async (_description, capabilities, expected) => {
    fake.verify.mockResolvedValue(
      ready('linux-x64', [tool('mangabind', capabilities), tool('mangapress', ['progress-json'])]),
    );

    await bootstrapToolchain(emptyContext());

    expect(madeOf('mangabind-cli')[0]?.args[2]).toBe(expected);
  });
});

describe('how many conversions the workflow runs side by side', () => {
  /** The limit the workflow was given, which it asks each time a title starts. */
  const limitOf = async (context = emptyContext()): Promise<() => number> => {
    fake.verify.mockResolvedValue(ready('linux-x64'));
    await bootstrapToolchain(context);
    return madeOf('workflow')[0]?.args[4] as () => number;
  };
  const choosing = (parallelConversions: ParallelChoice): ReturnType<typeof emptyContext> => ({
    ...emptyContext(),
    appSettings: { parallelConversions: () => parallelConversions } as never,
  });

  it('is what the machine can run when nobody chose, counted again each time it is asked', async () => {
    fake.processors = 4;
    fake.memory = 4 * 1024 ** 3;
    const limit = await limitOf();

    expect(limit()).toBe(1);
    fake.processors = 12;
    fake.memory = 32 * 1024 ** 3;
    expect(limit()).toBe(3);
  });

  it.each([
    [1, 1],
    [2, 2],
    [6, 6],
    [8, 6],
    [12, 6],
  ] as const)(
    'is the %i that was chosen, lowered to what this machine can be asked for, when no queue is running',
    async (chosen, expected) => {
      fake.processors = 12;
      fake.memory = 32 * 1024 ** 3;

      expect((await limitOf(choosing(chosen)))()).toBe(expected);
    },
  );

  it('is what the queue that is running began with, and a change made meanwhile is for the next one', async () => {
    const context = choosing(1);
    const limit = await limitOf(context);
    const token = context.queueRuns.begin(1, {
      keepAwake: true,
      notifyWhenDone: true,
      parallelConversions: 3,
    });

    expect(limit()).toBe(3);
    // The person chose another number while it ran: not for this queue.
    context.appSettings = { parallelConversions: () => 2 } as never;
    expect(limit()).toBe(3);

    context.queueRuns.end(token);
    expect(limit()).toBe(2);
  });
});

describe('a toolchain that did not verify', () => {
  it('leaves the context without a workflow and says why', async () => {
    fake.verify.mockResolvedValue(blocked);
    const context = emptyContext();

    const status = await bootstrapToolchain(context);

    expect(status).toBe(blocked);
    expect(context.workflow).toBeUndefined();
    expect(context.mangapressCli).toBeUndefined();
    expect(fake.made).toEqual([]);
  });

  it('builds nothing from a ready status that names no target', async () => {
    const withoutTarget: ToolchainStatus = {
      state: 'ready',
      tools: [tool('mangabind'), tool('mangapress')],
      message: raw('Ready.'),
    };
    fake.verify.mockResolvedValue(withoutTarget);
    const context = emptyContext();

    expect(await bootstrapToolchain(context)).toBe(withoutTarget);
    expect(context.workflow).toBeUndefined();
    expect(fake.made).toEqual([]);
  });

  it('is blocked, and says to reinstall, when the manifest cannot be verified at all', async () => {
    fake.verify.mockRejectedValue(new Error('manifest.json is not JSON'));
    const context = emptyContext();

    const status = await bootstrapToolchain(context);

    expect(status).toEqual({
      state: 'blocked',
      tools: [],
      message: message('toolchain.manifestUnverified', {}),
    });
    expect(context.workflow).toBeUndefined();
    expect(fake.made).toEqual([]);
  });
});
