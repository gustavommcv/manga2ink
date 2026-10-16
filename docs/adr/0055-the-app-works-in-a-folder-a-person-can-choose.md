# ADR 0055: The app works in a folder a person can choose

- Status: Accepted
- Date: 2026-10-16
- Amends: [ADR 0026](0026-process-then-save-pending-books.md) (where finished books wait is no longer fixed), [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (the app settings file keeps one more thing)
- Relates to: [ADR 0054](0054-the-about-tab-and-links-that-open-by-name.md) (the tabs of the dialog), [ADR 0014](0014-persisted-settings-and-reset.md) (what a reset leaves alone)

## Context

Two places hold nearly everything the app writes while it works, and a person can change neither.

- **Volumes are built in the system's temporary folder.** mangabind binds a series into volumes in a workspace there, about as big as the series, and removes it when the item leaves the queue. On many Linux machines that folder is a tmpfs of a few gigabytes; a long series does not fit, and the conversion fails for a reason that is not about the series.
- **Finished books wait in the app's own data folder** (ADR 0026) until they are saved, which is on the system drive, often the smallest one. The only way to move them was an environment variable made for tests.

Nothing else is big: mangapress writes its temporary file beside the book it makes, inside the pending folder, and mangabind keeps nothing of its own. The covers a person attaches are small files of theirs and stay where they are.

## Decision

- **One folder for both.** A person may choose a folder; inside it the app makes `Pending` (finished books) and `Scratch` (volumes while converting). With none chosen the app works where it always did: its data folder and the system's temporary folder. The folder is a setting in `app-settings.json` (`processingFolder`, and `earlierProcessingFolders`, below), in the same file and version as the language: a file without them reads as none chosen, and an older app that reads one ignores them.
- **A tab of its own, Processing, between Interface and About.** It shows the folder, the two places in use, the room left on the drive, and the folders that still hold books. **Choose a folder…** and **Use the default folder** are its two buttons.
- **The window never gives a path.** It asks the main process, which opens the dialog, checks the folder (an absolute path, a folder that is there, in which the app can make `Pending` and `Scratch` and write) and only then keeps it. A folder that cannot be used is refused with a reason. What the tab shows is what the main process says it is doing.
- **It applies to the next thing the app does.** Every place that needs a folder asks where it is at that moment, so there is nothing to restart. A change is refused while a conversion or a share is running, so that nothing is moved from under it; the check is made again after the dialog, which takes a while.
- **Books already waiting stay where they are, and stay listed.** Runs are looked for in the folder in use, in the app's own place, and in every folder that was chosen before, so the books can still be saved, shared or deleted. A folder chosen before is remembered until it is there and holds no run (a drive that is not connected is kept, since it may have books on it), and the tab says how many are waiting in each. Nothing is copied or moved.
- **Sharing:** the feed of all ready books serves the folder in use. A conversion left in an earlier folder is shared on its own, from its results, under the same name.
- **Nothing falls back.** A chosen folder that is not there (a drive taken out) is not made again and not replaced by the temporary folder, which may be the very reason it was chosen: the conversion fails and says which folder is missing, and the tab says it too. **Use the default folder** is the way out.
- **Left-over scratch is cleared in every place it may have been left**, by the rule that already applies (a workspace nothing has touched for a day), and a place that is not there has nothing to clear. A workspace is taken away where it was made, even when the folder has changed since.

## Consequences

- A person with a small system drive or a small tmpfs can point the app at a big one and convert long series.
- Two folders are the app's own inside the chosen one, so a folder with other things in it is safe: the app removes only what it made and recognises.
- The books waiting in earlier folders are the app's to remember: the file grows by the list of those folders, which is short and forgets itself.
- A conversion left in an earlier folder is not part of the feed of all ready books, only of its own share.
- A later setting about where things go (a default place to save) is a different decision: this one is where the app works, not where the books end up.
