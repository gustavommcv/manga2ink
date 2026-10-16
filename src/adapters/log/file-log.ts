import { appendFile, mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';

/** What the log asks of the disk, so that every way it can fail can be tried without failing a disk. */
export interface FileLogIo {
  readonly makeDirectory: (directory: string) => Promise<void>;
  readonly append: (file: string, text: string) => Promise<void>;
  /** The size of a file in bytes, or 0 when there is none. */
  readonly size: (file: string) => Promise<number>;
  /** Moves a file, and does nothing when there is none. */
  readonly move: (from: string, to: string) => Promise<void>;
  /** Removes a file, and does nothing when there is none. */
  readonly remove: (file: string) => Promise<void>;
}

/** What the disk is asked, so that the ways it can fail can be tried without failing one. */
export interface DiskLogCalls {
  readonly mkdir: (directory: string, options: { readonly recursive: true }) => Promise<unknown>;
  readonly appendFile: (file: string, text: string, encoding: 'utf8') => Promise<void>;
  readonly stat: (file: string) => Promise<{ readonly size: number }>;
  readonly rename: (from: string, to: string) => Promise<void>;
  readonly rm: (file: string, options: { readonly force: true }) => Promise<void>;
}

function isMissing(error: unknown): boolean {
  return (error as NodeJS.ErrnoException).code === 'ENOENT';
}

export function diskLogIoOver(disk: DiskLogCalls): FileLogIo {
  return {
    makeDirectory: async (directory) => {
      await disk.mkdir(directory, { recursive: true });
    },
    append: (file, text) => disk.appendFile(file, text, 'utf8'),
    size: async (file) => {
      try {
        return (await disk.stat(file)).size;
      } catch (error) {
        if (isMissing(error)) return 0;
        throw error;
      }
    },
    move: async (from, to) => {
      try {
        await disk.rename(from, to);
      } catch (error) {
        if (!isMissing(error)) throw error;
      }
    },
    remove: (file) => disk.rm(file, { force: true }),
  };
}

export const diskLogIo: FileLogIo = diskLogIoOver({ mkdir, appendFile, stat, rename, rm });

export type LogLevel = 'error' | 'warn' | 'info';

/** A megabyte for a file, and three files at most, so the log never takes more than three. */
const defaultMaxBytes = 1024 * 1024;
const defaultFiles = 3;

export interface FileLogOptions {
  readonly directory: string;
  readonly name?: string;
  readonly maxBytes?: number;
  /** How many files the log keeps, the one being written included. */
  readonly files?: number;
  /** Called with what went wrong when the log itself could not be written. */
  readonly onFailure?: (message: string, cause: unknown) => void;
  readonly io?: FileLogIo;
}

/**
 * The log of the app (ADR 0058): lines of text added to a file in a folder of its own, which is
 * started over when it would pass a size and keeps the last few. Writing is in the order asked
 * and never throws: a log that could not be written must not stop what it was meant to help with,
 * so a failure is handed to `onFailure` (the terminal) and the line is lost.
 */
export class FileLog {
  private readonly name: string;
  private readonly maxBytes: number;
  private readonly files: number;
  private readonly io: FileLogIo;
  private readonly onFailure: (message: string, cause: unknown) => void;
  private tail: Promise<void> = Promise.resolve();

  constructor(private readonly options: FileLogOptions) {
    this.name = options.name ?? 'mangabound.log';
    this.maxBytes = options.maxBytes ?? defaultMaxBytes;
    this.files = Math.max(1, options.files ?? defaultFiles);
    this.io = options.io ?? diskLogIo;
    this.onFailure = options.onFailure ?? (() => undefined);
  }

  /** The folder the log files are in. */
  get directory(): string {
    return this.options.directory;
  }

  /** Makes the folder, so that it can be opened before anything has been written. */
  async ensureFolder(): Promise<string> {
    await this.io.makeDirectory(this.options.directory);
    return this.options.directory;
  }

  /** Adds a line, after the ones asked before it. */
  write(level: LogLevel, text: string, now: Date = new Date()): void {
    const line = `${now.toISOString()} ${level.toUpperCase()} ${text}\n`;
    this.tail = this.tail
      .then(() => this.append(line))
      .catch((error: unknown) => {
        this.onFailure('The log could not be written.', error);
      });
  }

  /** Resolves once every line asked for has been written, or has failed. */
  settled(): Promise<void> {
    return this.tail;
  }

  private file(index = 0): string {
    return path.join(
      this.options.directory,
      index === 0 ? this.name : `${this.name}.${String(index)}`,
    );
  }

  private async append(line: string): Promise<void> {
    await this.io.makeDirectory(this.options.directory);
    const size = await this.io.size(this.file());
    // An empty file takes a line however long it is: starting it over would change nothing.
    if (size > 0 && size + Buffer.byteLength(line, 'utf8') > this.maxBytes) await this.startOver();
    await this.io.append(this.file(), line);
  }

  /** The oldest file goes, and each of the others takes the name of the one before it. */
  private async startOver(): Promise<void> {
    await this.io.remove(this.file(this.files - 1));
    for (let index = this.files - 2; index >= 0; index -= 1) {
      await this.io.move(this.file(index), this.file(index + 1));
    }
  }
}
