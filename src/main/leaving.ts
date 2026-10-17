import { type BrowserWindow, dialog } from 'electron';

import type { DialogMessages } from '@/i18n/dialog-messages';

/**
 * Asks before the app is left while a conversion runs (ADR 0059). Leaving ends the conversion, and
 * what it had made is lost, so a person is asked once, and what they answer holds for the rest of
 * the leaving: the window closing and then the app quitting are one thing to them.
 */
export class LeavingGuard {
  private agreed = false;
  private asking = false;

  constructor(
    private readonly converting: () => boolean,
    private readonly ask: () => Promise<boolean>,
  ) {}

  /**
   * Whether the app can be left now. When it cannot, the person is asked, and if they agree
   * `leave` is called to go on with what was interrupted.
   */
  allows(leave: () => void): boolean {
    if (this.agreed || !this.converting()) return true;
    if (!this.asking) {
      this.asking = true;
      void this.ask().then((agrees) => {
        this.asking = false;
        if (!agrees) return;
        this.agreed = true;
        leave();
      });
    }
    return false;
  }
}

/**
 * The question, as a native box over the window: the safe answer is the default one and the one
 * the Escape key gives, so leaving takes a decision.
 */
export async function askToLeave(
  words: DialogMessages['leaveWhileConverting'],
  window: BrowserWindow | undefined,
): Promise<boolean> {
  const options = {
    type: 'warning' as const,
    message: words.message,
    detail: words.detail,
    buttons: [words.keep, words.leave],
    defaultId: 0,
    cancelId: 0,
  };
  const { response } = await (window === undefined
    ? dialog.showMessageBox(options)
    : dialog.showMessageBox(window, options));
  return response === 1;
}
