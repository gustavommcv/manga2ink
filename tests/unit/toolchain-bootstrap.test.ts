import { randomUUID } from 'node:crypto';
import type * as NodeOs from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { bootstrapToolchain } from '@/main/toolchain-bootstrap';
import type {
  ToolchainStatus,
  ToolchainTarget,
  ToolVerificationStatus,
} from '@/shared/toolchain-status';

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
    getAppPath: () => '/opt/mangabound/app',
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
  message: 'Ready.',
  ...(capabilities === undefined ? {} : { capabilities }),
});
const ready = (
  target: ToolchainTarget,
  tools: readonly ToolVerificationStatus[] = [tool('mangabind'), tool('mangapress')],
): ToolchainStatus => ({ state: 'ready', target, tools, message: 'Ready.' });
const blocked: ToolchainStatus = { state: 'blocked', tools: [], message: 'Not these tools.' };

const emptyContext = (): Parameters<typeof bootstrapToolchain>[0] => ({
  workflow: undefined,
  mangapressCli: undefined,
  coverStore: undefined,
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
    value: path.join(path.sep, 'opt', 'mangabound', 'resources'),
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
      toolchainRoot: path.join('/opt/mangabound/app', 'vendor', 'toolchain'),
    });
  });

  it('is the toolchain folder of the app’s resources when it is packaged', async () => {
    fake.isPackaged = true;
    fake.verify.mockResolvedValue(blocked);

    await bootstrapToolchain(emptyContext());

    expect(fake.verify).toHaveBeenCalledExactlyOnceWith({
      arch: process.arch,
      platform: process.platform,
      toolchainRoot: path.join(path.sep, 'opt', 'mangabound', 'resources', 'toolchain'),
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

    const root = path.join('/opt/mangabound/app', 'vendor', 'toolchain', 'linux-x64');
    expect(status).toEqual(ready('linux-x64'));
    const [mangabindCli] = madeOf('mangabind-cli');
    const [mangapressCli] = madeOf('mangapress-cli');
    expect(mangabindCli?.args).toEqual([path.join(root, 'mangabind'), fake.runner, false]);
    expect(mangapressCli?.args).toEqual([path.join(root, 'mangapress'), fake.runner]);
    expect(context.mangapressCli).toBe(mangapressCli?.instance);
    // One runner for both tools, and the workflow is made of the adapters of those two.
    const [binding] = madeOf('binding');
    const [conversion] = madeOf('conversion');
    expect(binding?.args).toEqual([mangabindCli?.instance]);
    expect(conversion?.args).toEqual([mangapressCli?.instance]);
    const [workflow] = madeOf('workflow');
    expect(context.workflow).toBe(workflow?.instance);
    expect(workflow?.args).toEqual([
      binding?.instance,
      conversion?.instance,
      randomUUID,
      madeOf('book-files')[0]?.instance,
      2,
      coverStore,
    ]);
  });

  it('names the executables of Windows with their extension', async () => {
    fake.verify.mockResolvedValue(ready('win32-x64'));

    await bootstrapToolchain(emptyContext());

    const root = path.join('/opt/mangabound/app', 'vendor', 'toolchain', 'win32-x64');
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

  it('is told how many conversions the machine can run side by side', async () => {
    fake.processors = 4;
    fake.memory = 4 * 1024 ** 3;
    fake.verify.mockResolvedValue(ready('linux-x64'));

    await bootstrapToolchain(emptyContext());

    expect(madeOf('workflow')[0]?.args[4]).toBe(1);
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
      message: 'Ready.',
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
      message: 'The bundled-tool manifest could not be verified. Reinstall Mangabound.',
    });
    expect(context.workflow).toBeUndefined();
    expect(fake.made).toEqual([]);
  });
});
