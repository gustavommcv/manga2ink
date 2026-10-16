import type { AnyMessage } from '@/domain/message';

export type MetadataProviderErrorCode =
  | 'malformed_json'
  | 'invalid_payload'
  | 'http_error'
  | 'rate_limited'
  | 'network_error'
  | 'timeout';

/**
 * What a provider throws when its service cannot be used right now. What it says is written for the
 * person looking at the screen, as a code (ADR 0053) that names the service, so the same failure
 * reads clearly whichever source it came from.
 */
export class MetadataProviderError extends Error {
  constructor(
    readonly code: MetadataProviderErrorCode,
    readonly said: AnyMessage,
    readonly recoverable: boolean,
    options?: ErrorOptions,
  ) {
    super(said.id, options);
    this.name = 'MetadataProviderError';
  }
}
