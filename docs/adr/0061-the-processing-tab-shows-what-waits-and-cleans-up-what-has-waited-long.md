# ADR 0061: The Processing tab shows what waits and cleans up what has waited long

- Status: Accepted
- Date: 2026-10-16
- Relates to: [ADR 0026](0026-process-then-save-pending-books.md) (books wait until they are saved), [ADR 0056](0056-the-app-works-in-a-folder-a-person-can-choose.md) (where they wait, and the earlier folders), [ADR 0060](0060-the-queue-warns-of-too-little-room-before-processing.md) (the room of the drive)

## Context

A finished book waits in the app's own folder until it is saved, and a conversion that nobody comes back to waits for ever: a run of a long series can take several gigabytes. The only ways to remove one were the **Delete** of each group on the queue, and the removal of conversions whose books are all saved when the app closes (`pruneCompleted`). Nothing said how much was waiting, and a person with many old conversions had to find each one.

## Decision

- **The tab says what waits.** The Processing tab shows how many books wait, in how many conversions, and how much they take, counted over the folder in use and the earlier ones (`ProcessingFolderStatus.waiting`, built from the runs the status already lists). It says that a conversion whose books are all saved is removed when the app closes, since that is why a saved book does not stay.
- **A clean-up by idleness, not by saved or not.** A person chooses 7, 30 or 90 days and **Delete…**. The conversions deleted are the ones nothing in them has changed for that long (`FsPendingRuns.idleRuns`, by the newest change in the run's folder). The time a run was made is not used: some file systems do not keep it, and a run that could not say when it was made would look as old as can be. Saving a book changes the run, so a conversion someone is saving from does not look idle.
- **No "delete what is saved".** The unit that is deleted is a conversion, as in `pending:discard`, and a conversion saved in part keeps its unsaved books beside the saved ones. Removing only the saved books would mean taking books out of a run's folder and its catalog, for a few bytes a person can delete from the queue. The wholly saved ones are already removed on closing.
- **The window asks before anything goes.** `pending:count-idle` says what a number of days would delete (conversions, books, bytes); the window says it in a question that also says that books not saved yet will be lost; only a yes sends `pending:delete-idle`. Both take only the number of days, one of three the main process accepts. The window names no folder and no conversion.
- **Under the rules of deleting one conversion.** Refused while a conversion runs or the ready books are shared (`discardRefusal`); a conversion being saved from is left, not an error, and the answer says what went. What the page held of a deleted conversion is forgotten (`forgetPendingRun`, shared with `pending:discard`).
- **The queue is read again** when the settings dialog is closed, so its list of ready books does not show what was deleted.

## Consequences

- A person can see how much old conversions take and remove the ones nobody came back to, in one step, and sees what is going before it goes.
- A conversion the person is still working on is not deleted by a number of days that is too small for it: the clean-up looks at the last change, and the list on the queue still has each group's own **Delete**.
- A conversion is deleted whole. One saved in part loses its unsaved books too, and the question says so.
- Changing the days on offer is a change to `idleDays` in the domain and to the schema in `src/shared/pending-cleanup-contract.ts`, which a test keeps in step.
