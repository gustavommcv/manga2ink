import type { ReleaseFeedPort } from '@/application/ports/release-feed';
import { chooseUpdate, type UpdateCheck } from '@/domain/update-check';

/**
 * Looks for a version newer than the one that is running, when a person asks (ADR 0063). It only
 * reads the list of releases; telling the person where to get a new one is the window's, and
 * installing it is not done.
 */
export class UpdateCheckWorkflow {
  constructor(private readonly feed: ReleaseFeedPort) {}

  async check(
    installed: string,
    options: { readonly signal?: AbortSignal } = {},
  ): Promise<UpdateCheck> {
    const releases = await this.feed.releases(options.signal);
    // Every release so far is a pre-release, so one is looked for: a choice of which versions to look
    // for would pass `false` here once there is a stable version.
    return chooseUpdate({ installed, releases, prereleases: true });
  }
}
