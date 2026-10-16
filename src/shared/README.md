# Shared

The contracts that both sides of the window agree on, and nothing else: zod schemas and the plain types they describe.

- `workflow-contract.ts`: the commands and results of reading, planning and converting, and the schema every conversion command is checked against.
- `settings-contract.ts`: what is kept between sessions. The same schema checks the settings file and what the page sends to be saved, so the two cannot drift.
- `app-settings-contract.ts`: what a person decided about the app itself (the language, ADR 0052): the command that keeps it, what the window starts from, and the language that comes to.
- `processing-folder-contract.ts`: where the app works, as the window is told of it: the folder chosen, the places in use, the room left, and the folders that still hold books (ADR 0056). No command carries a path: the window asks the main process to open a dialog.
- `project-links-contract.ts`: the places the About tab sends a person to, by name and with the window's language, never an address (ADR 0054).
- `opds-contract.ts`: starting and stopping sharing, and its status.
- `runtime-info.ts`: the type of the bridge the page sees as `window.mangabound`. Adding a method here is the first step of adding an IPC command.
- `toolchain-status.ts`: what the page is told about the bundled tools.

Everything here must be serializable. It may import from the domain, never from the application, adapters, or any UI.
