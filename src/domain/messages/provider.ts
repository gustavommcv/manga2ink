import type { NoValues } from './values';

/** Why a source of metadata could not be used just now, naming the service (ADR 0053). */
export interface ProviderMessageValues {
  /** What a source of metadata that is a community catalogue of manga offers, in a few words. */
  readonly 'provider.catalogue': NoValues;
  readonly 'provider.timeout': { readonly service: string };
  readonly 'provider.unreachable': { readonly service: string };
  readonly 'provider.rateLimited': { readonly service: string };
  readonly 'provider.unexpectedStatus': { readonly service: string; readonly status: number };
  readonly 'provider.malformedJson': { readonly service: string };
  readonly 'provider.unexpectedSearch': { readonly service: string };
  readonly 'provider.unexpectedVolumes': { readonly service: string };
}
