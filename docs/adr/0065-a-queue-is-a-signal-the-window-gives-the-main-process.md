# ADR 0065: A queue is a signal the window gives the main process, and three things follow it

- Status: Accepted
- Date: 2026-10-17
- Amends: [ADR 0059](0059-closing-the-app-during-a-conversion-asks-first.md) (what counts as something to lose when the app is closed)
- Relates to: [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (the app's own settings and the words of the main process), [ADR 0053](0053-what-is-said-outside-the-window-is-a-code.md), [ADR 0056](0056-the-app-works-in-a-folder-a-person-can-choose.md) (the Processing tab)

## Context

ADR 0059 asks before the app is closed while a conversion runs, and it counts a conversion from the moment `runJob` registers it. A press of **Process** is longer than that: the window first makes the pending folder and reads the plan, then converts the items one after another, and between two items nothing is converting at all. Closing the window in either moment lost the queue without a word. That is also what made the packaged `leaving` test race on Windows: it had to wait for the first progress before closing, because only then did the main process know anything was running.

Two things a person with a long queue also wants have the same shape. The computer should not go to sleep halfway through a series, and when the queue ends and the window is out of sight, something should say so. All three need the main process to know that a queue is running, from the click to the last item, which only the window knows.

## Decision

- **The window says when a queue begins and when it ends.** `queue:begin` has no payload and answers with a token; `queue:end` takes the token and how the queue went. `startRun` begins it at the click, before the pending folder is made, and ends it in a `finally`, so a failure, a cancel or an error in the middle of the loop still ends it. A queue is one press of **Process**, however many items it holds. The window never says what is being converted: what it sends at the end is four numbers and a yes or no (books made, items that failed, items left out or with a note, and whether the person stopped it).
- **Not being able to say it is not a reason not to convert.** If `queue:begin` fails or never arrives, the queue runs as it did before ADR 0065, protected by the conversions it makes.
- **The main process keeps the queues** in `QueueRuns` (`src/main/queue-runs.ts`): a token for each, the window that began it, when it began, and the choices it began with. It is the one place that says whether a queue is running. The choices are read once, when the queue begins, so a change in the settings is for the next queue and does not touch the one that is running.
- **A queue is never left running.** Every queue belongs to a window. The page's `destroyed` and `render-process-gone` events, and a navigation of its main frame (a reload) let go of its queues, and the quit step lets go of all of them. A late `queue:end` for a queue that was let go of finds nothing and does nothing.
- **Three things follow the count:**
  1. **Asking before the app is closed.** The guard of ADR 0059 asks when `queueRuns.running || conversions.size > 0`. A queue that has begun and has not yet converted, or is between two items, is something to lose. The question and its words are the same, and so is the rule for macOS (closing the window does not end the app, so it is not asked there; quitting is).
  2. **Keeping the computer awake.** One `powerSaveBlocker` of type `prevent-app-suspension` is held while any running queue asked for it, and taken when the last one ends, whatever way it ends. That type stops the system from suspending and lets the screen turn off, which is what a long conversion wants. `KeepAwake` takes the blocker as a parameter, so it is tried without Electron.
  3. **Telling a long queue's end.** When a queue ends, the main process shows a system notification only if the queue took more than 30 seconds from the click, no window of the app is in front, the person asked for it when the queue began, the system can show one, and the person did not stop the queue. `shouldNotify` is a pure rule with the 30 seconds as an exported constant. Three texts say how it ended (the books are ready; ready with notes, when items were left out or a book came with a warning; some failed, with the books that were made), in the language of the window, from the catalog the native dialogs use. Selecting the notification restores the window if it was minimized and brings it forward. Notifications are kept in a set until they are clicked or closed, since one that is let go of can disappear before it is seen.
- **Two choices, on by default, in the Processing tab.** **Tell me when a long conversion ends** and **Keep the computer awake while converting**, kept in `app-settings.json` as `notifyWhenDone` and `keepAwake`. The file stays at version 1: a key that is missing or is not a yes or no reads as on, as `processingFolder` reads as none. The window changes them through `app:save-settings`, whose payload is now the choices that changed (one or several, at least one, nothing else), so a change to one is written with the rest as it is.

## What is not verified, and why

None of this is checked by the continuous integration, which has no desktop to show a notification on or sleep to prevent. What the tests do check: the registry, the rule, the three texts, the handlers (against a fake of Electron's `ipcMain`, `Notification`, `BrowserWindow` and `powerSaveBlocker`), the window's side (the queue begins before the pending folder, ends with the right numbers, and goes on when it cannot be told), the file, the tab, and, in the packaged app, that closing the window right after **Process** asks and that the choices reach the file. The packaged `leaving` test does not tell the new signal from the old rule: the gap it closes (the queue has begun and no conversion has yet) lasts a few milliseconds there, and the test still passed with the signal taken out of the guard. The unit tests of the guard's wiring and the component tests (the queue begins before the pending folder is made, and ends in every way it can) are what hold it.

What only a real machine can show:

- **Windows.** A toast needs an AppUserModelID with a shortcut in the Start Menu. Electron's documentation says that an app installed with Squirrel (the installer the app ships) has it set automatically; the code does not set one. The portable `.zip` has no shortcut, so a notification there may not appear. Not tried.
- **macOS.** The alphas are not signed (`docs/release-checklist.md`). Whether macOS shows a notification for an unsigned app, or asks for permission first, was not tried; the reports found are about builds without even an ad-hoc signature, which is a different case. Closing the last window leaves the app running on macOS, and with it the conversion, but the queue's window is gone, so the queue is let go of and the computer is no longer kept awake: the conversion goes on, unprotected from sleep, until it ends.
- **Linux.** A notification needs a daemon that shows them; `Notification.isSupported()` says whether the system has one, and nothing is shown when it does not.
- **Lid and idle.** `prevent-app-suspension` is about the system going idle. Whether closing a laptop's lid still suspends it depends on the system and its settings; the guide says it may.

## Consequences

- Closing the window after pressing **Process**, or between two items, asks first, on every system where it asked before. The packaged `leaving` test no longer waits for the first progress.
- A conversion can run for hours without the computer going to sleep, if the person leaves it so, and a person who goes away from a long queue can be told it is done. Both are theirs to turn off, and a change is for the next queue.
- `AppSettings` now has two yes-or-no choices next to the language, and its change is a set of choices. Another choice added later is one more key in the same file and the same command.
- A new command pair in the main process, counted by the preload test, and the quit step has one more thing to let go of. Adding something that should be protected against closing or sleep means making it part of a queue, not adding another counter.
