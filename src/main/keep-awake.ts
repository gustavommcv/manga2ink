/** What Electron's `powerSaveBlocker` gives, as far as keeping awake needs it. */
export interface PowerBlocker {
  readonly start: (type: 'prevent-app-suspension') => number;
  readonly stop: (id: number) => void;
}

/**
 * Keeps the computer from going to sleep while it is wanted (ADR 0065), with one block however many
 * queues ask. `prevent-app-suspension` stops the system from suspending but lets the screen turn
 * off, which is what a long conversion wants.
 */
export class KeepAwake {
  private block: number | undefined;

  constructor(private readonly blocker: PowerBlocker) {}

  /** Holds the block while `wanted`, takes it when it is not, and does nothing when it is as it should be. */
  sync(wanted: boolean): void {
    if (wanted && this.block === undefined) {
      this.block = this.blocker.start('prevent-app-suspension');
    } else if (!wanted && this.block !== undefined) {
      this.blocker.stop(this.block);
      this.block = undefined;
    }
  }
}
