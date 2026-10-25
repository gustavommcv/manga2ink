# ADR 0096: A series with no volumes is bound by the tool with no volumes, and the app stops writing a volume for it

- Status: Accepted
- Date: 2026-10-25
- Amends: [ADR 0094](0094-a-series-is-one-book-without-needing-volumes.md), [ADR 0095](0095-mangabind-0-9-0-the-versions-of-a-chapter-and-their-names.md)
- Builds on: [ADR 0006](0006-cli-first-tool-boundary.md)

## Context

A series with no volumes made into one book was bound by a mapping of one volume, `1`, that the app wrote for the run and listed every chapter in; the tool bound it as it binds any volume, the app told the converter nothing of volumes, and the table of contents of the book had that one level made up (`Vol.1`, with the chapters under it) on top of the chapters. ADR 0095 recorded it as a way round the tool: a person at a terminal could ask for the same only by writing that mapping, and the owner asked, on 2026-10-25, for the tool to have a flag that does not group in volumes, so that the table of contents is the chapters alone.

mangabind 0.10.0 has it: `-no-volumes` (its ADR 0030) binds every chapter, whatever volumes the names, the folders and the mapping file say, into one `<manga>.cbz`, in the order of the chapters, and the report says `without_volumes`. It is additive in protocol version 1 and listed as the capability `no-volumes`.

## Decision

- The pin is mangabind **v0.10.0**, and `-no-volumes` is a flag the app asks for, so it is in the list of flags the app uses (`schemas/cli-capabilities.json`).
- A series made into one book that has no volumes of the person's own is bound with `-no-volumes` and not combined. The mapping file the tool is given is the person's own, with no volume in it, and so is the one kept with the folder; the app no longer makes a volume for the run. The book is the one volume the tool reports as written, and the run goes on with it as it did with the combined file.
- A series that has volumes is made one book as before: the tool combines them in one file, with the volumes as a level of the table of contents.
- What the app counts for such a series before the run (the pages and the chapters that will be in the book, in the plan and in the room the queue needs) is still the draft with every chapter that can be placed in one volume, which is a count and is not sent to the tool.
- The app needs this release for a series with no volumes: the pin is exact and checked by hash, and the run does not go on without the flag for a tool that has none.

## Consequences

- The table of contents of a series with no volumes is the chapters alone, as it was meant to be, and a terminal user gets the same book with one flag.
- Chapters of a series that the tool reads but that a mapping file cannot name are now in the book, as the tool puts every chapter it read in it; before, they were left out with the volume the app wrote.
- A series that numbers its chapters again in every volume has them in conflict in a book with no volumes, and the tool leaves them out and says so (its ADR 0030); such a series keeps its volumes.
