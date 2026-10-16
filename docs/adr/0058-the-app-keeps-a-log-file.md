# ADR 0058: The app keeps a log file, and says it may hold paths

- Status: Accepted
- Date: 2026-10-16
- Amends: [ADR 0057](0057-the-about-tab-helps-report-a-problem.md) (the folders that open by name have a second one, `logs`)
- Relates to: [ADR 0054](0054-the-about-tab-and-links-that-open-by-name.md) (the About tab), [ADR 0016](0016-one-share-panel-fixed-title-bar-clickable-drop-area.md) (the title bar)

## Context

The main process says that something went wrong by writing on its terminal (`console.error` and `console.warn`). A packaged app has no terminal a person looks at: on Windows and macOS nothing was seen unless the app was started from a command line, so a person who reported a failure had nothing to attach, and whoever answered had nothing to ask for.

What goes wrong is written with the places it went wrong in. A message may name the path of a book, of a folder chosen for the app to work in, or of the person's own files.

## Decision

- **The main process writes to a log file as well as to its terminal.** `console.error` and `console.warn` each do what they did and add a line to `mangabound.log`, in the folder `logs` inside the app's data. A line is the time, the level in capitals and the text; an error keeps its stack, which says where it went wrong. The app writes one line when it starts: its version, whether it is a packaged build, Electron, and the system. Nothing else is added to the log by being turned on: it holds what was already written on the terminal.
- **An exception that nothing caught is logged too, as it ends the app,** through the process's monitor of uncaught exceptions. It does not take the exception over: a handler would keep the app running, and the person would not be told.
- **The log starts over at a megabyte and keeps three files** (`mangabound.log`, `.1`, `.2`), so it never takes more than about three megabytes. The oldest goes when a line would pass the size, and a line longer than the size goes into an empty file instead of starting an empty one over.
- **A log that cannot be written never stops the app.** Lines are written in the order asked and a failure is told on the terminal and the line is lost. The log is the first thing made when the app is ready, so that what goes wrong afterwards is in it, and it is waited for last when the app quits, so that what the clean-up reports is in it.
- **The log may hold paths, and the app says so.** It is not redacted: a path is what says which file a failure was about, and a log without them would be much less use. Nothing is sent anywhere. The About tab says that the log may hold the paths of books and folders and that they should be looked at before they are shared, beside the diagnostics, which hold none (ADR 0057).
- **Its folder opens from the About tab,** by the name `logs`, as the data folder does. The folder is made before it is opened, so it can be opened before anything has been written.

## Consequences

- A report can come with a log, and what the app said on its terminal is no longer lost.
- A person shares a file that may name their files, knowing that it may.
- Whatever the main process writes with `console.error` or `console.warn` is in the log, so a message that would put something private in it is a decision, as it is on the terminal.
- The page's own errors (the window) are not in the log yet; that would be a second decision, since they carry the text of what a person typed.
