import { z } from 'zod';

import { MetadataProviderError } from '@/adapters/metadata-providers/errors';
import { requestText } from '@/adapters/metadata-providers/http';
import type { ReleaseFeedPort } from '@/application/ports/release-feed';
import { message } from '@/domain/message';
import type { ReleaseSummary } from '@/domain/update-check';

const serviceName = 'GitHub';

/**
 * The list of the releases of the app, newest created first, as GitHub gives it to anyone: no
 * account, no token, and nothing about the person or the computer is sent but what any request
 * carries (ADR 0063). A page of thirty is far more than a check needs: a release newer than the one
 * that runs is among the latest.
 */
export const releasesAddress =
  'https://api.github.com/repos/gustavommcv/manga2ink/releases?per_page=30';

const releasesSchema = z.array(
  z.object({
    tag_name: z.string(),
    prerelease: z.boolean(),
    draft: z.boolean().optional(),
    published_at: z.string().nullish(),
  }),
);

/**
 * Reads the releases from GitHub. A failure is the one every online source has (it cannot be reached,
 * it does not answer in time, it is rate-limiting, it answers with an error), with GitHub named.
 */
export class GithubReleaseFeed implements ReleaseFeedPort {
  constructor(private readonly fetchImpl: typeof globalThis.fetch = globalThis.fetch) {}

  async releases(signal?: AbortSignal): Promise<readonly ReleaseSummary[]> {
    const text = await requestText(this.fetchImpl, {
      url: releasesAddress,
      serviceName,
      ...(signal === undefined ? {} : { signal }),
    });
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch (error) {
      throw new MetadataProviderError(
        'malformed_json',
        message('provider.malformedJson', { service: serviceName }),
        true,
        { cause: error },
      );
    }
    const parsed = releasesSchema.safeParse(json);
    if (!parsed.success) {
      throw new MetadataProviderError(
        'invalid_payload',
        message('provider.unexpectedReleases', { service: serviceName }),
        true,
        { cause: parsed.error },
      );
    }
    return parsed.data
      .filter((release) => release.draft !== true)
      .map((release) => ({
        tag: release.tag_name,
        prerelease: release.prerelease,
        ...(release.published_at == null ? {} : { publishedAt: release.published_at }),
      }));
  }
}
