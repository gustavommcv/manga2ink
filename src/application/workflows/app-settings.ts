import type { AppSettingsStorePort } from '@/application/ports/app-settings-store';
import {
  type AppSettings,
  choosingFolder,
  defaultKeptAppSettings,
  forgettingFolders,
  type KeptAppSettings,
  type Language,
  type ProcessingChoice,
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
 * file cannot: the languages the system prefers, which a choice of "the system's" comes to. It holds
 * what was kept, so a change to one thing is written with the rest as it is, whichever tab it came
 * from, and says where the app works for the parts of the main process that need it (ADR 0055).
 */
export class AppSettingsWorkflow {
  private kept: KeptAppSettings = defaultKeptAppSettings;
  private loaded = false;
  private unreadable = false;

  constructor(
    private readonly store: AppSettingsStorePort,
    private readonly systemLanguages: () => readonly string[],
  ) {}

  /**
   * What was kept. The file is read once: after that the window and the main process ask what is
   * held here, which a change that is still being written is already part of.
   */
  async restore(): Promise<RestoredAppSettings> {
    if (!this.loaded) {
      const { settings, unreadable } = await this.store.load();
      this.kept = settings;
      this.unreadable = unreadable;
      this.loaded = true;
    }
    return {
      settings: { language: this.kept.language },
      language: resolveLanguage(this.kept.language, this.systemLanguages()),
      unreadable: this.unreadable,
    };
  }

  /** The language the kept settings come to, said only once they are kept. */
  async save(settings: AppSettings): Promise<{ readonly language: Language }> {
    await this.keep({ ...this.kept, language: settings.language });
    return { language: resolveLanguage(settings.language, this.systemLanguages()) };
  }

  /** Where the app works, as it was last kept. */
  processing(): ProcessingChoice {
    return this.kept.processing;
  }

  /** Keeps a folder as the one the app works in (`null` for its own places), and says what is kept. */
  async chooseProcessingFolder(folder: string | null): Promise<ProcessingChoice> {
    await this.keep({ ...this.kept, processing: choosingFolder(this.kept.processing, folder) });
    return this.kept.processing;
  }

  /** Lets go of earlier folders that nothing is waiting in any more. */
  async forgetEarlierFolders(folders: readonly string[]): Promise<void> {
    const processing = forgettingFolders(this.kept.processing, folders);
    if (processing === this.kept.processing) return;
    await this.keep({ ...this.kept, processing });
  }

  /** Resolves once every save asked for has finished. */
  settled(): Promise<void> {
    return this.store.settled();
  }

  /**
   * What is kept changes at once, so the next thing that asks sees it, and goes back if it could
   * not be written and nothing was kept after it: the window is told the change failed, and what it
   * holds must not be written along with the next change.
   */
  private async keep(next: KeptAppSettings): Promise<void> {
    const before = this.kept;
    this.kept = next;
    try {
      await this.store.save(next);
    } catch (error) {
      if (this.kept === next) this.kept = before;
      throw error;
    }
  }
}
