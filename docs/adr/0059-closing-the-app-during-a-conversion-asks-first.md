# ADR 0059: Closing the app while a conversion runs asks first

- Status: Accepted
- Date: 2026-10-16
- Relates to: [ADR 0026](0026-process-then-save-pending-books.md) (what survives a restart), [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (what a native dialog says is in the language of the window)

## Context

Quitting the app ends the conversions that are running (`cleanUpBeforeQuit` tells each to stop), and the books a conversion had not finished making are lost: only the ones already made wait in the list of ready books. A click on the close button of the window, or the quit key, did this without a word, and a conversion of a long series can take minutes.

## Decision

- **A native box asks first, and says it simply:** "A conversion is still running. If you close Mangabound now, it will be lost." with two buttons, **Keep converting** and **Close anyway**, in the language of the window. The first is the default and the one the Escape key gives, so leaving takes a decision.
- **Only a conversion counts.** The main process keeps the ids of the conversions that run (`runJob`, the one lifetime both kinds of conversion share), apart from the other jobs it holds (the search of an online source, the validation of a plan), which are over in a moment and lose nothing.
- **One question for one leaving.** Closing the window and quitting the app are asked through one guard, so a person agreeing to close the window is not asked again when the app quits as a result, and a second click while the box is open does not stack a second box. Keeping the conversion asks nothing more, and the next attempt asks again.
- **Where closing the window does not end the app, it is not asked.** On macOS the app stays when its last window closes, and the conversion goes on and makes its books, which can be reopened from the list of ready books; quitting (Cmd+Q) is asked there. On Windows and Linux closing the last window ends the app, so it is asked.

## Consequences

- A conversion is no longer lost to a click on the wrong button.
- It cannot ask when the system ends the app (a shutdown or a log-off) or kills it, and it does not try.
- A change to what counts as running is a change to `runJob` and to the guard, with tests in both; adding a job that should be protected means making it a conversion.
