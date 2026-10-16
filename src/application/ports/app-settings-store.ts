import type { KeptAppSettings } from '@/domain/app-settings';

export interface AppSettingsLoad {
  readonly settings: KeptAppSettings;
  /** True when a file was there but could not be used, so `settings` are the defaults. */
  readonly unreadable: boolean;
}

/**
 * Where the app settings are kept between sessions (ADR 0052). Saving that fails throws a
 * `SettingsSaveError`, the one the conversion options' store throws, and what was kept before stays.
 */
export interface AppSettingsStorePort {
  /** Never fails: a missing or unusable file gives the defaults. */
  load(): Promise<AppSettingsLoad>;
  /** Saves after every save asked for before it, so the last one asked for is the one kept. */
  save(settings: KeptAppSettings): Promise<void>;
  /** Resolves once every save asked for so far has finished, whether or not it worked. */
  settled(): Promise<void>;
}
