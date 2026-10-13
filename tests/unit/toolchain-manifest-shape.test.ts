import { describe, expect, it } from 'vitest';

import { loadToolchainManifest, parseToolchainManifest } from '@/adapters/toolchain/manifest';

type Json = Record<string, unknown>;
const remove = Symbol('remove');

/** The shipped manifest with the value at a path replaced, or removed when `remove` is given. */
function manifestWith(path: readonly string[], value: unknown): unknown {
  const manifest = structuredClone(loadToolchainManifest()) as unknown as Json;
  let node = manifest;
  for (const key of path.slice(0, -1)) node = node[key] as Json;
  const last = path.at(-1)!;
  if (value === remove) Reflect.deleteProperty(node, last);
  else node[last] = value;
  return manifest;
}
const refusal = 'The bundled-tool manifest is incomplete or invalid.';
const pin = (tool: 'mangabind' | 'mangapress') => ['tools', tool, 'pin'] as const;

describe('the manifest of the bundled tools', () => {
  it('is the one the app ships, and is accepted whole', () => {
    expect(() => loadToolchainManifest()).not.toThrow();
  });

  it.each(['v1.2.3', '1.2.3', 'v10.20.30', 'v0.7.1', 'v1.2.3-rc.1'])(
    'names a release as %s',
    (releaseTag) => {
      expect(() =>
        parseToolchainManifest(manifestWith([...pin('mangabind'), 'releaseTag'], releaseTag)),
      ).not.toThrow();
    },
  );

  it.each(['', 'latest', 'v1.2', 'v1.2.x', 'xv1.2.3', 'release-1.2.3', 'v.1.2'])(
    'does not take %j for the name of a release',
    (releaseTag) => {
      expect(() =>
        parseToolchainManifest(manifestWith([...pin('mangapress'), 'releaseTag'], releaseTag)),
      ).toThrow(refusal);
    },
  );

  it.each([
    ['short', 'a'.repeat(63)],
    ['long', 'a'.repeat(65)],
    ['upper case', 'A'.repeat(64)],
    ['with something before it', `z${'a'.repeat(64)}`],
    ['with something after it', `${'a'.repeat(64)}z`],
    ['not hex', 'g'.repeat(64)],
    ['empty', ''],
  ])('does not take a checksum that is %s', (_what, value) => {
    expect(() =>
      parseToolchainManifest(
        manifestWith([...pin('mangabind'), 'artifacts', 'linux-x64', 'executableSha256'], value),
      ),
    ).toThrow(refusal);
    expect(() =>
      parseToolchainManifest(manifestWith([...pin('mangapress'), 'checksums', 'sha256'], value)),
    ).toThrow(refusal);
  });

  it.each([
    ['an unlocked state', ['state'], 'unlocked'],
    ['another manifest version', ['manifestVersion'], 2],
    ['another protocol', [...pin('mangabind'), 'protocolVersion'], '2'],
    ['no checksums', [...pin('mangapress'), 'checksums'], remove],
    [
      'a checksums file by another name',
      [...pin('mangapress'), 'checksums', 'assetName'],
      'sums.txt',
    ],
    [
      'checksums from another host',
      [...pin('mangapress'), 'checksums', 'url'],
      'https://example.com/c.txt',
    ],
    ['no artifacts', [...pin('mangabind'), 'artifacts'], remove],
    ['an artifact with no name', [...pin('mangabind'), 'artifacts', 'linux-x64', 'assetName'], ''],
    [
      'an artifact from another host',
      [...pin('mangabind'), 'artifacts', 'win32-x64', 'url'],
      'https://example.com/a.zip',
    ],
    [
      'an artifact over plain http',
      [...pin('mangabind'), 'artifacts', 'win32-x64', 'url'],
      'http://github.com/a.zip',
    ],
    ['no mangabind', ['tools', 'mangabind'], remove],
    ['a source that is not an address', ['tools', 'mangapress', 'sourceRepo'], 'mangapress'],
    ['three targets', ['supportedTargets'], ['win32-x64', 'linux-x64', 'darwin-x64']],
  ] as const)('is refused for %s', (_what, path, value) => {
    expect(() => parseToolchainManifest(manifestWith(path, value))).toThrow(refusal);
  });

  it('keeps why it was refused as the cause of the error', () => {
    const refused = (() => {
      try {
        parseToolchainManifest(manifestWith(['state'], 'unlocked'));
      } catch (error) {
        return error as Error;
      }
      return undefined;
    })();

    expect(refused?.cause).toBeDefined();
  });
});
