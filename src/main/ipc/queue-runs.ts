import { BrowserWindow, Notification, powerSaveBlocker } from 'electron';

import type { DialogMessages } from '@/i18n/dialog-messages';
import { endQueueCommandSchema } from '@/shared/queue-run-contract';

import { KeepAwake, type PowerBlocker } from '../keep-awake';
import { announceQueueEnd, type Notice, type NoticeShell } from '../queue-notice';
import type { QueueChoices, QueueRuns } from '../queue-runs';
import { handle, ignoredPayloadSchema } from './handle';
import { ok } from './result';

/** What of a page the queues need to know: which it is, and when it goes away or starts over. */
export interface WatchedPage {
  readonly id: number;
  once(event: 'destroyed', listener: () => void): unknown;
  once(event: 'render-process-gone', listener: () => void): unknown;
  on(
    event: 'did-start-navigation',
    listener: (details: {
      readonly isMainFrame: boolean;
      readonly isSameDocument: boolean;
    }) => void,
  ): unknown;
}

/** What the handlers use that is of the system and not of the app, so the rest can be tried without one. */
export interface QueueSystem {
  readonly blocker: PowerBlocker;
  readonly shell: NoticeShell;
}

/** Notifications that were shown and not yet closed: one that is let go of can vanish before it is clicked. */
const shown = new Set<Notification>();

/** The system as it is in the app: Electron's power blocker, notifications and windows. */
export function electronQueueSystem(): QueueSystem {
  const bringWindowForward = (): void => {
    const [window] = BrowserWindow.getAllWindows();
    if (window === undefined) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  };
  return {
    blocker: powerSaveBlocker,
    shell: {
      supported: () => Notification.isSupported(),
      windowInFront: () => BrowserWindow.getAllWindows().some((window) => window.isFocused()),
      show: (notice: Notice, onClick: () => void) => {
        const notification = new Notification({ title: notice.title, body: notice.body });
        shown.add(notification);
        notification.on('click', () => {
          shown.delete(notification);
          onClick();
        });
        notification.on('close', () => {
          shown.delete(notification);
        });
        notification.show();
      },
      bringWindowForward,
    },
  };
}

/**
 * The signal that a queue is running (ADR 0065): the window says when a press of Process begins and
 * when it ends, and the main process keeps the count for three things: asking before the app is
 * closed, keeping the computer awake, and telling a long queue's end when nobody is looking. The
 * window never says what is converted, and a queue whose window goes away is let go of.
 */
export function registerQueueRunHandlers(
  context: {
    readonly queueRuns: QueueRuns;
    /** The choices as they are now, read when a queue begins. */
    readonly choices: () => QueueChoices;
    /** What a notification says, in the language of the window now. */
    readonly words: () => DialogMessages['queueEnded'];
  },
  system: QueueSystem,
): void {
  const { queueRuns } = context;
  const awake = new KeepAwake(system.blocker);
  queueRuns.onChange(() => {
    awake.sync(queueRuns.keepsAwake);
  });

  const watched = new WeakSet<object>();
  /** A page's queues are let go of when it is destroyed, its process dies, or it loads another page. */
  const watch = (page: WatchedPage): void => {
    if (watched.has(page)) return;
    watched.add(page);
    const release = (): void => {
      queueRuns.releaseOwner(page.id);
    };
    page.once('destroyed', release);
    page.once('render-process-gone', release);
    page.on('did-start-navigation', (details) => {
      if (details.isMainFrame && !details.isSameDocument) release();
    });
  };

  handle('queue:begin', ignoredPayloadSchema, (event) => {
    watch(event.sender);
    return ok(queueRuns.begin(event.sender.id, context.choices()));
  });

  handle('queue:end', endQueueCommandSchema, (_event, command) => {
    const ended = queueRuns.end(command.token);
    if (ended !== undefined) {
      announceQueueEnd(
        {
          summary: command.summary,
          elapsedMs: ended.elapsedMs,
          enabled: ended.notifyWhenDone,
          words: context.words(),
        },
        system.shell,
      );
    }
    return ok(undefined);
  });
}
