import type { AppSettingsStorePort } from '@/application/ports/app-settings-store';
import {
  type AppSettings,
  type AppSettingsChange,
  applyingChange,
  choicesOf,
  choosingFolder,
  defaultKeptAppSettings,
  defaultLanguage,
  forgettingFolders,
  type KeptAppSettings,
  type Language,
  type ProcessingChoice,
  resolveLanguage,
} from '@/domain/app-settings';
import type { ParallelChoice } from '@/domain/parallel-conversions';
import type { Theme } from '@/domain/theme';

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
 * from, and says where the app works for the parts of the main process that need it (ADR 0056).
 */
export class AppSettingsWorkflow {
  private kept: KeptAppSettings = defaultKeptAppSettings;
  private loaded = false;
  private unreadable = false;
  private current: Language = defaultLanguage;

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
    this.current = resolveLanguage(this.kept.language, this.systemLanguages());
    return {
      settings: choicesOf(this.kept),
      language: this.current,
      unreadable: this.unreadable,
    };
  }

  /**
   * Keeps the choices a change names, with the rest as it was, and says the language the kept
   * settings come to, only once they are kept.
   */
  async save(change: AppSettingsChange): Promise<{ readonly language: Language }> {
    await this.keep(applyingChange(this.kept, change));
    this.current = resolveLanguage(this.kept.language, this.systemLanguages());
    return { language: this.current };
  }

  /**
   * The language the window is in, for what the main process says itself (the titles of the native
   * dialogs): the one the settings last came to. English until they have been read.
   */
  language(): Language {
    return this.current;
  }

  /**
   * The choices that decide what a queue does, as they are now: read when a queue begins, so a
   * change is for the next one and does not touch the one that is running (ADR 0065).
   */
  queueChoices(): Pick<AppSettings, 'keepAwake' | 'notifyWhenDone' | 'parallelConversions'> {
    return {
      keepAwake: this.kept.keepAwake,
      notifyWhenDone: this.kept.notifyWhenDone,
      parallelConversions: this.kept.parallelConversions,
    };
  }

  /**
   * How many books of a title are to be converted at once, as it was last kept: what a conversion
   * that no queue asked for is made with (ADR 0068).
   */
  parallelConversions(): ParallelChoice {
    return this.kept.parallelConversions;
  }

  /** How the app looks, as it was last kept: what a window is made with (ADR 0066). */
  theme(): Theme {
    return this.kept.theme;
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
