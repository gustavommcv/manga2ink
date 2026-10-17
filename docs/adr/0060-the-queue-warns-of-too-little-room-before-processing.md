# ADR 0060: The queue warns of too little room before it is processed

- Status: Accepted
- Date: 2026-10-16
- Relates to: [ADR 0056](0056-the-app-works-in-a-folder-a-person-can-choose.md) (where the app works, and the room of its drive), [ADR 0053](0053-the-app-says-what-it-means-in-the-language-of-the-window.md) (the window writes what the app says)

## Context

A conversion that runs out of room stops half-way: the volumes already built are left, and the failure is told after the minutes it took (`failure.diskFull`). The app knew the room of the drive since ADR 0056, but only the Processing tab said it, to a person who had gone there to look. The place to say it is where the person decides: the queue, before **Process** is pressed.

## Decision

- **A notice above the button, not a stop.** When a drive the run uses has less room than the queue may take, the queue screen says so under the **Process** button, with how much is free and how much the queue may take, and where to change the working folder (App settings, under Processing). The button is still enabled: the estimate is a guess, and the person knows what else is going to leave the drive.
- **An estimate that errs to the early side.** A page is taken to need a megabyte in each place that the run uses (`bytesPerPage`), more than a page of a converted book takes: a warning that comes early costs a click, one that comes late costs a conversion. Pages are the chapters of a folder that are in a volume (all of them for a folder converted whole) and the volumes of a library that are not saved yet. A comic file is converted as it is and its pages are not known before it is opened, so it is counted as none. A drive is also short when it has under a gigabyte left, whatever the queue needs.
- **Only the places the run uses.** Volumes are built in the scratch folder only where the process joins chapters; books wait in the pending folder whatever the process is. A place the run does not use is never said to be short.
- **One room when the places share a drive.** The main process says whether the two folders are on one drive (`stat`'s `dev` of the nearest folder that is there), and then what both need is taken from the same room.
- **The window asks, the main process answers.** `app:get-working-space` takes no payload and gives the room of both places and `sameDrive` (`WorkingSpace`, in `src/domain/working-space.ts`, with the arithmetic). The window asks when the queue is shown and when the window is looked at again, since room may be made in another one. A question that fails, or a drive that does not say its room, gives no warning: the person is where they were before the notice existed.
- **The words are in the catalog** (`queue.run.lowSpace`), with the sizes written by `sizeOf` as the language writes them.

## Consequences

- A queue that is going to fill the drive says so before the first page is read, in the language of the window.
- The estimate can be wrong either way (a library with huge pages, a folder of small ones); it is wrong early by design, and it never blocks.
- The numbers are in one module with its tests; changing how much a page is taken to need is a change to `bytesPerPage`.
- Comic files add nothing to the estimate, so a queue of them is never warned of; the room of the drive is still said in the Processing tab and by `failure.diskFull` if a run fails for it.
