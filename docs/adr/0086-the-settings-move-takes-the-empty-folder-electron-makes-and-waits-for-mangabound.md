# ADR 0086: The settings move takes the empty folder Electron makes, and waits for Mangabound to close

- Status: Accepted
- Date: 2026-10-23
- Amends: [ADR 0085](0085-the-app-is-manga2ink-and-finds-what-mangabound-kept.md) (how the settings folder moves)

## Context

ADR 0085 moves the folder Mangabound kept its settings in to Manga2Ink's, in one rename, when the new folder is not there yet. Before 0.1.0-alpha.18 was released, the move was run with the real Electron instead of the unit tests' file system, and it never moved anything:

- Electron makes the settings folder, empty, the first time its path is asked for (`app.getPath('userData')`), and the app asks for it to know where to move. The new folder was always there, so the move always stood aside.
- On Windows a running app holds its settings folder, and renaming it is denied. The installer opens Manga2Ink as soon as it has installed it, often with Mangabound still open, so the move would have failed there, and the app would then have filled the new folder, which stops every later try.

Everyone updating would have opened Manga2Ink with its starting settings, and on macOS without the books not yet saved and the covers, which are in that folder. Nothing would have been deleted, but nothing would have been found again.

## Decision

- **An empty settings folder is still a first start.** When Mangabound's folder is there and Manga2Ink's is missing or empty, the empty one is removed and Mangabound's takes its place, in one rename. A folder with anything in it is Manga2Ink's own, and nothing is moved into it. If the rename fails, the empty folder is put back, the problem goes to the log, and the app starts.
- **On Windows the move waits while Mangabound is open.** Chromium keeps a `lockfile` open in a running app's settings folder; when Mangabound's cannot be opened for that reason, Manga2Ink says, in the system's language, to close Mangabound and open Manga2Ink again, and quits before anything is put in the new folder (the single-instance lock included). The next start finds the new folder still empty and moves Mangabound's. Elsewhere a folder in use can be renamed, and the move does not wait.

## Consequences

- A person who updates with Mangabound open, on Windows, sees the message once, closes Mangabound and opens Manga2Ink again; their settings are then there. Only a file Chromium holds counts as Mangabound being open, so a folder that cannot be moved for another reason does not keep the app from starting.
- The move was checked with the real Electron 44.5.1 on Windows, with probe apps that play the two apps under other names: a first start moves the folder; with the old app open the new one says so, quits in a tenth of a second and leaves the new folder empty, and the next start moves it; a new folder with settings of its own is left alone. Unit tests cover each of these and the failures.
- Checks that rest on how Electron or the system behave are run against them, not only against a file system the tests imitate.
