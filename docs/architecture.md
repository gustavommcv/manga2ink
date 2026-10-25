# Architecture overview

This page maps the code and the conversion flow. [ADR 0001](adr/0001-electron-react-and-module-boundaries.md) defines the boundaries; the [decision index](adr/README.md) explains the trade-offs.

For a focused task, use [current decisions by topic](current-decisions.md) to find the applicable amendments instead of reading the full ADR history.

## The idea in one paragraph

Manga2Ink orchestrates two bundled, version-pinned tools: **mangabind** groups chapters and writes volumes; **mangaprep** processes pages and creates books. The app handles choices, progress, saving, and sharing rather than reimplementing those algorithms. Dependencies point inward: adapters implement the application's ports, the application coordinates domain rules, and the domain has no framework or infrastructure dependencies.

## Repository responsibilities

| Repository                                            | Owns                                                                                                             | Does not own                                                              |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| [manga2ink](https://github.com/gustavommcv/manga2ink) | Desktop choices, mapping edits, workflow coordination, progress, persistence, export, sharing and the user guide | Chapter-name parsing, archive binding, image processing or book rendering |
| [mangabind](https://github.com/gustavommcv/mangabind) | Chapter discovery/parsing, grouping, binding and its standalone machine/terminal contract                        | Electron screens or e-reader image processing                             |
| [mangaprep](https://github.com/gustavommcv/mangaprep) | Device/page processing, book formats, navigation and its standalone machine/terminal contract                    | The app's queue, dialogs or save/recovery lifecycle                       |

Check the pinned binary before proposing an app-side workaround ([ADR 0006](adr/0006-cli-first-tool-boundary.md)). A missing CLI capability is implemented and released in its owning repository before the app updates its verified pin. Names of local checkout folders are not repository identities: older checkouts and records may still say Mangabound or mangapress. Use the Git remote and `toolchain.lock.json` to establish which repository and tools a task actually uses.

## Layers

| Folder                    | Responsibility                                                         | May import                                       |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| `src/domain`              | Pure mapping, queue, settings, and run-result rules                    | nothing                                          |
| `src/application`         | Workflows and the ports they require                                   | domain, library, opds, i18n                      |
| `src/adapters`            | CLI, process, filesystem, provider, and network implementations        | application, domain, shared, library, opds, i18n |
| `src/library`, `src/opds` | Pure catalog and feed logic                                            | domain, library, opds                            |
| `src/shared`              | Validated IPC contracts and shared bridge types                        | domain                                           |
| `src/i18n`                | What the app says, in each of its languages (typed catalogs)           | domain                                           |
| `src/main`                | Electron wiring, windows, trusted paths, ids, and command registration | all layers below it                              |
| `src/preload`             | The typed `window.manga2ink` bridge                                    | domain, shared                                   |
| `src/renderer`            | React screens, state, components, and UI helpers                       | domain, `shared`, `i18n`                         |

The table lists allowed project layers; imports within a layer are always allowed. The renderer has no Node, filesystem, or process access. Domain code imports no React, Electron, Node, or adapters. ESLint enforces these boundaries; [CONTRIBUTING](../CONTRIBUTING.md#module-boundaries) explains the checks.

`app.tsx` reads the desktop bridge and reports startup failure if it is missing. `WorkflowApp` receives the bridge, owns workflow state, and connects controlled screens. Navigation identifies the current queue item or library title without keeping a second copy of its draft.

## A conversion, step by step

1. **Add.** Native dialogs or dropped files supply paths. Main validates them and returns opaque selection ids to the renderer.
2. **Inspect.** For a folder, mangabind runs a dry-run on a scratch copy to seed the mapping or discover a library. A standalone CBZ needs no grouping. Each input receives an application-owned session.
3. **Review.** File-name grouping, optional online suggestions, and manual edits use the same undoable mapping model. Book details belong to each item; a folder's author and language are kept in its `mangabind.json`.
4. **Process.** Main creates a durable pending run and validates the selected steps. When enabled, mangabind builds volumes and mangaprep converts them through a bounded worker pool in isolated staging folders. Completed books are published under unique names in volume order; progress comes from the tools, cancellation reaches active processes, and partial successes remain available.
5. **Save.** Each book is indexed in the pending run. Save As or Save All copies it to a chosen destination and records the export. Save All never replaces existing files; an indexing warning retains the pending original for retry.
6. **Open or share.** Books open in the OS default application. An opt-in OPDS server serves a pending run or selected library on the chosen interface and a fixed port, and stops on exit. It lists recently converted books and other supported files separately.

Grouping and conversion can run together or separately where the input permits it: a folder of CBZ chapters and a library must be joined first ([ADR 0092](adr/0092-a-folder-of-cbz-chapters-is-always-joined-first.md)). For chapter folders, how the books are made is each series' choice (one for each volume, one for the whole series, or the folder as it is, [ADR 0094](adr/0094-a-series-is-one-book-without-needing-volumes.md)), and a series made into one book is bound and converted in one run, in any format ([ADR 0081](adr/0081-a-series-made-into-one-book-can-be-an-epub-a-cbz-or-a-pdf.md), with PDF navigation amended by [ADR 0083](adr/0083-a-series-made-into-one-pdf-has-its-volumes-and-chapters-as-bookmarks.md)); a standalone CBZ already represents one book and bypasses grouping. The workflow entry point is `application/workflows/conversion-workflow.ts`; its owners are described in [the application guide](../src/application/README.md). Concrete tool and storage implementations are listed in [the adapter guide](../src/adapters/README.md).

## What keeps it safe

- The window is sandboxed and context-isolated, with Node integration, external navigation, and new windows disabled. Its own `app://` scheme and CSP limit access; only clipboard-write permission is allowed ([ADR 0041](adr/0041-the-window-loads-its-page-from-its-own-scheme.md)).
- Shared schemas validate IPC commands before execution. Main resolves session, run, and artifact ids to trusted paths; the renderer cannot request arbitrary filesystem access. Catalog entries are checked to stay within their library, including when OPDS opens them.
- Bundled-tool hashes, versions, and protocol handshakes are verified before processing. A mismatch blocks conversion.
- Sharing starts only on a local network interface. Online providers supply metadata, not manga pages; the app has neither a downloader nor an integrated reader.

## What is kept between runs

- **Preferences:** device/options, the last save-dialog folder, and the chosen sharing interface live in per-user `settings.json`. A remembered folder is a suggestion, not an automatic output destination.
- **App settings:** what a person decided about the app itself, the language and the folder the app works in, lives in its own per-user `app-settings.json` ([ADR 0052](adr/0052-the-app-language-is-chosen-behind-a-gear.md), [ADR 0056](adr/0056-the-app-works-in-a-folder-a-person-can-choose.md)). It is not part of the preferences above, so a reset of the conversion options leaves it alone and a damaged file of one does not cost the other. The size and place of the window are in `window-state.json`, a file of their own ([ADR 0062](adr/0062-the-window-opens-as-it-was-left.md)). The theme (dark, light, or to look as the system does, which is where a person starts, [ADR 0070](adr/0070-the-theme-may-follow-the-system.md)), which is a block of the stylesheet's variables selected by an attribute of the page and the colors the window is painted with, is kept there too ([ADR 0066](adr/0066-the-look-of-the-app-is-a-theme-and-a-theme-is-a-block-of-tokens.md), [ADR 0067](adr/0067-the-light-theme.md)); the page is served already in it. What a queue does, telling when a long one ends and keeping the computer awake, is kept there too, and the main process learns that a queue is running from the window, from the click on Process to the last item ([ADR 0065](adr/0065-a-queue-is-a-signal-the-window-gives-the-main-process.md)). How many books of a title are converted at once (the app's own count, or a number up to what this computer can be asked for) is kept there too, and a queue keeps the choice it began with ([ADR 0068](adr/0068-how-many-are-converted-at-once-is-a-choice-a-queue-keeps.md)).
- **Pending books:** isolated directories under persistent local app data by default, or in the `Pending` folder of the working folder a person chose ([ADR 0056](adr/0056-the-app-works-in-a-folder-a-person-can-choose.md)), not OS temporary storage. Volumes are built in the system's temporary folder by default, or in that folder's `Scratch`; books left in an earlier folder stay listed. The queue warns, above the Process button, when the drives of those two folders have less room than the queue may take ([ADR 0060](adr/0060-the-queue-warns-of-too-little-room-before-processing.md)). Unsaved, partly saved, and warning-affected runs survive restart. The Processing tab says how much waits and deletes, after a question, the runs untouched for 7, 30 or 90 days ([ADR 0061](adr/0061-the-processing-tab-shows-what-waits-and-cleans-up-what-has-waited-long.md)). Successfully exported runs are cleaned up on exit; explicit deletion never deletes exported copies and is refused while the run is in use.
- **Library catalogs:** `<library>/.mangabound/library.json` records completed books for sharing. The hidden folder keeps the app's former name, so catalogs written before the app was Manga2Ink are still read ([ADR 0085](adr/0085-the-app-is-manga2ink-and-finds-what-mangabound-kept.md)).
- **Folder metadata:** `mangabind.json` retains the author and language beside the input.

On its first start under the new name, the app moves the settings folder, the pending books and the covers Mangabound kept to Manga2Ink's folders, before anything reads them ([ADR 0085](adr/0085-the-app-is-manga2ink-and-finds-what-mangabound-kept.md)); it moves the app's own files one by one, and the installer's own runs of the app start nothing ([ADR 0087](adr/0087-the-settings-move-takes-the-apps-own-files-and-the-installers-runs-start-nothing.md)). Queue drafts and sessions are not restored; scratch workspaces are cleaned up. The catalog, saved-state, settings, and metadata writers share atomic file replacement. This protects an individual write, not a transaction across files or a guarantee against power loss. [ADR 0026](adr/0026-process-then-save-pending-books.md) records the pending-book lifecycle.

## Where to change what

| Change                           | Start here                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Another online source            | [Provider guide](adding-a-metadata-provider.md), its adapter, and the registry                                  |
| A converter option               | Domain settings/validation, shared schema, CLI arguments, settings control, and tests; run `capabilities:check` |
| An IPC command                   | Shared contract/bridge, preload, validated registration in `main/ipc`, renderer call, and tests                 |
| A screen or component            | `renderer/screens` or `renderer/components`; reuse shared controls and add component/story coverage             |
| A use case                       | `application/workflows`; add a port and adapter only for an actual infrastructure need                          |
| A lasting architectural decision | A new [ADR](../CONTRIBUTING.md#writing-an-adr), preserving accepted history                                     |

## Tests, by layer

| Layer                                                                                         | Tests                                                                                                 |
| --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Domain, application, adapters, library, OPDS, renderer helpers, the main process, the preload | Vitest with real fixtures and recorded responses; 100% coverage on files listed in `vitest.config.ts` |
| React behavior                                                                                | React Testing Library against a fake bridge                                                           |
| UI states                                                                                     | Storybook interactions and axe accessibility checks; Playwright visual baselines                      |
| Critical desktop flows                                                                        | WebdriverIO against the packaged Electron app and real converters                                     |

These are complementary checks, not a claim of whole-app 100% coverage. [CONTRIBUTING](../CONTRIBUTING.md#testing-expectations) describes the commands and expectations.

## Documentation website

The independent Astro/Starlight package under `website/` imports no application modules. CI captures selected Storybook states from the same source commit and shares that artifact with site checks and publication. Astro produces responsive, losslessly optimized images; KOReader captures remain manual. Tutorial images do not replace visual baselines or enter the app installer. The pictures and measured tables of the advanced-options pages are committed files, made by running the pinned mangaprep on open-licensed comic pages ([ADR 0048](adr/0048-option-examples-from-open-pages.md)); the site's tests fail when they were made with another version than the one in `toolchain.lock.json`.

The guide and app captures follow `main`, not release tags ([ADR 0034](adr/0034-tutorial-images-from-the-site-source-commit.md)). Development, media, indexing, and dependency-audit details live in [website/README.md](../website/README.md), [MEDIA.md](../website/MEDIA.md), [SEO.md](../website/SEO.md), and [website/SECURITY.md](../website/SECURITY.md).
