# ADR 0092: A folder of CBZ chapters is always joined first

- Status: Accepted
- Date: 2026-10-24
- Amends: [ADR 0009](0009-process-modes.md) (which process a kind of input can have)

## Context

A real test of alpha.19 on a series of sixteen `Ch.0001 (en).cbz` files, with **Group chapters into volumes** turned off ("skip grouping"), failed after the queue had said the folder was ready: the converter was handed the folder, found no pages in it, and stopped with a message about the tool. The folder holds archives, and mangaprep reads the images of a folder, a CBZ or a PDF, not the images inside the CBZ files of a folder.

The queue also said the folder was "grouped from names", though it had no volume at all: the line compared what the person had with what mangabind proposed, and a proposal of nothing is equal to nothing.

## Decision

- **A folder whose chapters are CBZ files cannot skip joining them.** `ModeInput` has a fourth kind, `archives`, for it: **convert-only** is refused for it as it is for a library, by the same function (`unsupportedModeReason`) in the interface and in the run, and the steps of a queue made only of such folders show **Group chapters into volumes** on and locked, with the reason. A queue of mixed folders leaves the steps free and the row says **Needs grouping** instead of running, as a CBZ row says **Nothing to join**.
- **Whether a chapter is an archive is what mangabind reported of it.** The mapping draft takes `kind` of the unit (`folder` or `cbz`) and keeps it with the chapter, since mangabind already says it; the app does not look at file names.
- **"Grouped from names" needs volumes.** The line under a folder's name says it only when the folder has volumes, as well as being what mangabind proposed.

## Consequences

- The failure after the queue said "ready" is a message on the row before anything runs, and a refusal with the same words if a run is asked anyway.
- Every way to a book from such a folder joins first: into the books of its volumes, or into one book for the whole series.
- Nothing about a folder of pages changes: it can still skip joining and be converted as one book.
