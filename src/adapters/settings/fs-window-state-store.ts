import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { parseStoredWindowState, serializeStoredWindowState } from './stored-window-state';

import { writeFileAtomically, type AtomicWriteDeps } from '@/adapters/fs/write-file-atomically';
import type { WindowState } from '@/domain/window-state';

export interface FsWindowStateStoreDeps extends AtomicWriteDeps {
  readonly readFile: (filePath: string, encoding: 'utf8') => Promise<string>;
  readonly mkdir: (
    directoryPath: string,
    options: { readonly recursive: true },
  ) => Promise<string | undefined>;
}

/**
 * The file of the size and place of the window (ADR 0062): read once when the window is made,
 * rewritten when the window has been moved or resized. It is a file of its own, so that a window
 * that was moved can cost no one a setting, and it is written beside the file and renamed over it.
 */
export class FsWindowStateStore {
  private readonly io: FsWindowStateStoreDeps;

  constructor(
    private readonly filePath: string,
    deps: Partial<FsWindowStateStoreDeps> = {},
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

  /** Never fails: no file, or one that cannot be used, is a window that opens as it always did. */
  async load(): Promise<WindowState | undefined> {
    try {
      return parseStoredWindowState(await this.io.readFile(this.filePath, 'utf8'));
    } catch {
      return undefined;
    }
  }

  async save(state: WindowState): Promise<void> {
    await this.io.mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFileAtomically(this.filePath, serializeStoredWindowState(state), this.io);
  }
}
