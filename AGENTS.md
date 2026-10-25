# Working in Manga2Ink

Manga2Ink is the desktop orchestrator. **mangabind** owns chapter discovery and binding; **mangaprep** owns page processing and book rendering. See the [repository responsibilities](docs/architecture.md#repository-responsibilities) before moving behavior between them.

## Start with the task

- Check the branch, HEAD, working-tree changes and PR base. Preserve other work; do not reset, stage or clean unrelated files.
- For a resumed task, read its record under [docs/tasks](docs/tasks/README.md), then verify its commit and pending claims against Git and the PR. A handoff is a dated snapshot, not live status.
- Read only the relevant route below. Do not load the entire ADR collection, audit history or milestone history before an edit.

| Task                                         | Context to load when needed                                                                                                                                          |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grouping, modes, metadata, saving or sharing | The matching section of [current decisions](docs/current-decisions.md), then its cited ADRs and tests                                                                |
| Module ownership or a new workflow           | [Architecture](docs/architecture.md), [application](src/application/README.md), [adapters](src/adapters/README.md)                                                   |
| IPC, desktop behavior or trusted paths       | [Main-process guide](src/main/README.md), the shared contract and the affected handler                                                                               |
| UI, wording, themes or translations          | [Interface decisions](docs/current-decisions.md#interface-and-language), the nearest component/story and [Japanese guidance](docs/translation/ja.md) when applicable |
| Checks or a PR                               | The relevant sections of [CONTRIBUTING](CONTRIBUTING.md) and the actual scripts in `package.json`                                                                    |
| Website or release                           | [Website guide](website/README.md) or [RELEASING](RELEASING.md), respectively                                                                                        |

## Keep the boundaries

- Verify a suspected CLI limitation with the pinned tool before changing orchestration. Fix discovery, binding or rendering in its owning repository; never duplicate it in the app.
- Keep renderer access behind the typed, validated bridge. Keep domain rules independent of React, Electron and Node.
- Write contributor documents and code in English; user-facing messages belong in the typed catalogs for every supported language.
- Treat user inputs, unsaved books and other worktrees as data, not disposable build output. Isolate real-file tests and remove only scratch artifacts owned by the task. Never recursively clean shared dependency links.
- Read versions from `toolchain.lock.json` and `package.json`. A feature branch, a merged change and an installed release can have different behavior.

The [current-decision map](docs/current-decisions.md) summarizes accepted ADRs; it does not replace them or establish new product policy. Check amendments and the current implementation when they disagree, and correct stale summaries in the relevant change. Keep pending work in [current priorities](docs/milestones.md#current-priorities), not in the historical ADRs.

Before handing work over, update only [that task's record](docs/tasks/TEMPLATE.md) with evidence and the next step. Follow the exact-head CI gate in CONTRIBUTING. Merging requires the owner's explicit approval; a release tag requires separate authorization.
