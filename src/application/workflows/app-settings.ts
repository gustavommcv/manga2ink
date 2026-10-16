import type { AppSettingsStorePort } from '@/application/ports/app-settings-store';
import {
  type AppSettings,
  defaultLanguage,
  type Language,
  resolveLanguage,
} from '@/domain/app-settings';

export interface RestoredAppSettings {
  readonly settings: AppSettings;
  /** The language to show, worked out once here so everything that needs it gets the same one. */
  readonly language: Language;
  readonly unreadable: boolean;
}

/**
 * Brings the app settings back at launch and keeps them as they change (ADR 0052). It knows what the
 * file cannot: the languages the system prefers, which a choice of "the system's" comes to.
 */
export class AppSettingsWorkflow {
  private current: Language = defaultLanguage;

  constructor(
    private readonly store: AppSettingsStorePort,
    private readonly systemLanguages: () => readonly string[],
  ) {}

  async restore(): Promise<RestoredAppSettings> {
    const { settings, unreadable } = await this.store.load();
    this.current = resolveLanguage(settings.language, this.systemLanguages());
    return { settings, language: this.current, unreadable };
  }

  /** The language the kept settings come to, said only once they are kept. */
  async save(settings: AppSettings): Promise<{ readonly language: Language }> {
    await this.store.save(settings);
    this.current = resolveLanguage(settings.language, this.systemLanguages());
    return { language: this.current };
  }

  /**
   * The language the window is in, for what the main process says itself (the titles of the native
   * dialogs): the one the settings last came to. English until they have been read.
   */
  language(): Language {
    return this.current;
  }

  /** Resolves once every save asked for has finished. */
  settled(): Promise<void> {
    return this.store.settled();
  }
}
