import type { DialogMessages } from '@/i18n/dialog-messages';
import { endingOf, type QueueRunSummary, shouldNotify } from '@/domain/queue-run';

/** What a notification says. */
export interface Notice {
  readonly title: string;
  readonly body: string;
}

/** What the system gives the app for telling something to a person who is not looking at it. */
export interface NoticeShell {
  /** Whether the system can show a notification at all (a Linux without a daemon cannot). */
  readonly supported: () => boolean;
  /** Whether a window of the app is the one in front. */
  readonly windowInFront: () => boolean;
  /** Shows it; `onClick` is what happens when it is clicked. */
  readonly show: (notice: Notice, onClick: () => void) => void;
  /** Brings the window of the app forward, restored if it was minimized. */
  readonly bringWindowForward: () => void;
}

/** What a queue says as it ends, in the words of the window's language, or nothing to say. */
export function noticeOf(
  summary: QueueRunSummary,
  words: DialogMessages['queueEnded'],
): Notice | undefined {
  const ending = endingOf(summary);
  switch (ending) {
    case undefined:
      return undefined;
    case 'done':
      return { title: words.done.title, body: words.done.body(summary.books) };
    case 'notes':
      return { title: words.notes.title, body: words.notes.body(summary.books) };
    case 'failures':
      return {
        title: words.failures.title,
        body: words.failures.body(summary.books, summary.failures),
      };
  }
}

/**
 * Tells, through the system, that a queue has ended, when that is called for (ADR 0065): the queue
 * was a long one, no window of the app is in front, the person asked for it, and the system can show
 * it. Clicking the notification brings the window forward.
 */
export function announceQueueEnd(
  queue: {
    readonly summary: QueueRunSummary;
    readonly elapsedMs: number;
    readonly enabled: boolean;
    readonly words: DialogMessages['queueEnded'];
  },
  shell: NoticeShell,
): void {
  const notice = noticeOf(queue.summary, queue.words);
  if (notice === undefined || !shell.supported()) return;
  if (
    !shouldNotify({
      elapsedMs: queue.elapsedMs,
      windowInFront: shell.windowInFront(),
      enabled: queue.enabled,
    })
  ) {
    return;
  }
  shell.show(notice, shell.bringWindowForward);
}
