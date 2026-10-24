# ADR 0094: A series is one book without needing volumes

- Status: Accepted
- Date: 2026-10-24
- Amends: [ADR 0025](0025-single-book-mode-workflow-control.md) (the control of the single book), [ADR 0081](0081-a-series-made-into-one-book-can-be-an-epub-a-cbz-or-a-pdf.md) (what the one book holds)

## Context

A real test of alpha.19 on sixteen chapters of a series with no volumes asked for one book of the whole series, and the app could not make it. The mode was a checkbox, **Create one book for the series**, off by default, and the row of a folder with no volumes said **Needs volumes**: the mode wanted the volumes to put each chapter under its volume, so a person who only wanted all the chapters in one book had to invent a volume in the editor first. The choice a person is making is between two shapes of result, one book for each volume or one for the whole series, and a checkbox named for the second hid the first.

## Decision

- **The choice is a control of two options, named for what it makes.** In the queue, **Books**: **One per volume** or **Whole series**. It is the same setting as before (`singleBook`, kept between sessions, and the same lock on the steps while the whole series is chosen), so nothing about what is kept changes. A queue of loose CBZ files still cannot choose the whole series.
- **A series with no volumes is ready for the whole series.** The row says **Whole series** and runs; the volumes it lacks are not asked for. Where the series has volumes, from the names of the folders or made by the person, the rows are as they were: the chapters that are in no volume are still asked about.
- **The tool is told of one volume, made for the run.** mangabind binds a series into one file by way of its volumes, so a series with none is given one holding every chapter that a file can name (not those whose own name already says a volume, and not those the person left out). It is in the mapping file of the run only: it is never kept with the folder, which would turn a choice of shape into volumes the person never made.
- **Volumes are a level of the table of contents only where the person has them.** With volumes the book is made with `--nested-toc` as before. Without, the chapters are the table of contents, flat; the volume made for the run does not show.
- **The chapters are named by their numbers.** The app asks mangabind for `-chapter-labels number` (its ADR 0029) in the plan and in the run, whenever the release offers it, so that the table of contents says `Ch.8` for chapter 8 even when chapter 3 is missing or two versions of chapter 6 are both kept. A release that does not offer it keeps naming them by their place.
- **The plan says what the book will be.** **Validate plan** shows the file the book will be, with its format, the chapters it will hold as the table of contents will call them, how many pages each has, and the files left out because another version of their chapter was chosen (ADR 0093). The same list is shown for the books of volumes.
- **A folder with nothing to bind is said before anything runs.** A series none of whose chapters can be placed is refused as having no volumes, in the plan and in the run.

## Consequences

- A folder of CBZ chapters with no volumes becomes one EPUB, CBZ or PDF of the whole series in two steps: add it, choose **Whole series**. With versions to choose among, **Choose versions** comes first.
- The kept preference of an earlier session is read as before; only what it is called in the window changes, and the guide says it in three languages.
- Libraries are unchanged: the titles of a library are bound by their own folders' files, and a title with no volumes still waits for some.
- The names by number need the mangabind release that carries its ADR 0029; until the pin moves, the series is made with the names by place, which are as good as they were for books of volumes. The list of flags in `schemas/cli-capabilities.json` moves with the pin, since it is checked against the flags the pinned release advertises.
