import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parseStoredAppSettings, serializeStoredAppSettings } from './stored-app-settings';

import { writeFileAtomically, type AtomicWriteDeps } from '@/adapters/fs/write-file-atomically';
import type { AppSettingsLoad, AppSettingsStorePort } from '@/application/ports/app-settings-store';
import { SettingsSaveError } from '@/application/ports/settings-store';
import { defaultKeptAppSettings, type KeptAppSettings } from '@/domain/app-settings';

export interface FsAppSettingsStoreDeps extends AtomicWriteDeps {
  readonly readFile: (filePath: string, encoding: 'utf8') => Promise<string>;
  readonly mkdir: (
    directoryPath: string,
    options: { readonly recursive: true },
  ) => Promise<string | undefined>;
}

function isEnoent(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

/**
 * The file of the app settings of one person (ADR 0052): read once at launch, rewritten whenever
 * they change. It is written the way the conversion options' file is, and is a file of its own so
 * that neither can cost the other.
 */
export class FsAppSettingsStore implements AppSettingsStorePort {
  private readonly io: FsAppSettingsStoreDeps;
  // Every write waits for the one before it, so the last save asked for is the last one written.
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    deps: Partial<FsAppSettingsStoreDeps> = {},
  ) {
    this.io = {
      readFile: deps.readFile ?? readFile,
      writeFile: deps.writeFile ?? writeFile,
      rename: deps.rename ?? rename,
      mkdir: deps.mkdir ?? mkdir,
      rm: deps.rm ?? rm,
      createTempSuffix: deps.createTempSuffix ?? randomUUID,
    };
  }

  async load(): Promise<AppSettingsLoad> {
    let raw: string;
    try {
      raw = await this.io.readFile(this.filePath, 'utf8');
    } catch (error) {
      // No file is how a first launch looks; any other failure is a file that is there and unusable.
      return { settings: defaultKeptAppSettings, unreadable: !isEnoent(error) };
    }
    const settings = parseStoredAppSettings(raw);
    return settings === undefined
      ? { settings: defaultKeptAppSettings, unreadable: true }
      : { settings, unreadable: false };
  }

  save(settings: KeptAppSettings): Promise<void> {
    const written = this.tail.then(() => this.write(settings));
    this.tail = written.catch(() => undefined);
    return written;
  }

  settled(): Promise<void> {
    return this.tail;
  }

  /** Writes beside the file and renames over it, so the file is either the old one or the new one. */
  private async write(settings: KeptAppSettings): Promise<void> {
    try {
      await this.io.mkdir(path.dirname(this.filePath), { recursive: true });
      await writeFileAtomically(this.filePath, serializeStoredAppSettings(settings), this.io);
    } catch (error) {
      throw new SettingsSaveError({ cause: error });
    }
  }
}
