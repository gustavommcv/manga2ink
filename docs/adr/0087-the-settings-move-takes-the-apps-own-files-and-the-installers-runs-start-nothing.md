# ADR 0087: The settings move takes the app's own files, and the installer's own runs start nothing

- Status: Accepted
- Date: 2026-10-23
- Supersedes: [ADR 0086](0086-the-settings-move-takes-the-empty-folder-electron-makes-and-waits-for-mangabound.md)
- Amends: [ADR 0085](0085-the-app-is-manga2ink-and-finds-what-mangabound-kept.md) (how the settings folder moves)

## Context

Before 0.1.0-alpha.18 was tagged, the release's own Windows installer was run on a machine with Mangabound's real settings. Manga2Ink opened with its starting settings and moved nothing, though ADR 0086 had been checked with the real Electron.

The installer runs the app itself before the first start: Squirrel starts it with `--squirrel-install` to make the shortcuts. That run quit at once but still took the single-instance lock and went on to the start-up of a ready app, and it left the new settings folder with Electron's caches, its `Local State` and an empty `logs` folder. The first start then found the folder not empty, and ADR 0086 took that for a folder of Manga2Ink's own. Whether a folder is empty says nothing about whether Manga2Ink has started: Electron puts its own things there whenever it runs.

ADR 0086 also made Manga2Ink wait, with a message, while Mangabound was open, since a running app's folder cannot be renamed on Windows. The files the app keeps are not held open between writes, so they can be moved one by one while Mangabound runs.

## Decision

- **The first start is told by Manga2Ink's own settings files.** While none of `app-settings.json`, `settings.json` and `window-state.json` is in the new folder, Manga2Ink has not started before, whatever else Electron or the installer left there.
- **What the app keeps moves one entry at a time**: the three settings files, `logs` and, on macOS, `Pending` and `Covers`. An entry already in the new folder stays, unless it is an empty folder, which Mangabound's replaces. Electron's own files stay where they were, in Mangabound's folder. An entry that cannot be moved is told in the log, and the others still move.
- **Nothing waits for Mangabound to close.** The message of ADR 0086 and its words are gone. A log Mangabound has open may stay behind, and is told in the log.
- **A run of the installer's own starts nothing**: it takes no single-instance lock, and the start-up of a ready app does not run in it.

## Consequences

- Installing over a Mangabound that is open, or closed, brings its settings, window state and logs, and on macOS its pending books and covers, the first time Manga2Ink opens. Mangabound's folder keeps Electron's caches; Mangabound opened again afterwards starts with its starting settings.
- The installer's runs no longer do what a start does (the moves, the clean-up of earlier folders, the log) while it installs or removes the app.
- The release's Windows installer is run on the real case before the tag: Mangabound's settings on the machine, Mangabound open, and the shortcuts the installer makes.
