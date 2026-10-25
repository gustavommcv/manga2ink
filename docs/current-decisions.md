# Current decisions by topic

Use this page to find the decision and the code for a task. Read the relevant section, not every linked document. This is a maintained summary of the ADRs present on the checked-out branch, not a replacement for their reasoning or proof that a feature has shipped. Check Git, the PR base and the release tag when comparing branches or an installed app.

Accepted ADRs remain historical records. A later amendment changes only the part it names; unrelated constraints remain in force. When changing a rule, add or amend the summary in the same PR as its new ADR and implementation. If code and documentation disagree, reproduce the behavior and resolve the discrepancy rather than silently treating either as a new product decision.

## Tool ownership and integration

- Manga2Ink chooses inputs, coordinates the tools, presents progress and manages saving/sharing. It does not discover chapter numbers, bind archives, process images or render books itself.
- Use only the bundled tools verified against `toolchain.lock.json`: hashes, release versions and machine protocol identity all matter. Protocol version alone does not establish feature availability. Update a pin deliberately after its owning CLI has a published release; do not use a local or floating binary in product code.
- The converter is **mangaprep**. Old ADRs, fixtures and guide URLs can legitimately retain **mangapress**. Do not rename historical evidence or accept both protocol tool identities as a shortcut.

Decisions: [0006](adr/0006-cli-first-tool-boundary.md), [0017](adr/0017-bundled-tools-are-updated-by-hand.md), [0091](adr/0091-the-converter-is-mangaprep.md). Start in [toolchain adapters](../src/adapters/toolchain), [mangabind adapters](../src/adapters/mangabind), [mangaprep adapters](../src/adapters/mangaprep), and [protocol fixtures](../tests/fixtures/protocol/README.md). Follow [the pin-update procedure](../CONTRIBUTING.md#updating-the-bundled-tools).

## Chapters, volumes and process steps

- Seed mapping from mangabind's included units and effective volumes. Conflicting, unrecognized or unassigned inputs must not be silently guessed into a book. Manual edits and an online suggestion use the same undoable draft.
- Repeated chapter numbers in different explicitly named volumes are not necessarily duplicates. Preserve the distinction between a volume read from a name/folder and a manually assigned volume.
- A standalone CBZ bypasses grouping. A folder of image pages can skip grouping; a folder whose chapters are CBZ archives **must be joined first**, as must a library. Do not decide the input kind by reparsing filenames in the UI.
- "Grouped from names" requires actual proposed volumes, not merely equality with an empty draft.

Decisions: [0008](adr/0008-mapping-starts-from-mangabind-grouping.md), [0089](adr/0089-chapters-of-different-volumes-are-not-copies-of-each-other.md), [0092](adr/0092-a-folder-of-cbz-chapters-is-always-joined-first.md), amending [0009](adr/0009-process-modes.md). Start in [mapping](../src/domain/mapping.ts), [process modes](../src/domain/process-mode.ts), [queue rules](../src/domain/input-queue.ts), and [mapping adaptation](../src/adapters/mangabind/mapping-draft.ts). Check protocol fixtures, unit mapping/mode tests and [named-volume packaged tests](../tests/e2e/named-volumes.e2e.ts).

## One book for a series

- Combined-series output supports **EPUB, CBZ and PDF**. Turning it on keeps the person's format choice; it does not force EPUB.
- In the currently integrated workflow, combining a chapter folder requires both joining and conversion. A standalone CBZ is already one book and ignores the combined-series option. Check the current mode guards before describing newer per-series choices from an unmerged PR as integrated behavior.
- EPUB has a nested table of contents; PDF has volume/chapter bookmarks. CBZ preserves ordered volume/chapter folders and has no table of contents. The adapter sends the converter's nested-navigation flag only for formats that support it.
- A series is one book without needing volumes, chosen for each series ([0094](adr/0094-a-series-is-one-book-without-needing-volumes.md)); one that has none is bound by the tool with `-no-volumes`, so its table of contents is the chapters alone ([0096](adr/0096-a-series-with-no-volumes-is-bound-by-the-tool-with-no-volumes.md)).

Decisions: [0081](adr/0081-a-series-made-into-one-book-can-be-an-epub-a-cbz-or-a-pdf.md) replaces the EPUB-only restrictions of [0024](adr/0024-combine-into-one-volume-is-epub-only.md) and part of [0025](adr/0025-single-book-mode-workflow-control.md); [0083](adr/0083-a-series-made-into-one-pdf-has-its-volumes-and-chapters-as-bookmarks.md) replaces the PDF-without-navigation part of 0081. Start in [run preconditions](../src/application/workflows/run-preconditions.ts), [single runs](../src/application/workflows/single-run.ts), the mangaprep adapter and named-volume packaged tests.

## Metadata and online sources

- Online lookup is optional and explicit. It supplies metadata, not manga pages; opening an editor must not start a search. Keep offline/manual operation available.
- A folder's author, language and edited mapping can be remembered in `mangabind.json`. Preserve unrelated fields and never overwrite invalid JSON.
- A single folder can still convert from its scratch mapping when saving the edited grouping beside the input fails; its books carry a warning. A library title still needs its mapping saved where the batch CLI reads it. Do not apply the single-folder fallback to batch processing without changing that contract.

Decisions: [0013](adr/0013-online-sources-for-volume-data.md), [0031](adr/0031-look-up-the-author-in-a-source-the-person-chooses.md), [0032](adr/0032-keep-the-author-and-language-with-the-folder.md), [0082](adr/0082-volumes-the-folder-cannot-keep-do-not-stop-its-books.md). Start with the [provider guide](adding-a-metadata-provider.md), [input sessions](../src/application/workflows/input-sessions.ts) and [stored folder details](../src/adapters/mangabind/stored-details.ts).

## Saving, recovery and sharing

- Processing creates durable pending books before an explicit export. A remembered save folder is a dialog suggestion, not an automatic destination. Save All avoids replacing existing files; warnings and partial exports remain recoverable.
- Scratch volumes and pending books have different lifetimes. Unsaved pending runs survive restart; fully saved runs can be cleaned up on exit after sharing stops. Deleting a pending run must not delete exported copies.
- Conversion preferences, app settings and window state are separate. The default working locations and a user-selected processing folder are not interchangeable.
- Sharing is opt-in, authenticated, bound to a chosen local interface and stopped on exit. The existing `.mangabound/library.json` catalog name is retained for compatibility. Migration must preserve existing user data; installer maintenance runs do not start the app's ordinary lifecycle.

Decisions: [0026](adr/0026-process-then-save-pending-books.md) and its amendments, [0056](adr/0056-the-app-works-in-a-folder-a-person-can-choose.md), [0061](adr/0061-the-processing-tab-shows-what-waits-and-cleans-up-what-has-waited-long.md), [0085](adr/0085-the-app-is-manga2ink-and-finds-what-mangabound-kept.md), [0087](adr/0087-the-settings-move-takes-the-apps-own-files-and-the-installers-runs-start-nothing.md). 0087 supersedes [0086](adr/0086-the-settings-move-takes-the-empty-folder-electron-makes-and-waits-for-mangabound.md). Start in [library adapters](../src/adapters/library), [main-process wiring](../src/main/README.md), [library logic](../src/library) and [OPDS](../src/opds).

## Interface and language

- Reuse the existing shared controls, theme tokens, screen headers and row layouts. Dark/light themes can follow the system. UI changes need the relevant component, story and visual checks.
- The current control-border decision is the **soft hairline**, not the earlier 3:1 or 2.1:1 floor. The separate `--control-border` token remains; a high-contrast theme is future work, not a shipped accessibility claim.
- User-facing messages are typed codes and values, rendered by the English, Brazilian Portuguese and Japanese catalogs in `src/i18n`. Technical logs stay English; external tool text stays raw. Contributor documents and code are English. Follow the Japanese glossary when changing Japanese text.

Decisions: [0066](adr/0066-the-look-of-the-app-is-a-theme-and-a-theme-is-a-block-of-tokens.md), [0067](adr/0067-the-light-theme.md), [0070](adr/0070-the-theme-may-follow-the-system.md), component decisions **0071–0080** in the [ADR index](adr/README.md), [0090](adr/0090-the-edge-of-a-control-is-the-hairline-again.md) replacing the edge values in 0076/0088, [0053](adr/0053-what-is-said-outside-the-window-is-a-code.md), [0084](adr/0084-the-app-is-also-in-japanese-written-to-read-naturally-and-open-to-correction.md). Start in [renderer components](../src/renderer/components), [catalogs](../src/i18n), [Japanese guidance](translation/ja.md) and [visual tests](../tests/visual).

## Desktop boundaries, checks and release

- The renderer has no Node/filesystem/process access. Shared schemas validate the typed bridge; main resolves opaque ids to trusted paths. Keep the sandbox, navigation, permission and sharing-interface boundaries intact.
- Check the affected behavior at its owning layer; a real CLI change also needs its recorded protocol and packaged integration checked. Coverage thresholds apply to the files listed in the configuration, not a claim that every app behavior is covered.
- Local checks do not replace successful application and documentation CI for the exact PR head. A merge needs the owner's explicit approval; a tag needs separate authorization. A green older commit or a requested rerun is not a passing current check.

Decisions: [0001](adr/0001-electron-react-and-module-boundaries.md), [0041](adr/0041-the-window-loads-its-page-from-its-own-scheme.md), [testing and PR rules](../CONTRIBUTING.md), [release procedure](../RELEASING.md), [release smoke checklist](release-checklist.md). Start in [shared contracts](../src/shared), [main](../src/main/README.md), the applicable tests and `.github/workflows/`.
