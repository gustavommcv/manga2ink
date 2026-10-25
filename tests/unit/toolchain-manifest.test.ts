import { describe, expect, it } from 'vitest';

import { loadToolchainManifest, parseToolchainManifest } from '@/adapters/toolchain/manifest';

describe('toolchain manifest', () => {
  it('loads the committed, release-eligible pins', () => {
    const manifest = loadToolchainManifest();

    expect(manifest.state).toBe('locked');
    expect(manifest.tools.mangabind.pin.releaseTag).toBe('v0.10.0');
    expect(manifest.tools.mangaprep.pin.releaseTag).toBe('v0.9.0');
    expect(Object.keys(manifest.tools.mangaprep.pin.artifacts)).toHaveLength(4);
  });

  it('rejects pending or malformed manifests before runtime verification', () => {
    expect(() =>
      parseToolchainManifest({ manifestVersion: 1, state: 'awaiting-structured-releases' }),
    ).toThrow('The bundled-tool manifest is incomplete or invalid.');
  });
});
