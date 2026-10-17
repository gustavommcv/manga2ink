import { EventEmitter } from 'node:events';
import path from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { FileLog } from '@/adapters/log/file-log';
import { installLog, logFolder } from '@/main/log';

/** A log that remembers what it is told. */
function recordingLog(): { readonly log: FileLog; readonly written: [string, string][] } {
  const written: [string, string][] = [];
  const log = {
    write: (level: string, text: string) => {
      written.push([level, text]);
    },
  } as unknown as FileLog;
  return { log, written };
}

function terminal(): {
  readonly console: Pick<Console, 'error' | 'warn'>;
  readonly shown: [string, unknown[]][];
} {
  const shown: [string, unknown[]][] = [];
  return {
    shown,
    console: {
      error: (...args: unknown[]) => {
        shown.push(['error', args]);
      },
      warn: (...args: unknown[]) => {
        shown.push(['warn', args]);
      },
    },
  };
}

describe('where the log is', () => {
  it('is a folder of its own inside the folder of the app’s data', () => {
    expect(logFolder(path.join('home', 'reader', 'config'))).toBe(
      path.join('home', 'reader', 'config', 'logs'),
    );
  });
});

describe('what the log takes from the terminal', () => {
  it('is what the app says is wrong or worrying, which still goes to the terminal', () => {
    const { log, written } = recordingLog();
    const { console: target, shown } = terminal();
    installLog(log, { console: target, process: new EventEmitter() as never }, 'Started.');

    target.error('Could not move it.', 7);
    target.warn('Look at %s', 'this');

    expect(shown).toEqual([
      ['error', ['Could not move it.', 7]],
      ['warn', ['Look at %s', 'this']],
    ]);
    expect(written).toEqual([
      ['info', 'Started.'],
      ['error', 'Could not move it. 7'],
      ['warn', 'Look at this'],
    ]);
  });

  it('keeps the stack of an error, which is what says where it went wrong', () => {
    const { log, written } = recordingLog();
    const { console: target } = terminal();
    installLog(log, { console: target, process: new EventEmitter() as never }, 'Started.');
    const failure = new Error('permission denied');

    target.error('Could not clear exported pending books.', failure);

    expect(written.at(-1)?.[1]).toContain('Could not clear exported pending books.');
    expect(written.at(-1)?.[1]).toContain('Error: permission denied');
    expect(written.at(-1)?.[1]).toContain(failure.stack?.split('\n')[1]?.trim() ?? '');
  });

  it('is told the app has started, before anything else', () => {
    const { log, written } = recordingLog();

    installLog(
      log,
      { console: terminal().console, process: new EventEmitter() as never },
      'Hello.',
    );

    expect(written).toEqual([['info', 'Hello.']]);
  });
});

describe('what the log takes from an exception that nothing caught', () => {
  it('is written when it is about to end the app, with where it came from', () => {
    const { log, written } = recordingLog();
    const process = new EventEmitter();
    installLog(log, { console: terminal().console, process: process as never }, 'Started.');
    const failure = new Error('boom');

    process.emit('uncaughtExceptionMonitor', failure, 'unhandledRejection');

    expect(written.at(-1)?.[0]).toBe('error');
    expect(written.at(-1)?.[1]).toContain('Not caught (unhandledRejection): ');
    expect(written.at(-1)?.[1]).toContain('Error: boom');
  });

  it('is said by its message when it has no stack', () => {
    const { log, written } = recordingLog();
    const process = new EventEmitter();
    installLog(log, { console: terminal().console, process: process as never }, 'Started.');
    const failure = new Error('no stack here');
    delete failure.stack;

    process.emit('uncaughtExceptionMonitor', failure, 'uncaughtException');

    expect(written.at(-1)?.[1]).toBe('Not caught (uncaughtException): no stack here');
  });

  it('only watches: it does not become the handler that keeps the app running', () => {
    const { log } = recordingLog();
    const process = new EventEmitter();
    const on = vi.spyOn(process, 'on');

    installLog(log, { console: terminal().console, process: process as never }, 'Started.');

    expect(on.mock.calls.map(([event]) => event)).toEqual(['uncaughtExceptionMonitor']);
  });
});
