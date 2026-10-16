import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const script = path.resolve('scripts/verify-package-tools.mjs');

const sha256 = (content: string): string => createHash('sha256').update(content).digest('hex');

const pinned = { mangabind: 'the pinned mangabind', mangapress: 'the pinned mangapress' };

function lockFor(contents: Record<'mangabind' | 'mangapress', string>): string {
  const tool = (name: 'mangabind' | 'mangapress'): unknown => ({
    pin: { artifacts: { 'linux-x64': { executableSha256: sha256(contents[name]) } } },
  });
  return JSON.stringify({
    tools: { mangabind: tool('mangabind'), mangapress: tool('mangapress') },
  });
}

describe('the package tool check', () => {
  let workspace: string;
  let unpacked: string;
  let lock: string;

  beforeEach(async () => {
    workspace = await mkdtemp(path.join(tmpdir(), 'mangabound-package-tools-'));
    unpacked = path.join(workspace, 'unpacked');
    lock = path.join(workspace, 'toolchain.lock.json');
    await writeFile(lock, lockFor(pinned));
  });

  afterEach(async () => {
    await rm(workspace, { force: true, recursive: true });
  });

  async function install(
    tools: Partial<Record<'mangabind' | 'mangapress', string>>,
    root = 'usr/lib/mangabound/resources/toolchain/linux-x64',
  ): Promise<void> {
    const folder = path.join(unpacked, root);
    await mkdir(folder, { recursive: true });
    for (const [name, content] of Object.entries(tools)) {
      await writeFile(path.join(folder, name), content);
    }
  }

  function verify(...extra: readonly string[]): {
    readonly status: number | null;
    readonly output: string;
  } {
    const run = spawnSync(process.execPath, [script, 'mangabound.rpm', unpacked, ...extra], {
      encoding: 'utf8',
    });
    return { status: run.status, output: `${run.stdout}${run.stderr}` };
  }

  it('accepts a package whose tools are the pinned files', async () => {
    await install(pinned);
    const run = verify(lock);
    expect(run.status).toBe(0);
    expect(run.output).toContain('mangabound.rpm: mangabind and mangapress are byte for byte');
  });

  it('finds the tools wherever the package puts its resources folder', async () => {
    await install(pinned, 'opt/mangabound/resources/toolchain/linux-x64');
    expect(verify(lock).status).toBe(0);
  });

  it('refuses a tool a package builder edited, which is what rpmbuild does to ELF files', async () => {
    await install({ ...pinned, mangapress: 'the pinned mangapress without its .comment section' });
    const run = verify(lock);
    expect(run.status).toBe(1);
    expect(run.output).toContain('the app would refuse to convert');
    // The script names the file as the operating system writes its path: backslashes on Windows.
    const edited = path.join('usr', 'lib', 'mangabound', 'resources', 'toolchain', 'linux-x64');
    expect(run.output).toContain(`mangapress: ${path.join(edited, 'mangapress')}`);
    expect(run.output).toContain(sha256(pinned.mangapress));
    expect(run.output).not.toContain('mangabind:');
  });

  it('refuses a package that leaves a tool out', async () => {
    await install({ mangabind: pinned.mangabind });
    const run = verify(lock);
    expect(run.status).toBe(1);
    expect(run.output).toContain('mangapress: not in the package');
  });

  it('refuses a package that has no toolchain folder at all', async () => {
    await mkdir(unpacked, { recursive: true });
    await writeFile(path.join(unpacked, 'mangabind'), pinned.mangabind);
    const run = verify(lock);
    expect(run.status).toBe(1);
    expect(run.output).toContain('mangabind: not in the package');
    expect(run.output).toContain('mangapress: not in the package');
  });

  it('says how to run it when it is given nothing to check', () => {
    const run = spawnSync(process.execPath, [script], { encoding: 'utf8' });
    expect(run.status).toBe(2);
    expect(run.stderr).toContain('Usage: verify-package-tools.mjs');
  });
});
