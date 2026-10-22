import { EventEmitter } from 'node:events';

import type { IpcMainInvokeEvent } from 'electron';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { longQueueMs } from '@/domain/queue-run';
import { dialogMessages } from '@/i18n/dialog-messages';
import {
  electronQueueSystem,
  type QueueSystem,
  registerQueueRunHandlers,
} from '@/main/ipc/queue-runs';
import { type QueueChoices, QueueRuns } from '@/main/queue-runs';
import { endQueueCommandSchema } from '@/shared/queue-run-contract';
import type { WorkflowResult } from '@/shared/workflow-contract';

type Listener = (event: IpcMainInvokeEvent, payload: unknown) => Promise<WorkflowResult<unknown>>;

interface FakeWindow {
  isMinimized: () => boolean;
  isFocused: () => boolean;
  restore: () => void;
  show: () => void;
  focus: () => void;
}

const electron = vi.hoisted(() => ({
  listeners: new Map<string, unknown>(),
  windows: [] as unknown[],
  blocker: { start: vi.fn(), stop: vi.fn() },
  // The fake class below stands here, since the mock is built before the class exists.
  notification: undefined as unknown as new (options: { title: string; body: string }) => object,
  notificationsSupported: (): boolean => true,
}));
vi.mock('electron', () => ({
  ipcMain: {
    handle: (channel: string, listener: unknown) => {
      electron.listeners.set(channel, listener);
    },
  },
  BrowserWindow: { getAllWindows: () => electron.windows },
  Notification: class {
    static isSupported(): boolean {
      return electron.notificationsSupported();
    }
    constructor(options: { title: string; body: string }) {
      return new electron.notification(options);
    }
  },
  powerSaveBlocker: electron.blocker,
}));

class FakeNotification extends EventEmitter {
  static supported: boolean = true;
  static shown: FakeNotification[] = [];
  constructor(readonly options: { title: string; body: string }) {
    super();
  }
  show(): void {
    FakeNotification.shown.push(this);
  }
}
electron.notification = FakeNotification;
electron.notificationsSupported = () => FakeNotification.supported;

const mainFrame = {};

/** A page, as the main process sees it: an emitter with an id, which the handlers watch for its end. */
function aPage(id: number): EventEmitter & { id: number; mainFrame: object } {
  return Object.assign(new EventEmitter(), { id, mainFrame });
}
type Page = ReturnType<typeof aPage>;

const call = (
  channel: string,
  sender: Page,
  payload?: unknown,
  frame: object | null = mainFrame,
): Promise<WorkflowResult<unknown>> =>
  (electron.listeners.get(channel) as Listener)(
    { sender, senderFrame: frame } as unknown as IpcMainInvokeEvent,
    payload,
  );

const words = dialogMessages.en.queueEnded;

function setUp(overrides: { now?: () => number } = {}): {
  readonly runs: QueueRuns;
  readonly system: QueueSystem;
  readonly start: ReturnType<typeof vi.fn<(type: 'prevent-app-suspension') => number>>;
  readonly stop: ReturnType<typeof vi.fn<(id: number) => void>>;
  readonly show: ReturnType<typeof vi.fn>;
  /** The choices a queue begins with; a test changes them, to see a queue keep the ones it began with. */
  readonly choices: { -readonly [Choice in keyof QueueChoices]: QueueChoices[Choice] };
  readonly time: { now: number };
  readonly inFront: { value: boolean };
} {
  const time = { now: 0 };
  let counter = 0;
  const runs = new QueueRuns({
    now: overrides.now ?? (() => time.now),
    newToken: () => `queue-${String(++counter)}`,
  });
  const start = vi.fn<(type: 'prevent-app-suspension') => number>(() => 7);
  const stop = vi.fn<(id: number) => void>();
  const show = vi.fn();
  const inFront = { value: false };
  const choices: { -readonly [Choice in keyof QueueChoices]: QueueChoices[Choice] } = {
    keepAwake: true,
    notifyWhenDone: true,
    parallelConversions: 'automatic',
  };
  const system: QueueSystem = {
    blocker: { start, stop },
    shell: {
      supported: () => true,
      windowInFront: () => inFront.value,
      show,
      bringWindowForward: vi.fn(),
    },
  };
  registerQueueRunHandlers({ queueRuns: runs, choices: () => choices, words: () => words }, system);
  return { runs, system, start, stop, show, choices, time, inFront };
}

const clean = { books: 2, failures: 0, notes: 0, cancelled: false };

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
  FakeNotification.shown = [];
  FakeNotification.supported = true;
});
afterEach(() => {
  electron.listeners.clear();
  electron.windows = [];
  vi.restoreAllMocks();
});

describe('the command that ends a queue', () => {
  it('takes a token and a count of books, failures and notes, and whether it was stopped', () => {
    expect(endQueueCommandSchema.parse({ token: 'queue-1', summary: clean })).toEqual({
      token: 'queue-1',
      summary: clean,
    });
  });

  it.each([
    {},
    { token: '', summary: clean },
    { token: 'x'.repeat(201), summary: clean },
    { token: 'queue-1' },
    { token: 'queue-1', summary: { ...clean, books: -1 } },
    { token: 'queue-1', summary: { ...clean, books: 1.5 } },
    { token: 'queue-1', summary: { ...clean, failures: 1_000_001 } },
    { token: 'queue-1', summary: { ...clean, notes: '2' } },
    { token: 'queue-1', summary: { ...clean, cancelled: 'no' } },
    'queue-1',
    null,
  ])('refuses %j', (command) => {
    expect(endQueueCommandSchema.safeParse(command).success).toBe(false);
  });

  it('drops what it does not know, such as the name of a book', () => {
    expect(
      endQueueCommandSchema.parse({ token: 'queue-1', summary: { ...clean, name: 'One Piece' } }),
    ).toEqual({ token: 'queue-1', summary: clean });
  });
});

describe('the signal that a queue has begun', () => {
  it('gives the window a token, and the queue is running', async () => {
    const { runs } = setUp();

    const answer = await call('queue:begin', aPage(1));

    expect(answer).toEqual({ ok: true, value: 'queue-1' });
    expect(runs.running).toBe(true);
  });

  it('keeps the computer awake from then, and stops once the queue has ended', async () => {
    const { start, stop } = setUp();
    const page = aPage(1);
    const answer = await call('queue:begin', page);
    expect(start).toHaveBeenCalledExactlyOnceWith('prevent-app-suspension');

    await call('queue:end', page, { token: (answer as { value: string }).value, summary: clean });

    expect(stop).toHaveBeenCalledExactlyOnceWith(7);
  });

  it('holds one block for queues that overlap, and lets go when the last has ended', async () => {
    const { start, stop } = setUp();
    const page = aPage(1);
    const first = await call('queue:begin', page);
    const second = await call('queue:begin', page);
    expect(start).toHaveBeenCalledOnce();

    await call('queue:end', page, { token: (first as { value: string }).value, summary: clean });
    expect(stop).not.toHaveBeenCalled();
    await call('queue:end', page, { token: (second as { value: string }).value, summary: clean });

    expect(stop).toHaveBeenCalledOnce();
  });

  it('does not keep the computer awake for a queue begun with that turned off', async () => {
    const { start, choices } = setUp();
    choices.keepAwake = false;

    await call('queue:begin', aPage(1));

    expect(start).not.toHaveBeenCalled();
  });

  it('is for the queue that begins, so a change made while it runs does not touch it', async () => {
    const { runs, choices, time, show } = setUp();
    const page = aPage(1);
    const begun = await call('queue:begin', page);
    choices.notifyWhenDone = false;
    choices.keepAwake = false;
    time.now = longQueueMs + 1;

    await call('queue:end', page, { token: (begun as { value: string }).value, summary: clean });

    expect(show).toHaveBeenCalledOnce();
    expect(runs.running).toBe(false);
  });

  it('refuses a request that did not come from the window’s own page, and begins nothing', async () => {
    const { runs } = setUp();

    const answer = await call('queue:begin', aPage(1), undefined, {});

    expect(answer).toMatchObject({ ok: false, error: { code: 'untrusted_sender' } });
    expect(runs.running).toBe(false);
  });
});

describe('the signal that a queue has ended', () => {
  it('ends the queue, and says so, when its token is the one it was given', async () => {
    const { runs } = setUp();
    const page = aPage(1);
    const begun = await call('queue:begin', page);

    const answer = await call('queue:end', page, {
      token: (begun as { value: string }).value,
      summary: clean,
    });

    expect(answer).toEqual({ ok: true, value: undefined });
    expect(runs.running).toBe(false);
  });

  it('tells a long queue’s end through the system, and brings the window back when it is clicked', async () => {
    const { show, system, time } = setUp();
    const page = aPage(1);
    const begun = await call('queue:begin', page);
    time.now = longQueueMs + 1;

    await call('queue:end', page, { token: (begun as { value: string }).value, summary: clean });

    expect(show).toHaveBeenCalledExactlyOnceWith(
      { title: 'Your books are ready', body: '2 books ready to save in Manga2Ink.' },
      system.shell.bringWindowForward,
    );
  });

  it('tells nothing of a short queue, of one with a window in front, or of one begun with it turned off', async () => {
    const { show, time, inFront, choices } = setUp();
    const page = aPage(1);
    const token = async (): Promise<string> =>
      ((await call('queue:begin', page)) as { value: string }).value;

    const short = await token();
    time.now = 1_000;
    await call('queue:end', page, { token: short, summary: clean });

    const looked = await token();
    inFront.value = true;
    time.now += longQueueMs + 1;
    await call('queue:end', page, { token: looked, summary: clean });
    inFront.value = false;

    choices.notifyWhenDone = false;
    const quiet = await token();
    time.now += longQueueMs + 1;
    await call('queue:end', page, { token: quiet, summary: clean });

    expect(show).not.toHaveBeenCalled();
  });

  it('is told in the words the window has now', async () => {
    const { runs, time, show, system } = setUp();
    const page = aPage(1);
    const begun = await call('queue:begin', page);
    time.now = longQueueMs + 1;

    await call('queue:end', page, {
      token: (begun as { value: string }).value,
      summary: { ...clean, failures: 1 },
    });

    expect(show).toHaveBeenCalledExactlyOnceWith(
      {
        title: 'Some conversions failed',
        body: '2 books ready, 1 failure. Open Manga2Ink to see why.',
      },
      system.shell.bringWindowForward,
    );
    expect(runs.running).toBe(false);
  });

  it('says nothing, and tells nothing, of a token that is not a queue that is running', async () => {
    const { show, time } = setUp();
    time.now = longQueueMs + 1;

    const answer = await call('queue:end', aPage(1), { token: 'made-up', summary: clean });

    expect(answer).toEqual({ ok: true, value: undefined });
    expect(show).not.toHaveBeenCalled();
  });

  it('refuses what is not a command to end a queue', async () => {
    const { runs } = setUp();
    const page = aPage(1);
    await call('queue:begin', page);

    const answer = await call('queue:end', page, { token: 'queue-1' });

    expect(answer).toMatchObject({ ok: false });
    expect(runs.running).toBe(true);
  });
});

describe('a queue whose window goes away', () => {
  async function begun(): Promise<{
    readonly page: Page;
    readonly runs: QueueRuns;
    readonly stop: ReturnType<typeof vi.fn<(id: number) => void>>;
  }> {
    const { runs, stop } = setUp();
    const page = aPage(1);
    await call('queue:begin', page);
    return { page, runs, stop };
  }

  it('is let go of when the page is destroyed, and the computer may sleep again', async () => {
    const { page, runs, stop } = await begun();

    page.emit('destroyed');

    expect(runs.running).toBe(false);
    expect(stop).toHaveBeenCalledOnce();
  });

  it('is let go of when the process of the page dies', async () => {
    const { page, runs } = await begun();

    page.emit('render-process-gone');

    expect(runs.running).toBe(false);
  });

  it('is let go of when the page loads another page, but not for a move within the same one', async () => {
    const { page, runs } = await begun();

    page.emit('did-start-navigation', { isMainFrame: true, isSameDocument: true });
    page.emit('did-start-navigation', { isMainFrame: false, isSameDocument: false });
    expect(runs.running).toBe(true);
    page.emit('did-start-navigation', { isMainFrame: true, isSameDocument: false });

    expect(runs.running).toBe(false);
  });

  it('watches a page once, however many queues it begins', async () => {
    const { runs } = setUp();
    const page = aPage(1);
    await call('queue:begin', page);
    await call('queue:begin', page);

    expect(page.listenerCount('destroyed')).toBe(1);
    expect(page.listenerCount('render-process-gone')).toBe(1);
    expect(page.listenerCount('did-start-navigation')).toBe(1);
    page.emit('destroyed');
    expect(runs.running).toBe(false);
  });

  it('does not touch the queues of another window', async () => {
    const { runs } = setUp();
    const first = aPage(1);
    const second = aPage(2);
    await call('queue:begin', first);
    await call('queue:begin', second);

    first.emit('destroyed');

    expect(runs.running).toBe(true);
  });

  it('is ended for nothing when its end arrives late, after it was let go of', async () => {
    const { runs, time, show } = setUp();
    const page = aPage(1);
    const begun = await call('queue:begin', page);
    page.emit('render-process-gone');
    time.now = longQueueMs + 1;

    await call('queue:end', page, { token: (begun as { value: string }).value, summary: clean });

    expect(runs.running).toBe(false);
    expect(show).not.toHaveBeenCalled();
  });
});

describe('the system as the app has it', () => {
  const window = (overrides: Partial<FakeWindow> = {}): FakeWindow => ({
    isMinimized: () => false,
    isFocused: () => false,
    restore: vi.fn(),
    show: vi.fn(),
    focus: vi.fn(),
    ...overrides,
  });

  it('blocks suspension through Electron’s power blocker', () => {
    expect(electronQueueSystem().blocker).toBe(electron.blocker);
  });

  it('can show a notification when the system says it can', () => {
    expect(electronQueueSystem().shell.supported()).toBe(true);
    FakeNotification.supported = false;
    expect(electronQueueSystem().shell.supported()).toBe(false);
  });

  it('has a window in front when any window of the app has the focus', () => {
    const { shell } = electronQueueSystem();
    expect(shell.windowInFront()).toBe(false);
    electron.windows = [window(), window({ isFocused: () => true })];
    expect(shell.windowInFront()).toBe(true);
    electron.windows = [window(), window()];
    expect(shell.windowInFront()).toBe(false);
  });

  it('shows the notification with its words, and brings the window forward when it is clicked', () => {
    const { shell } = electronQueueSystem();
    const onClick = vi.fn();

    shell.show({ title: 'Done', body: 'Two books.' }, onClick);

    const [shown] = FakeNotification.shown;
    expect(shown?.options).toEqual({ title: 'Done', body: 'Two books.' });
    shown?.emit('click');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('keeps hold of a notification until it is clicked or closed, so that it is not let go of before', () => {
    const { shell } = electronQueueSystem();
    shell.show({ title: 'One', body: '1' }, vi.fn());
    shell.show({ title: 'Two', body: '2' }, vi.fn());
    const [first, second] = FakeNotification.shown;

    first?.emit('click');
    second?.emit('close');

    expect(FakeNotification.shown).toHaveLength(2);
  });

  it('brings the only window forward, restored if it was minimized', () => {
    const minimized = window({ isMinimized: () => true });
    electron.windows = [minimized];

    electronQueueSystem().shell.bringWindowForward();

    expect(minimized.restore).toHaveBeenCalledOnce();
    expect(minimized.show).toHaveBeenCalledOnce();
    expect(minimized.focus).toHaveBeenCalledOnce();
  });

  it('brings a window that is not minimized forward without restoring it', () => {
    const plain = window();
    electron.windows = [plain];

    electronQueueSystem().shell.bringWindowForward();

    expect(plain.restore).not.toHaveBeenCalled();
    expect(plain.show).toHaveBeenCalledOnce();
    expect(plain.focus).toHaveBeenCalledOnce();
  });

  it('has nothing to bring forward when there is no window', () => {
    electron.windows = [];

    expect(() => {
      electronQueueSystem().shell.bringWindowForward();
    }).not.toThrow();
  });
});
