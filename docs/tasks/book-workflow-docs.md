# Task: Align the guides with the current book workflow

## Checkpoint

- Updated: 2026-10-28, America/Sao_Paulo.
- State: the owner reviewed the wording and authorized continuation; preparing the PR and its checks.
- Branch: `codex/docs-book-workflow`.
- Base and observed HEAD: `f923e7aa7a06dec26585af24268876eed458d711`; the changes are uncommitted.
- Working tree: task-owned documentation edits and one corrected code comment in an isolated checkout. Preserve unrelated branding work in other checkouts.

## Goal and boundaries

Apply the findings of the owner's documentation audit: introduce the book choice before volume mapping, correct the recognized-name example, explain effective process steps and empty/unmatched online suggestions, and update current technical summaries. Keep English, Brazilian Portuguese and Japanese aligned.

The owner requires seeing the actual changes before a PR is opened. The Portuguese draft and the translation scope were shown, and the owner authorized continuation after a final review for clarity to first-time users. Follow CONTRIBUTING for exact-head checks and merge; a release tag is separate.

## Decisions and changes

- Quickstart and README lead with one book per volume or one for the whole series. A chapter folder can become one book without volumes; a library title still needs volumes.
- The mapping guide places its existing book-choice section before manual volume instructions, while retaining the section's heading and links.
- The renamed quickstart step keeps its previous anchor in each language, so existing deep links continue to work.
- `Ch.004 [GroupA]` and `Ch.0001 (en)` are recognized examples; `Omake` without an identifier remains an unrecognized example. A focused audit probe used the hash-verified pinned mangabind 0.10.0 and disposable fixture copies.
- The processing guide explains the per-row book choice's priority over queue steps. The online-source guide distinguishes no volumes from no matching chapters and says when no mapping is applied.
- The current decision map reflects ADRs 0093–0096. The planned-book comment supports all formats, and the SEO guide describes the three declared application languages.
- Accepted ADRs, conversion behavior, dependencies and pinned versions are unchanged.

## Verification

- Local draft checks passed: Prettier formatting; interface-label validation (48 guides, no missing labels); translation-page parity (27 pages in each language); 124 local link targets across 16 Markdown/MDX documents; and `git diff --check`. The code-file diff is a comment only. The checks reuse existing dependencies without copying or linking dependency folders into this checkout.
- Full website build, browser tests and remote application/documentation CI: not run locally for this draft; all exact-head remote checks remain required before merge, followed by the merged commit's checks and publication verification.

## Next action

Open the PR for the reviewed wording, wait for all checks on its exact head, then publish the approved changes and verify the resulting main commit and live guides. Confirm the live branch, base and working-tree changes before resuming.

## Cleanup and outcome

The isolated checkout is active review work. No dependencies, generated captures or copied manga are needed in it. After an approved merge and successful CI, remove only this task's checkout and branch. Preserve the owner's originals and other worktrees.
