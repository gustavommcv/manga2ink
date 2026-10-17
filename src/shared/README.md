# Shared

The contracts that both sides of the window agree on, and nothing else: zod schemas and the plain types they describe.

- `workflow-contract.ts`: the commands and results of reading, planning and converting, and the schema every conversion command is checked against.
- `settings-contract.ts`: what is kept between sessions. The same schema checks the settings file and what the page sends to be saved, so the two cannot drift.
- `app-settings-contract.ts`: what a person decided about the app itself (the language, ADR 0052, and what a queue does, ADR 0065): the command that keeps the choices that changed, what the window starts from, and the language that comes to.
- `queue-run-contract.ts`: the command that ends a queue, with how it went in numbers and no name or path (ADR 0065); beginning one takes no payload.
- `processing-folder-contract.ts`: where the app works, as the window is told of it: the folder chosen, the places in use, the room left, and the folders that still hold books (ADR 0056). No command carries a path: the window asks the main process to open a dialog. The room of the drives, for the warning of the queue (ADR 0060), is `WorkingSpace` in `src/domain/working-space.ts`. `pending-cleanup-contract.ts` is the command of the clean-up of what has waited, the number of days only (ADR 0061); the days and the totals are in `src/domain/pending-cleanup.ts`.
- `app-folders-contract.ts`: the folders of the app the window can ask to have opened in the file manager, by name (its data, and its logs); the path is the main process's (ADR 0057, ADR 0058).
- `project-links-contract.ts`: the places the About tab sends a person to, by name and with the window's language, never an address (ADR 0054). One of them, the release notes, is the page of the version that is running, which the main process knows; another, `releases`, is the page where a newer version is downloaded, which the Updates tab opens (ADR 0063).
- `opds-contract.ts`: starting and stopping sharing, and its status.
- `runtime-info.ts`: the type of the bridge the page sees as `window.mangabound`. Adding a method here is the first step of adding an IPC command.
- `toolchain-status.ts`: what the page is told about the bundled tools.

Everything here must be serializable. It may import from the domain, never from the application, adapters, or any UI.
