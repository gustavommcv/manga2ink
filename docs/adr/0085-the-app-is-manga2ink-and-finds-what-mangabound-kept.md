# ADR 0085: The app is Manga2Ink, and finds what Mangabound kept

- Status: Accepted
- Date: 2026-10-22
- Amends: [ADR 0014](0014-persisted-settings-and-reset.md) and [ADR 0026](0026-process-then-save-pending-books.md) (the folders the settings and the pending books are kept in)

## Context

The app was Mangabound up to 0.1.0-alpha.17. From 0.1.0-alpha.18 it is **Manga2Ink**: the name says what it does, manga to an e-ink reader. A new logo, drawn as an editable drawing with the name in its own type, comes with it.

The name was more than words in the window. It named the folders the app keeps a person's things in, chosen by Electron from the product name or by this app (ADR 0014, ADR 0026):

|         | Settings, window state, logs               | Books not saved yet, covers           |
| ------- | ------------------------------------------ | ------------------------------------- |
| Windows | `%APPDATA%\Mangabound`                     | `%LOCALAPPDATA%\Mangabound Data`      |
| macOS   | `~/Library/Application Support/Mangabound` | the same folder (`Pending`, `Covers`) |
| Linux   | `~/.config/Mangabound`                     | `~/.local/share/mangabound`           |

It named the hidden `.mangabound` folder the app writes into a person's library folders (the catalog of saved books that sharing lists) and into each pending run, the scratch folders in the temporary folder (`mangabound-XXXXXX`), the packages and their installers, the repository and the guide's address, and every page of the guide in three languages.

## Decision

- **Manga2Ink everywhere the name is read**: the window, its messages in every language, the guide, the README and the contributor documents, the packages, the executable and the installers. `manga2ink` where a lowercase name is needed: the npm package, the executable, the Linux packages, the environment variables of the tests (`MANGA2INK_…`), the scratch folders.
- **The repository is renamed with the release**: `github.com/gustavommcv/manga2ink`, and the guide at `gustavommcv.github.io/manga2ink/`. GitHub sends the repository's old address to the new one; GitHub Pages does not, so the guide's old address stops answering. The site offers the last Mangabound release, whose files keep their names, until the first Manga2Ink release replaces it.
- **What Mangabound kept moves to Manga2Ink's folders, once.** The settings folder moves whole, in one rename beside itself, before the single-instance lock makes the new one; on macOS the books not saved yet and the covers are inside it and go with it. On Windows and Linux they move from `Mangabound Data` and `mangabound` to `Manga2Ink Data` and `manga2ink`, with the move that already took them out of the installer's folder (`moveLegacyStorage`): a folder moves whole when the new place has none, entry by entry when it has, and nothing already there is replaced. Nothing is moved into a settings folder chosen on the command line, or from a root chosen by the environment, and nothing that goes wrong stops the app: it is told in the log.
- **What is written in a person's own folders keeps its name.** The hidden `.mangabound` folder of a library (the catalog) and of a pending run is read and written under that name, so the books Mangabound saved are still listed and shared. The scratch folders a killed Mangabound left in the temporary folder are still cleared.
- **The packages take each other's place where they can**: the RPM obsoletes `mangabound`, the Arch package conflicts with and replaces it. The Debian package cannot say so (electron-installer-debian has no such field), and the Windows installer is another app to Squirrel: there, Mangabound stays installed until it is removed, and the release notes say so.
- **The record keeps the old name.** Decision records, release notes, audits and the milestones tell what was decided and released as Mangabound and are left as written. mangabind and mangapress keep their names.

## Consequences

- A person who updates finds their settings, the books they had not saved, their covers and their library's catalog where they were, under the new name. One who runs Mangabound again after Manga2Ink has started gets a Mangabound with nothing kept, since its folders moved.
- On Windows and Debian-based systems, Mangabound has to be uninstalled by hand; its installer folder and its menu entry stay until then.
- Until the repository is renamed, the site cannot be built from this change: the releases are read from the new repository's address. The two go together, at 0.1.0-alpha.18.
- The icons are still Mangabound's picture under the new file names until the new logo replaces them.
- Unit tests cover moving the settings folder (whole, never into a chosen folder, never over a new one, a failure told), the moves of the books and covers on each platform and with roots chosen by the environment, the order of the moves at start-up, the scratch folders of both names, and the site offering a release with Mangabound's file names.
