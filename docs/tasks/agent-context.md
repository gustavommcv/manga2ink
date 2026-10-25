# Task: make repository context easy to resume

## Checkpoint

- Updated: 2026-10-24, America/Sao_Paulo.
- State: documentation prepared for review; verify the branch's current PR and exact-head checks before merging.
- Branch: `codex/agent-context`, based on `origin/main` at `5c339e4`.
- Observed HEAD: `5c339e4` before committing this documentation-only draft. Later commit/check status belongs to Git and the PR, not this snapshot.
- Preserve the independent CLI-capability and branding work in other checkouts; this task does not contain those changes.

## Goal and changes

Provide local, portable guidance without installing a context service: a short root entry point, a topic map of current decisions, repository responsibilities, and per-task handoffs. The new pages link to the existing guides and immutable ADRs. README and the architecture overview no longer describe combined-series output as EPUB-only.

The summary follows integrated `main`, including ADR 0092. Features in other open PRs must not be documented here as integrated merely because another checkout contains their ADRs. Recheck the decision map when those changes land.

## Verification and next action

Check formatting and local Markdown links for the changed documents, and inspect the summary against the cited ADR amendments and mode guards. No application code, dependency, converter pin or user input is changed. Use the PR's application and documentation checks for the exact proposed commit; do not treat this draft's local inspection as their replacement.

Next: inspect the current PR head and all checks, resolve any failure, then obtain the owner's approval for merge. This task does not authorize a release tag.

## Cleanup

No dependency installation or application build is needed for local prose checks. The separate checkout contains no shared dependency links. Retire this task's checkout after the reviewed change is safely retained; preserve other agents' worktrees and user files.
