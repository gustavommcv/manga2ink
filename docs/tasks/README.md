# Task handoffs

Keep one short, versioned handoff per substantial task that may be resumed by another agent. Copy [TEMPLATE.md](TEMPLATE.md) to a descriptive filename here. A small finished edit does not need a task record.

This is task state, not another architecture manual or a second backlog. [Current priorities](../milestones.md#current-priorities) remains the project backlog; [current decisions](../current-decisions.md) routes architecture questions.

- At a handoff, interruption or material change of scope, replace the task's last checkpoint with the current facts. Do not append a transcript of every command.
- Record the branch, base and observed HEAD, changed areas, decisions, precise validation and the next action. Distinguish a local implementation, an open PR, merged code and a published release.
- Label unknowns, failed checks and checks not run. A check of another commit is not evidence for the current head. Keep large logs and test outputs out of the record; link to the relevant run or small report instead.
- Update only your own task record. Concurrent tasks get separate files; do not share a mutable global `STATE.md`.
- Use repository-relative paths and public issue/PR links. Do not commit private local paths, credentials or user manga pages.
- On completion, leave a concise outcome and the PR/verification reference. A record is dated evidence: readers must check Git and current CI before acting on it. It does not stay the source of live project status forever.

Before resuming, compare the recorded HEAD and branch with the checkout and PR. Reconcile differences before replaying a pending step. Read only the files needed for that step; do not reconstruct the whole previous conversation.
