import { describe, expect, it, vi } from 'vitest';

import { longQueueMs, type QueueRunSummary } from '@/domain/queue-run';
import { dialogMessages } from '@/i18n/dialog-messages';
import { announceQueueEnd, type NoticeShell, noticeOf } from '@/main/queue-notice';

const english = dialogMessages.en.queueEnded;
const portuguese = dialogMessages['pt-BR'].queueEnded;

const summary = (overrides: Partial<QueueRunSummary> = {}): QueueRunSummary => ({
  books: 3,
  failures: 0,
  notes: 0,
  cancelled: false,
  ...overrides,
});

describe('what the notification says', () => {
  it('says the books are ready when the queue was clean', () => {
    expect(noticeOf(summary(), english)).toEqual({
      title: 'Your books are ready',
      body: '3 books ready to save in Mangabound.',
    });
    expect(noticeOf(summary({ books: 1 }), english)?.body).toBe(
      '1 book ready to save in Mangabound.',
    );
  });

  it('says there are notes to see when something was left out or came with one', () => {
    expect(noticeOf(summary({ notes: 2 }), english)).toEqual({
      title: 'Your books are ready, with notes',
      body: '3 books ready. Open Mangabound to see the notes.',
    });
  });

  it('says what failed, with the books that were made, or that nothing was', () => {
    expect(noticeOf(summary({ failures: 2 }), english)).toEqual({
      title: 'Some conversions failed',
      body: '3 books ready, 2 failures. Open Mangabound to see why.',
    });
    expect(noticeOf(summary({ failures: 1, books: 1 }), english)?.body).toBe(
      '1 book ready, 1 failure. Open Mangabound to see why.',
    );
    expect(noticeOf(summary({ failures: 4, books: 0 }), english)?.body).toBe(
      'Nothing was made. Open Mangabound to see why.',
    );
  });

  it('says nothing for a queue the person stopped, or one that made nothing', () => {
    expect(noticeOf(summary({ cancelled: true }), english)).toBeUndefined();
    expect(noticeOf(summary({ books: 0 }), english)).toBeUndefined();
  });

  it('says it in Portuguese for a window in Portuguese', () => {
    expect(noticeOf(summary(), portuguese)).toEqual({
      title: 'Seus livros estão prontos',
      body: '3 livros prontos para salvar no Mangabound.',
    });
    expect(noticeOf(summary({ books: 1 }), portuguese)?.body).toBe(
      '1 livro pronto para salvar no Mangabound.',
    );
    expect(noticeOf(summary({ notes: 1 }), portuguese)).toEqual({
      title: 'Seus livros estão prontos, com observações',
      body: '3 livros prontos. Abra o Mangabound para ver as observações.',
    });
    expect(noticeOf(summary({ failures: 1 }), portuguese)).toEqual({
      title: 'Algumas conversões falharam',
      body: '3 livros prontos, 1 falha. Abra o Mangabound para ver o motivo.',
    });
    expect(noticeOf(summary({ failures: 2, books: 0 }), portuguese)?.body).toBe(
      'Nada foi feito. Abra o Mangabound para ver o motivo.',
    );
    expect(noticeOf(summary({ failures: 2, books: 1 }), portuguese)?.body).toBe(
      '1 livro pronto, 2 falhas. Abra o Mangabound para ver o motivo.',
    );
  });
});

describe('telling that a queue has ended', () => {
  const long = longQueueMs + 1;

  function shell(overrides: Partial<NoticeShell> = {}): NoticeShell {
    return {
      supported: () => true,
      windowInFront: () => false,
      show: vi.fn(),
      bringWindowForward: vi.fn(),
      ...overrides,
    };
  }
  const queue = (overrides: Partial<Parameters<typeof announceQueueEnd>[0]> = {}) => ({
    summary: summary(),
    elapsedMs: long,
    enabled: true,
    words: english,
    ...overrides,
  });

  it('shows the notification for a long queue that ended with nobody looking, which brings the window forward when clicked', () => {
    const system = shell();

    announceQueueEnd(queue(), system);

    expect(system.show).toHaveBeenCalledExactlyOnceWith(
      { title: 'Your books are ready', body: '3 books ready to save in Mangabound.' },
      system.bringWindowForward,
    );
  });

  it.each([
    ['it was short', queue({ elapsedMs: longQueueMs })],
    ['it is turned off', queue({ enabled: false })],
    ['the person stopped it', queue({ summary: summary({ cancelled: true }) })],
    ['it made nothing', queue({ summary: summary({ books: 0 }) })],
  ])('shows nothing when %s', (_reason, asked) => {
    const system = shell();

    announceQueueEnd(asked, system);

    expect(system.show).not.toHaveBeenCalled();
  });

  it('shows nothing while a window of the app is in front', () => {
    const system = shell({ windowInFront: () => true });

    announceQueueEnd(queue(), system);

    expect(system.show).not.toHaveBeenCalled();
  });

  it('shows nothing, and asks nothing more, when the system cannot show a notification', () => {
    const windowInFront = vi.fn(() => false);
    const system = shell({ supported: () => false, windowInFront });

    announceQueueEnd(queue(), system);

    expect(system.show).not.toHaveBeenCalled();
    expect(windowInFront).not.toHaveBeenCalled();
  });
});
