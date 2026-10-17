/** What a queue was started with: the choices as they were then, since a change is for the next one (ADR 0065). */
export interface QueueChoices {
  readonly keepAwake: boolean;
  readonly notifyWhenDone: boolean;
}

/** What is left of a queue once it has ended: how long it ran, and whether its end is to be told. */
export interface EndedQueue {
  readonly elapsedMs: number;
  readonly notifyWhenDone: boolean;
}

interface Queue {
  /** The window that began it, by the id of its page. */
  readonly owner: number;
  readonly startedAt: number;
  readonly choices: QueueChoices;
}

/** What a registry needs from the outside, so it can be tried without a clock or a window. */
export interface QueueRunSources {
  readonly now: () => number;
  readonly newToken: () => string;
}

/**
 * The queues that are running: one for each press of Process, from the click to the last item. The
 * window says when one begins and when it ends, and this is the one place that knows whether any is
 * running, for what needs to know it: asking before the app closes, keeping the computer awake and
 * telling when a long one ends (ADR 0065).
 *
 * A queue that nobody will ever end is the thing to avoid, so every queue belongs to a window, and
 * what happens to the window (it goes, it reloads, the app quits) lets go of its queues.
 */
export class QueueRuns {
  private readonly queues = new Map<string, Queue>();
  private readonly listeners = new Set<() => void>();

  constructor(private readonly sources: QueueRunSources) {}

  /**
   * Starts counting a queue for a window, and gives the token that ends it. The choices are copied:
   * what is chosen later is for the next queue, whatever object they came in.
   */
  begin(owner: number, choices: QueueChoices): string {
    const token = this.sources.newToken();
    this.queues.set(token, {
      owner,
      startedAt: this.sources.now(),
      choices: { keepAwake: choices.keepAwake, notifyWhenDone: choices.notifyWhenDone },
    });
    this.changed();
    return token;
  }

  /** Ends a queue; nothing when the token is not one that is running (it ended, or its window went). */
  end(token: string): EndedQueue | undefined {
    const queue = this.queues.get(token);
    if (queue === undefined) return undefined;
    this.queues.delete(token);
    this.changed();
    return {
      elapsedMs: this.sources.now() - queue.startedAt,
      notifyWhenDone: queue.choices.notifyWhenDone,
    };
  }

  /** Lets go of every queue a window began: it was closed, its page crashed or it was loaded again. */
  releaseOwner(owner: number): void {
    let released = false;
    for (const [token, queue] of this.queues) {
      if (queue.owner !== owner) continue;
      this.queues.delete(token);
      released = true;
    }
    if (released) this.changed();
  }

  /** Lets go of every queue, as the app quits. */
  releaseAll(): void {
    if (this.queues.size === 0) return;
    this.queues.clear();
    this.changed();
  }

  /** Whether a queue is running, which the app is not to be left without asking. */
  get running(): boolean {
    return this.queues.size > 0;
  }

  /** Whether a queue that is running asked for the computer to be kept awake. */
  get keepsAwake(): boolean {
    return [...this.queues.values()].some((queue) => queue.choices.keepAwake);
  }

  /** Calls `listener` every time a queue begins, ends or is let go of. */
  onChange(listener: () => void): void {
    this.listeners.add(listener);
  }

  private changed(): void {
    for (const listener of this.listeners) listener();
  }
}
