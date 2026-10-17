/** What there is to let go of when the app quits. */
export interface QuitCleanup {
  /** Lets go of the queues that are running, which stops what was held for them (ADR 0065). */
  readonly releaseQueues: () => void;
  readonly activeJobs: ReadonlyMap<string, { readonly abort: () => void }>;
  readonly releaseAll: (() => Promise<unknown>) | undefined;
  readonly stopSharing: (() => Promise<unknown>) | undefined;
  readonly settlePreferences: (() => Promise<unknown>) | undefined;
  readonly settleAppSettings: (() => Promise<unknown>) | undefined;
  readonly pruneCompleted: (() => Promise<unknown>) | undefined;
  /** Keeps the window as it is, which a quit may reach before the last move was written (ADR 0062). */
  readonly settleWindowState: (() => Promise<unknown>) | undefined;
  /** The last lines of the log, which are written after everything above has had its say. */
  readonly settleLog: (() => Promise<unknown>) | undefined;
}

/**
 * Lets go of everything the app holds, in the order that keeps a person's work: the queues that were
 * running are let go of, so the computer is no longer kept awake for them, and running
 * conversions are told to stop; the scratch copies, the sharing server and a setting changed an
 * instant ago (of the conversion options or of the app) and the place of the window are let go of, whatever each does; and only then are the pending runs whose every
 * book was saved removed, since nothing is serving or saving them any more. A failure of the last is
 * reported, never allowed to keep the app from quitting, which `quit` ends either way. The log is
 * waited for last, so that what the clean-up itself reports is in it.
 */
export async function cleanUpBeforeQuit(
  cleanup: QuitCleanup,
  quit: () => void,
  report: (message: string, cause: unknown) => void,
): Promise<void> {
  cleanup.releaseQueues();
  for (const controller of cleanup.activeJobs.values()) controller.abort();
  try {
    await Promise.allSettled([
      cleanup.releaseAll?.(),
      cleanup.stopSharing?.(),
      cleanup.settlePreferences?.(),
      cleanup.settleAppSettings?.(),
      cleanup.settleWindowState?.(),
    ]);
    await cleanup.pruneCompleted?.();
  } catch (error) {
    report('Could not clear exported pending books.', error);
  } finally {
    await Promise.allSettled([cleanup.settleLog?.()]);
    quit();
  }
}
