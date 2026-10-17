import path from 'node:path';
import { format } from 'node:util';

import type { FileLog } from '@/adapters/log/file-log';

/** The folder of the log files, inside the folder of the app's data. */
export function logFolder(userData: string): string {
  return path.join(userData, 'logs');
}

/** What the log listens to: the terminal the app writes its problems on, and the process. */
export interface LogTargets {
  readonly console: Pick<Console, 'error' | 'warn'>;
  readonly process: Pick<NodeJS.Process, 'on'>;
}

/**
 * Makes what the app writes on its terminal go to the log file too (ADR 0058). `console.error` and
 * `console.warn` are what the main process uses to say that something went wrong, so each keeps
 * doing what it did and adds the line to the log; and an exception nothing caught is written as it
 * is about to end the app. The last is a monitor, not a handler, so it does not change what the
 * process does with the exception (a handler would keep the app running, and the person would never
 * be told).
 */
export function installLog(log: FileLog, targets: LogTargets, started: string): void {
  for (const level of ['error', 'warn'] as const) {
    const terminal = targets.console[level].bind(targets.console);
    targets.console[level] = (...args: unknown[]): void => {
      terminal(...args);
      log.write(level, format(...args));
    };
  }
  targets.process.on('uncaughtExceptionMonitor', (error, origin) => {
    log.write('error', `Not caught (${origin}): ${error.stack ?? error.message}`);
  });
  log.write('info', started);
}
