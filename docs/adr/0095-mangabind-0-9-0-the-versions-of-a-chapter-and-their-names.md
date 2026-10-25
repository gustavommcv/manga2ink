# ADR 0095: The app uses mangabind 0.9.0, which chooses among the versions of a chapter and names chapters by number

- Status: Accepted
- Date: 2026-10-24
- Builds on: [ADR 0006](0006-cli-first-tool-boundary.md) (the tools stay CLI-first), [ADR 0093](0093-the-versions-of-a-chapter-are-chosen-in-the-window.md), [ADR 0094](0094-a-series-is-one-book-without-needing-volumes.md)

## Context

The window can ask a person which of the files that claim one chapter to use, and can make a whole series one book, but both need what mangabind 0.9.0 added: its mapping file can choose among the versions of a chapter (its ADR 0028), a chapter can be named by its number in the table of contents (its ADR 0029), and the report says which chapters have several files, what each entry of a volume is called, and what the first page of each unit is. Until the pin moved, the app was as it was before: both files of a chapter left out with a warning, and the table of contents named by place.

ADR 0006 says what a capability added to a tool for the sake of this app has to be. These are, each of them, a thing a person at a terminal can use without the app:

- The choice is a key of `mangabind.json`, the file the tool has always read and a person writes by hand; the folder is not touched. A person with two copies of a chapter can now bind one of them, or both, from the terminal.
- `-chapter-labels number` is a flag with a default that changes nothing, in the tool's help and README.
- `chapter_versions` and `chapter_entries` of the report are what a script needs to know which files became which entries; `first_page` is the one that is mostly for the window (to show a unit by its cover). The logic that says which image is first, in the reading order of the tool (its ADR 0019), stays in the tool, and the app only reads the file that the tool names, which is what ADR 0006 asks for in place of the app doing it by itself. All three are in protocol version 1, additive, and listed as capabilities (`chapter-versions`, `chapter-labels`, `unit-first-page`).

## Decision

- The pin is mangabind **v0.9.0**. `-chapter-labels` is a flag the app asks for, so it is in the list of flags the app uses (`schemas/cli-capabilities.json`); `capabilities:check` reads it from the pinned release.
- The recorded reports of the choice among versions are now those of the published executable, not of a build made for the purpose.
- The app still asks the tool for its capabilities and asks for the labels by number only of a release that offers them, as before. A release that does not is still read, with the window as it was.

## Consequences

- A series with two versions of a chapter can be bound in the window with one, both or neither, and the table of contents says the numbers of the chapters.
- The series with no volumes is made one book by a mapping of one volume that the app writes for the run, using the tool's own mapping file. A terminal user binds the same series with no volumes only by writing that mapping by hand; a flag of the tool that binds a series without volumes as one book would make it unnecessary, and would be the way to ask for it under ADR 0006. It is not part of this pin.
- Names that are not read (`Episode 1`) are still not chapters: that proposal was withdrawn, because it changed what the tool reads for every folder for the sake of one.
