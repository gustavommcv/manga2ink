import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Rectangle, WindowState } from '@/domain/window-state';
import {
  type TrackedWindow,
  WindowStateKeeper,
  type WindowStateStore,
  windowPositionsAreKnown,
  windowStateDelay,
} from '@/main/window-state';

const main: Rectangle = { x: 0, y: 0, width: 1920, height: 1040 };

type Event = Parameters<TrackedWindow['on']>[0];

/** A window the keeper can follow, which says where it is when asked, and can be made to say it moved. */
function fakeWindow(initial: { bounds?: Rectangle; maximized?: boolean } = {}) {
  const listeners = new Map<Event, () => void>();
  const window = {
    bounds: initial.bounds ?? { x: 100, y: 50, width: 900, height: 600 },
    maximized: initial.maximized ?? false,
    destroyed: false,
    on: vi.fn((event: Event, listener: () => void) => {
      listeners.set(event, listener);
    }),
    getNormalBounds() {
      return window.bounds;
    },
    isMaximized: () => window.maximized,
    isDestroyed: () => window.destroyed,
    emit: (event: Event) => {
      listeners.get(event)?.();
    },
  };
  return window;
}

function store(loaded?: WindowState) {
  const saves: WindowState[] = [];
  const port = {
    saves,
    load: vi.fn(() => Promise.resolve(loaded)),
    save: vi.fn((state: WindowState) => {
      saves.push(state);
      return Promise.resolve();
    }),
  } satisfies WindowStateStore & { saves: WindowState[] };
  return port;
}

const keeperOf = (
  port: WindowStateStore,
  options: { positions?: boolean; report?: (message: string, cause: unknown) => void } = {},
) =>
  new WindowStateKeeper(port, () => [main], options.positions ?? true, options.report ?? vi.fn());

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('where the window opens', () => {
  it('opens at the size it always did before anything was kept', async () => {
    const keeper = keeperOf(store());
    await keeper.restore();

    expect(keeper.placement()).toEqual({ width: 1180, height: 760, maximized: false });
  });

  it('opens as it was left, once what was kept is read', async () => {
    const keeper = keeperOf(store({ width: 900, height: 600, x: 100, y: 50, maximized: true }));
    await keeper.restore();

    expect(keeper.placement()).toEqual({
      width: 900,
      height: 600,
      x: 100,
      y: 50,
      maximized: true,
    });
  });
});

describe('following the window', () => {
  it('keeps the size and place once the window has stayed as it is for a moment, and not before', async () => {
    const port = store();
    const keeper = keeperOf(port);
    await keeper.restore();
    const window = fakeWindow();
    keeper.track(window);

    window.emit('resize');
    await vi.advanceTimersByTimeAsync(windowStateDelay - 1);
    expect(port.saves).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);

    expect(port.saves).toEqual([{ width: 900, height: 600, x: 100, y: 50, maximized: false }]);
  });

  it('keeps only where a drag ended, not each step of it', async () => {
    const port = store();
    const keeper = keeperOf(port);
    await keeper.restore();
    const window = fakeWindow();
    keeper.track(window);

    for (const x of [110, 150, 220]) {
      window.bounds = { ...window.bounds, x };
      window.emit('move');
      await vi.advanceTimersByTimeAsync(windowStateDelay / 2);
    }
    await vi.advanceTimersByTimeAsync(windowStateDelay);

    expect(port.saves.map((state) => state.x)).toEqual([220]);
  });

  it.each(['resize', 'move', 'maximize', 'unmaximize'] as const)(
    'follows the window when it is told of %s',
    async (event) => {
      const port = store();
      const keeper = keeperOf(port);
      await keeper.restore();
      const window = fakeWindow({ maximized: event === 'maximize' });
      keeper.track(window);

      window.emit(event);
      await vi.advanceTimersByTimeAsync(windowStateDelay);

      expect(port.saves).toHaveLength(1);
      expect(port.saves[0]?.maximized).toBe(event === 'maximize');
    },
  );

  it('keeps the size it has when it is not maximized, and that it is, when it is maximized', async () => {
    const port = store();
    const keeper = keeperOf(port);
    await keeper.restore();
    // The window is maximized: the keeper asks for its normal bounds, which are the ones to come back to.
    const window = fakeWindow({
      bounds: { x: 40, y: 30, width: 800, height: 500 },
      maximized: true,
    });
    keeper.track(window);

    window.emit('maximize');
    await vi.advanceTimersByTimeAsync(windowStateDelay);

    expect(port.saves).toEqual([{ width: 800, height: 500, x: 40, y: 30, maximized: true }]);
  });

  it('keeps the window at once when it closes, without waiting for the moment', async () => {
    const port = store();
    const keeper = keeperOf(port);
    await keeper.restore();
    const window = fakeWindow();
    keeper.track(window);

    window.emit('close');
    await keeper.flush();

    expect(port.saves).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(windowStateDelay * 2);
    expect(port.saves).toHaveLength(1);
  });

  it('writes nothing when the window is as what is kept already', async () => {
    const port = store({ width: 900, height: 600, x: 100, y: 50, maximized: false });
    const keeper = keeperOf(port);
    await keeper.restore();
    const window = fakeWindow();
    keeper.track(window);

    window.emit('resize');
    window.emit('close');
    await vi.advanceTimersByTimeAsync(windowStateDelay);

    expect(port.save).not.toHaveBeenCalled();
  });

  it.each([
    ['width', { width: 901 }],
    ['height', { height: 601 }],
    ['x', { x: 101 }],
    ['y', { y: 51 }],
  ])('writes when only the %s is not what is kept', async (_which, change) => {
    const port = store({ width: 900, height: 600, x: 100, y: 50, maximized: false });
    const keeper = keeperOf(port);
    await keeper.restore();
    const window = fakeWindow({ bounds: { x: 100, y: 50, width: 900, height: 600, ...change } });
    keeper.track(window);

    window.emit('close');
    await keeper.flush();

    expect(port.saves).toHaveLength(1);
  });

  it('writes when only whether it is maximized is not what is kept', async () => {
    const port = store({ width: 900, height: 600, x: 100, y: 50, maximized: false });
    const keeper = keeperOf(port);
    await keeper.restore();
    const window = fakeWindow({ maximized: true });
    keeper.track(window);

    window.emit('close');
    await keeper.flush();

    expect(port.saves).toEqual([{ width: 900, height: 600, x: 100, y: 50, maximized: true }]);
  });

  it('opens the next window as the last was left, without reading the file again', async () => {
    const port = store();
    const keeper = keeperOf(port);
    await keeper.restore();
    const window = fakeWindow({ bounds: { x: 300, y: 200, width: 700, height: 500 } });
    keeper.track(window);
    window.emit('close');
    window.emit('closed');

    expect(keeper.placement()).toEqual({
      width: 700,
      height: 500,
      x: 300,
      y: 200,
      maximized: false,
    });
    expect(port.load).toHaveBeenCalledOnce();
  });

  it('does not keep where the window is when the system does not let a program place it', async () => {
    const port = store();
    const keeper = keeperOf(port, { positions: false });
    await keeper.restore();
    const window = fakeWindow();
    keeper.track(window);

    window.emit('close');
    await keeper.flush();

    expect(port.saves).toEqual([{ width: 900, height: 600, maximized: false }]);
    expect(port.saves[0]).not.toHaveProperty('x');
  });

  it('keeps nothing of a window that is gone, and its timer does not fire', async () => {
    const port = store();
    const keeper = keeperOf(port);
    await keeper.restore();
    const window = fakeWindow();
    keeper.track(window);

    window.emit('resize');
    window.emit('closed');
    await vi.advanceTimersByTimeAsync(windowStateDelay * 2);
    await keeper.flush();

    expect(port.save).not.toHaveBeenCalled();
  });
});

describe('keeping the window as the app quits', () => {
  it('keeps every window as it is now, and resolves once it is written', async () => {
    const port = store();
    const keeper = keeperOf(port);
    await keeper.restore();
    const window = fakeWindow();
    keeper.track(window);
    // A move an instant ago: its timer has not run, and the app is quitting.
    window.emit('move');

    await keeper.flush();

    expect(port.saves).toHaveLength(1);
  });

  it('leaves out a window that is already destroyed, which cannot say where it was', async () => {
    const port = store();
    const keeper = keeperOf(port);
    await keeper.restore();
    const window = fakeWindow();
    keeper.track(window);
    window.destroyed = true;

    await keeper.flush();

    expect(port.save).not.toHaveBeenCalled();
  });

  it('has nothing to wait for when there is no window', async () => {
    await expect(keeperOf(store()).flush()).resolves.toBeUndefined();
  });
});

describe('a window that cannot be kept', () => {
  it('tells it, and goes on keeping the next change', async () => {
    const report = vi.fn<(message: string, cause: unknown) => void>();
    const failure = new Error('read-only');
    const port = store();
    port.save.mockRejectedValueOnce(failure);
    const keeper = keeperOf(port, { report });
    await keeper.restore();
    const window = fakeWindow();
    keeper.track(window);

    window.emit('close');
    await keeper.flush();
    expect(report).toHaveBeenCalledExactlyOnceWith(
      'The size and place of the window could not be kept.',
      failure,
    );

    window.bounds = { ...window.bounds, width: 1000 };
    window.emit('close');
    await keeper.flush();

    expect(port.saves.map((state) => state.width)).toEqual([1000]);
  });

  it('writes one after another, so the last change is the one that stays', async () => {
    const order: string[] = [];
    let release: () => void = () => undefined;
    const port = {
      load: () => Promise.resolve(undefined),
      save: vi.fn((state: WindowState) => {
        order.push(`start ${String(state.width)}`);
        const first = order.length === 1;
        return new Promise<void>((resolve) => {
          const done = (): void => {
            order.push(`end ${String(state.width)}`);
            resolve();
          };
          if (first) release = done;
          else done();
        });
      }),
    };
    const keeper = keeperOf(port);
    await keeper.restore();
    const window = fakeWindow();
    keeper.track(window);

    window.emit('close');
    window.bounds = { ...window.bounds, width: 1000 };
    window.emit('close');
    await Promise.resolve();
    expect(order).toEqual(['start 900']);
    release();
    await keeper.flush();

    expect(order).toEqual(['start 900', 'end 900', 'start 1000', 'end 1000']);
  });
});

describe('whether the system lets a program place its window', () => {
  it.each([
    ['win32', {}, true],
    ['darwin', {}, true],
    ['linux', {}, true],
    ['linux', { XDG_SESSION_TYPE: 'x11' }, true],
    ['linux', { XDG_SESSION_TYPE: 'wayland' }, false],
    ['linux', { WAYLAND_DISPLAY: 'wayland-1' }, false],
    ['linux', { XDG_SESSION_TYPE: 'tty', WAYLAND_DISPLAY: 'wayland-0' }, false],
    ['win32', { WAYLAND_DISPLAY: 'wayland-1' }, true],
    ['darwin', { XDG_SESSION_TYPE: 'wayland' }, true],
  ] as const)('on %s with %j: %s', (platform, env, known) => {
    expect(windowPositionsAreKnown(platform, env)).toBe(known);
  });
});
