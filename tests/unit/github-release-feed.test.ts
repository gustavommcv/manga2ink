import { describe, expect, it, vi } from 'vitest';

import { MetadataProviderError } from '@/adapters/metadata-providers/errors';
import { GithubReleaseFeed, releasesAddress } from '@/adapters/releases/github-release-feed';
import type { ReleaseFeedPort } from '@/application/ports/release-feed';
import { UpdateCheckWorkflow } from '@/application/workflows/update-check';
import { message } from '@/domain/message';

function respond(status: number, body: string): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(body),
  } as Response;
}

/** The shape of what the releases endpoint of GitHub answers, with the fields the check does not read. */
const answer = JSON.stringify([
  {
    url: 'https://api.github.com/repos/gustavommcv/manga2ink/releases/1',
    tag_name: 'v0.1.0-alpha.16',
    name: 'Manga2Ink v0.1.0-alpha.16',
    draft: false,
    prerelease: true,
    published_at: '2026-10-20T10:00:00Z',
    assets: [],
    body: '# Notes',
  },
  { tag_name: 'v0.1.0-alpha.15', draft: false, prerelease: true, published_at: null },
  { tag_name: 'v0.1.0-alpha.17', draft: true, prerelease: true, published_at: null },
  { tag_name: 'v0.1.0-alpha.14', prerelease: true },
]);

describe('the list of releases from GitHub', () => {
  it('is asked for the repository of the app, as anyone may, and read without the drafts', async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(respond(200, answer)));

    const releases = await new GithubReleaseFeed(fetchImpl).releases();

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl.mock.calls[0]?.[0]).toBe(releasesAddress);
    expect(releasesAddress).toMatch(
      /^https:\/\/api\.github\.com\/repos\/gustavommcv\/manga2ink\//u,
    );
    expect(releases).toEqual([
      { tag: 'v0.1.0-alpha.16', prerelease: true, publishedAt: '2026-10-20T10:00:00Z' },
      { tag: 'v0.1.0-alpha.15', prerelease: true },
      { tag: 'v0.1.0-alpha.14', prerelease: true },
    ]);
  });

  it('can be cancelled by the one who asked', async () => {
    const controller = new AbortController();
    const fetchImpl = vi.fn<typeof fetch>((_input, init) => {
      expect(init?.signal?.aborted).toBe(false);
      controller.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });

    await expect(new GithubReleaseFeed(fetchImpl).releases(controller.signal)).rejects.toThrow(
      'Aborted',
    );
  });

  it.each([
    [429, 'rate_limited', message('provider.rateLimited', { service: 'GitHub' })],
    [503, 'http_error', message('provider.unexpectedStatus', { service: 'GitHub', status: 503 })],
  ])('says so when GitHub answers %i', async (status, code, said) => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.resolve(respond(status, '')));

    await expect(new GithubReleaseFeed(fetchImpl).releases()).rejects.toMatchObject({
      name: 'MetadataProviderError',
      code,
      said,
    });
  });

  it('says so when GitHub cannot be reached', async () => {
    const fetchImpl = vi.fn<typeof fetch>(() => Promise.reject(new TypeError('fetch failed')));

    await expect(new GithubReleaseFeed(fetchImpl).releases()).rejects.toMatchObject({
      code: 'network_error',
      said: message('provider.unreachable', { service: 'GitHub' }),
    });
  });

  it('says so when the answer is not JSON, or is not a list of releases', async () => {
    const notJson = new GithubReleaseFeed(
      vi.fn<typeof fetch>(() => Promise.resolve(respond(200, '<html>'))),
    );
    const notAList = new GithubReleaseFeed(
      vi.fn<typeof fetch>(() => Promise.resolve(respond(200, '{"message":"Not Found"}'))),
    );
    const noTag = new GithubReleaseFeed(
      vi.fn<typeof fetch>(() => Promise.resolve(respond(200, '[{"prerelease":true}]'))),
    );

    await expect(notJson.releases()).rejects.toMatchObject({
      code: 'malformed_json',
      said: message('provider.malformedJson', { service: 'GitHub' }),
    });
    for (const feed of [notAList, noTag]) {
      await expect(feed.releases()).rejects.toMatchObject({
        code: 'invalid_payload',
        said: message('provider.unexpectedReleases', { service: 'GitHub' }),
      });
    }
    await expect(notJson.releases()).rejects.toBeInstanceOf(MetadataProviderError);
  });

  it('reads the real fetch of the system unless it is given another', () => {
    expect(() => new GithubReleaseFeed()).not.toThrow();
  });
});

describe('looking for an update', () => {
  const feed = (tags: readonly string[]) => ({
    releases: vi.fn<ReleaseFeedPort['releases']>(() =>
      Promise.resolve(tags.map((tag) => ({ tag, prerelease: true }))),
    ),
  });

  it('finds the newest release when it is newer than the one that runs, pre-releases included', async () => {
    const releases = feed(['v0.1.0-alpha.14', 'v0.1.0-alpha.16', 'v0.1.0-alpha.15']);

    await expect(new UpdateCheckWorkflow(releases).check('0.1.0-alpha.15')).resolves.toEqual({
      status: 'available',
      version: '0.1.0-alpha.16',
      tag: 'v0.1.0-alpha.16',
    });
  });

  it('says the running version is the newest when nothing is newer, and gives the feed the signal', async () => {
    const releases = feed(['v0.1.0-alpha.15']);
    const controller = new AbortController();

    await expect(
      new UpdateCheckWorkflow(releases).check('0.1.0-alpha.15', { signal: controller.signal }),
    ).resolves.toEqual({ status: 'current', version: '0.1.0-alpha.15' });
    expect(releases.releases).toHaveBeenCalledWith(controller.signal);
    await new UpdateCheckWorkflow(releases).check('0.1.0-alpha.15');
    expect(releases.releases).toHaveBeenLastCalledWith(undefined);
  });

  it('lets a failure of the feed through, for the window to say', async () => {
    const failing = {
      releases: () =>
        Promise.reject(
          new MetadataProviderError(
            'timeout',
            message('provider.timeout', { service: 'GitHub' }),
            true,
          ),
        ),
    };

    await expect(new UpdateCheckWorkflow(failing).check('0.1.0')).rejects.toMatchObject({
      code: 'timeout',
    });
  });
});
