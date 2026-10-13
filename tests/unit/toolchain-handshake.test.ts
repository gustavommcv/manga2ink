import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { loadToolchainManifest } from '@/adapters/toolchain/manifest';
import { verifyBundledToolchain } from '@/adapters/toolchain/verification';
import type { ToolchainTarget } from '@/shared/toolchain-status';

const manifest = loadToolchainManifest();
type Tool = 'mangabind' | 'mangapress';
const tools: readonly Tool[] = ['mangabind', 'mangapress'];

const versionOf = (tool: Tool): string => manifest.tools[tool].pin.releaseTag.slice(1);
const toolOf = (executable: string): Tool =>
  path.basename(executable).startsWith('mangabind') ? 'mangabind' : 'mangapress';

/** What each tool answers to `--protocol-version`, with a change for one of them. */
function handshake(tool: Tool, change: Record<string, unknown> = {}): string {
  return tool === 'mangabind'
    ? JSON.stringify({
        protocol_version: 1,
        tool,
        tool_version: versionOf(tool),
        capabilities: ['report'],
        ...change,
      })
    : `${JSON.stringify({
        protocol_version: 1,
        tool,
        tool_version: versionOf(tool),
        sequence: 1,
        type: 'protocol',
        capabilities: ['events', 'profiles'],
        ...change,
      })}\n`;
}

/** Verifies on a Linux machine, with the tools answering as given, and reports what each said. */
async function verifyWith(
  answers: Partial<Record<Tool, { version?: string; protocol?: string }>> = {},
  target: { platform: NodeJS.Platform; arch: NodeJS.Architecture } = {
    platform: 'linux',
    arch: 'x64',
  },
) {
  const hashed: string[] = [];
  const status = await verifyBundledToolchain({
    ...target,
    toolchainRoot: path.join(path.sep, 'bundle', 'toolchain'),
    manifest,
    dependencies: {
      hashFile: (file) => {
        hashed.push(file);
        const tool = toolOf(file);
        const key = `${target.platform}-${target.arch}` as ToolchainTarget;
        return Promise.resolve(manifest.tools[tool].pin.artifacts[key].executableSha256);
      },
      run: (file, arguments_) => {
        const tool = toolOf(file);
        const given = answers[tool] ?? {};
        return Promise.resolve({
          stderr: '',
          stdout:
            arguments_[0] === '--version'
              ? (given.version ?? `${tool} ${versionOf(tool)}\n`)
              : (given.protocol ?? handshake(tool)),
        });
      },
    },
  });
  return { status, hashed };
}
const stateOf = (status: Awaited<ReturnType<typeof verifyWith>>['status'], tool: Tool) =>
  status.tools.find((candidate) => candidate.name === tool)?.state;

describe('the two answers a bundled tool gives before it is trusted', () => {
  it('are ready when both tools say what the manifest pins, and say what they can do', async () => {
    const { status } = await verifyWith();

    expect(status.state).toBe('ready');
    expect(status.tools.map((tool) => [tool.name, tool.state, tool.capabilities])).toEqual([
      ['mangabind', 'ready', ['report']],
      ['mangapress', 'ready', ['events', 'profiles']],
    ]);
  });

  it.each(tools)('refuse %s that reports another version in its handshake', async (tool) => {
    const { status } = await verifyWith({
      [tool]: { protocol: handshake(tool, { tool_version: '0.0.1' }) },
    });

    expect(status.state).toBe('blocked');
    expect(stateOf(status, tool)).toBe('failed');
    const other = tools.find((candidate) => candidate !== tool)!;
    expect(stateOf(status, other)).toBe('ready');
  });

  it.each(tools)('refuse %s that speaks another protocol', async (tool) => {
    const { status } = await verifyWith({
      [tool]: { protocol: handshake(tool, { protocol_version: 2 }) },
    });

    expect(status.state).toBe('blocked');
    expect(stateOf(status, tool)).toBe('failed');
  });

  it.each(tools)('refuse %s that reports another version when asked for it', async (tool) => {
    const { status } = await verifyWith({ [tool]: { version: `${tool} 9.9.9\n` } });

    expect(stateOf(status, tool)).toBe('failed');
  });

  it.each([
    ['mangabind', 'report'],
    ['mangapress', 'events'],
    ['mangapress', 'profiles'],
  ] as const)('refuse %s that cannot do %s', async (tool, missing) => {
    const all = tool === 'mangabind' ? ['report'] : ['events', 'profiles'];
    const { status } = await verifyWith({
      [tool]: {
        protocol: handshake(tool, { capabilities: all.filter((name) => name !== missing) }),
      },
    });

    expect(stateOf(status, tool)).toBe('failed');
  });

  it('refuses a mangapress that answers with more than its one handshake, or with another event', async () => {
    const two = `${handshake('mangapress')}${handshake('mangapress')}`;
    const other = handshake('mangapress', { type: 'stage' });

    expect(
      stateOf((await verifyWith({ mangapress: { protocol: two } })).status, 'mangapress'),
    ).toBe('failed');
    expect(
      stateOf((await verifyWith({ mangapress: { protocol: other } })).status, 'mangapress'),
    ).toBe('failed');
  });

  it('accepts a version written with the v of its tag', async () => {
    const { status } = await verifyWith({
      mangabind: { version: `mangabind v${versionOf('mangabind')}\n` },
    });

    expect(stateOf(status, 'mangabind')).toBe('ready');
  });
});

describe('which executable of the bundle is looked at', () => {
  it.each([
    ['win32', 'x64', 'win32-x64', '.exe'],
    ['linux', 'x64', 'linux-x64', ''],
    ['darwin', 'arm64', 'darwin-arm64', ''],
  ] as const)(
    'on %s-%s is the one of its own folder, named for the platform',
    async (platform, arch, folder, extension) => {
      const { hashed } = await verifyWith({}, { platform, arch });

      expect(hashed.sort()).toEqual(
        [
          path.join(path.sep, 'bundle', 'toolchain', folder, `mangabind${extension}`),
          path.join(path.sep, 'bundle', 'toolchain', folder, `mangapress${extension}`),
        ].sort(),
      );
    },
  );
});
