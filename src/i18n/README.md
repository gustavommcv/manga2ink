# i18n

What the app says, in each of its languages (ADR 0052). Plain TypeScript with no React, Electron or Node, so the window, the main process and the workflows can all write the same words.

- `messages.ts` composes the parts of the app into one `Messages` object for each language, and names each language in itself. A part is a module with its messages for every language (`Record<Language, …>`), so a message that is missing in a language is a compile error, and adding a language is one entry in each part.
- `app-settings-messages.ts`, `queue-messages.ts`, `settings-messages.ts`, `shared-messages.ts`: the words of the settings dialog, the queue screen, the controls the conversion options share, and what every screen shares. The rest of the window is still written in its components and moves over screen by screen.
- `say.ts` and the `*-said.ts` modules (`queue`, `mode`, `input`, `failure`, `notice`, `workflow`, `save`, `provider`, `text`): what the domain, the workflows, the adapters and the main process say by code (ADR 0053), a module for each of the modules of `src/domain/messages/`. A message is `{ id, values }`, declared in `src/domain/messages/`; a part of the app has a module with a function for each of its codes, in every language, and `say()` writes a message (`sayAll()` a note of several). A code with no sentence in a language is a compile error. `tests/unit/i18n-said.test.ts` has a row for every code and every form it has (the queue's in the test itself, what is said when something cannot be done in `tests/unit/support/said-failure-rows.ts`), with its English (what the app has always said, character for character) and its Portuguese.
- `dialog-messages.ts`: the titles and filters the main process gives the native dialogs, in each language; `src/main/ipc/dialog-words.ts` picks the language the window is in.
- `count.ts`: the form of a word that goes with a count (the singular for exactly one, the plural for the rest).

It is under the 100% unit gate. `tests/unit/i18n-messages.test.ts` says every message that is a function, in every language and in each form it has, and fails for one with no sample, so a message cannot be added without being said once in each language.

It may import the domain and nothing else (ESLint enforces it, ADR 0001), and the renderer, the main process, the application layer and the adapters may import it.
