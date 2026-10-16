# ADR 0053: What is said outside the window is a code, and the window writes it

- Status: Accepted
- Date: 2026-10-16
- Relates to: [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (the app has languages, and the window's own words are in catalogs), [ADR 0001](0001-electron-react-and-module-boundaries.md) (the layers)

## Context

ADR 0052 put the words of the window in catalogs and said that the sentences written outside it would become codes in a later stage. They are many: the domain says what a row of the queue is ("2 volumes", "Folder · 3 chapters · grouped from names") and why a step cannot change; the workflows and the main process say what failed, what could not be read and what was refused; the results say what was left out. Each is an English sentence built where the fact is known, with its numbers, its plurals and the names of the controls inside it. A sentence like that cannot be written in another language by the window, and a plural or a list of names does not work the same way in Portuguese or Japanese.

The same layers also write for a log or an error that nobody is meant to read, and for text that someone else wrote (a tool's report, an error of the system), which is not the app's to translate.

## Decision

- **What a person reads is a message: a code and the values it is about** (`{ id, values }`), plain data that crosses the bridge. The codes and the shape of their values are declared in the domain, a module of `src/domain/messages/` for each part of the app, and `MessageValues` joins them. `message('queue.chip.volumes', { count })` makes one. The domain, the workflows, the adapters and the main process write no sentence for a person.
- **The words are in the catalogs, in a layer of their own, `src/i18n`.** A part of the app has a module with a function for each of its codes, in every language, from the values to the sentence (`SaidFor<Values>`); the compiler fails for a code with no sentence in a language. The numbers, the plurals and the lists of names are the catalog's to say, so each language says them its own way (`countOf`, `namesOf`). A sentence that names a control uses the name the catalog gives that control in the same language.
- **The window writes a message with `say(messages.said, message)`**, and a note made of several sentences with `sayAll`. The renderer, the workflows, the adapters and the main process may import the catalogs (the layer imports the domain and nothing else), so the main process can write the title of a native dialog, and a workflow the English text of an error for a log.
- **What someone else wrote is `text.raw`** and is said as it is, in its own words: a tool's report, a message of the system, a title that a person typed. It is not translated, and the dialog of the app settings says so.
- **What is only for a log or a developer stays English** (an error that carries a technical reason, a diagnostic) and is not a message. What a person reads, even if it started as an error, is.
- **A test says each code in each language**: a table with a row for every code and every form it has (one and several, a list that is short and one that is long), with what it says in English, which is what the app said before, character for character, and what it says in Portuguese. The compiler fails for a code with no row.
- **It is done by parts, with the screen that shows the sentence.** The first part is the queue: what a row says, why a step cannot change, what a folder or a library note says, and what the run report carries about a row left out. Failures, notices, what the results say about warnings, the validation of mappings and options, the errors of the online sources and the titles of native dialogs follow, each with its screen, and the failure that crosses the bridge gets the message beside its code and its English text.

## Consequences

- The domain has no English sentence for a person: its tests say which code with which values, and the catalogs' tests say the sentences.
- A language is added by writing each part in it, and the compiler lists what is missing.
- Until a part is converted its sentences are English in every language, which is what ADR 0052 said.
- The run report and the queue's rows carry messages, not strings, so what they say is written when it is shown, in the language that is in use then.
