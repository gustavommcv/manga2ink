import type { ReleaseSummary } from '@/domain/update-check';

/**
 * Where the published releases of the app are listed (ADR 0062). Asking is the only thing it can
 * do: nothing is downloaded, and nothing is installed.
 */
export interface ReleaseFeedPort {
  /** The releases that have been published, in no particular order. */
  releases(signal?: AbortSignal): Promise<readonly ReleaseSummary[]>;
}
