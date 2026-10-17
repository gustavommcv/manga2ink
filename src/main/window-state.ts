import type { Rectangle, WindowPlacement, WindowState } from '@/domain/window-state';
import { defaultWindowSize, minimumWindowSize, placeWindow } from '@/domain/window-state';

/** What the keeper needs of the file: to read what was kept, and to keep what it is given. */
export interface WindowStateStore {
  /** Never fails: nothing kept, or what cannot be used, is undefined. */
  readonly load: () => Promise<WindowState | undefined>;
  readonly save: (state: WindowState) => Promise<void>;
}

/** What the keeper needs of a window: to hear of what moves it, and to say where it is. */
export interface TrackedWindow {
  readonly on: (
    event: 'resize' | 'move' | 'maximize' | 'unmaximize' | 'close' | 'closed',
    listener: () => void,
  ) => unknown;
  /** The size and place of the window when it is not maximized or full screen. */
  readonly getNormalBounds: () => Rectangle;
  readonly isMaximized: () => boolean;
  readonly isDestroyed: () => boolean;
}

/** How long a window must stay as it is before that is kept: a drag is a stream of moves. */
export const windowStateDelay = 500;

/**
 * Whether the system lets a program place its window. A Wayland session does not: where a window
 * goes is the compositor's, and a place that was asked for is ignored, so it is neither kept nor
 * trusted.
 */
export function windowPositionsAreKnown(
  platform: NodeJS.Platform,
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  return platform !== 'linux' || (env.XDG_SESSION_TYPE !== 'wayland' && !env.WAYLAND_DISPLAY);
}

const same = (a: WindowState, b: WindowState): boolean =>
  a.width === b.width &&
  a.height === b.height &&
  a.x === b.x &&
  a.y === b.y &&
  a.maximized === b.maximized;

/**
 * Keeps the size and place of the window between sessions (ADR 0062). It is read once, tells the
 * window where to open, and then follows the window: a size or place that has stayed for a moment
 * is kept, and the last one is kept when the window closes and when the app quits. A kept state
 * that fails to be written is told and does not stop anything: the window is what it was.
 */
export class WindowStateKeeper {
  private saved: WindowState | undefined;
  private readonly windows = new Set<TrackedWindow>();
  // Every write waits for the one before it, so the last state is the last one written.
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: WindowStateStore,
    /** The part of each display a window may use, the main display first. */
    private readonly areas: () => readonly Rectangle[],
    private readonly positionsKnown: boolean,
    private readonly report: (message: string, cause: unknown) => void,
    private readonly delay = windowStateDelay,
  ) {}

  /** Reads what was kept. */
  async restore(): Promise<void> {
    this.saved = await this.store.load();
  }

  /** Where and how big the window opens, from what was kept and the displays there are now. */
  placement(): WindowPlacement {
    return placeWindow(this.saved, this.areas(), defaultWindowSize, minimumWindowSize);
  }

  /** Follows a window from now on. */
  track(window: TrackedWindow): void {
    this.windows.add(window);
    let timer: NodeJS.Timeout | undefined;
    const later = (): void => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        this.keep(window);
      }, this.delay);
    };
    for (const event of ['resize', 'move', 'maximize', 'unmaximize'] as const) {
      window.on(event, later);
    }
    window.on('close', () => {
      clearTimeout(timer);
      this.keep(window);
    });
    window.on('closed', () => {
      clearTimeout(timer);
      this.windows.delete(window);
    });
  }

  /** Keeps every window as it is now, and resolves once everything asked for has been written. */
  flush(): Promise<void> {
    for (const window of this.windows) {
      if (!window.isDestroyed()) this.keep(window);
    }
    return this.tail;
  }

  private keep(window: TrackedWindow): void {
    const { x, y, width, height } = window.getNormalBounds();
    const state: WindowState = {
      width,
      height,
      ...(this.positionsKnown ? { x, y } : {}),
      maximized: window.isMaximized(),
    };
    if (this.saved !== undefined && same(this.saved, state)) return;
    this.saved = state;
    this.tail = this.tail
      .then(() => this.store.save(state))
      .catch((cause: unknown) => {
        this.report('The size and place of the window could not be kept.', cause);
      });
  }
}
