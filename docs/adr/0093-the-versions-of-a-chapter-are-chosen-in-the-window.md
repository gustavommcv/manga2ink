# ADR 0093: The versions of a chapter are chosen in the window

- Status: Accepted
- Date: 2026-10-24
- Amends: [ADR 0008](0008-mapping-starts-from-mangabind-grouping.md) (what the mapping holds besides volumes), [ADR 0092](0092-a-folder-of-cbz-chapters-is-always-joined-first.md) (which folders can run)

## Context

A real test of alpha.19 on a folder of sixteen chapters of a series with no volumes, two of them in two files (two scan groups), found that the app could not do anything about it. Two files claiming one chapter are a conflict, mangabind leaves **both** out of the book, and the only way out the app offered was to move or delete a file in the person's folder. The queue did not ask which to use, the editor showed an error with no way to answer it, and the app ran mangabind on the original folder, so unchecking a file in the window would have changed nothing: mangabind finds every file there is.

mangabind (its ADR 0028 and 0029, not yet released when this was written) can be told which files to use, in the mapping file, and says in its report which chapters are claimed by several files, with or without a volume, each file's first page, and the name each chapter will have in the book. The app's part is to ask, remember and pass it on.

## Decision

- **One chapter of the draft stands for the files that claim it.** `MappingDraft.versions` has a group for each such chapter, with the files (`candidates`: name, path, kind, pages, first page) and the choice (`use`): the ids of the files to use. The list of chapters has the first file of each group, so the editor, the volumes and the validation see one chapter, as they should: it is one. A group with no `use` is not decided.
- **The page can only say which of the app's files to use.** The choices come back with the mapping, and the workflow lays them over the groups it read: an id that is not one of the group's files is refused, and the files, their names and their paths are never taken from the page.
- **Nothing runs until every chapter is decided**: the row says **Choose versions** and is not run, and a run that is asked anyway is refused (`versions_pending`) with the number of chapters. The app does not choose by size, by pages or by anything else. A run that does not join the chapters (a folder of pages converted as one book) is not affected.
- **The choice is made on a screen of its own**, from a button on the row. Each chapter shows every file: its full name, its first page, whether it is a folder or a CBZ, how many pages it has. The choices are the three that mean something: use that file, keep all of them (one after the other, each named `(version 1 of 2)`, the chapter keeping its number), or leave the chapter out. The first pages are read by the main process from the files the app listed, by id, up to 24 at a time and only images a window can show, and sent as bytes; a page that cannot be read is no error, and the file is shown without it.
- **The files stay where they are and the choice goes where the mapping goes.** The scratch `mangabind.json` of the run carries `chapter_versions`, with the files named by their path below the folder, which is what mangabind reads for this run. When the person has made a choice the folder did not have, the folder's own `mangabind.json` is written as it is for an edited mapping (ADR 0082): the choices replace the earlier ones for the same chapters and keep the others, and every other key is kept. Beside them the app keeps its own note under `manga2ink.versions_seen`: how big each file was and when it last changed. A folder that is not writable is told as it is for the volumes.
- **A folder added again keeps its choices, and asks again where the files are not the same.** mangabind reads the folder's file and says the chapter is decided; the app compares the files with the note. A file that is not in it came after the choice, one whose size or time differ has changed: the chapter is not decided again by itself, it is asked, with the earlier choice offered and the files that need a second look marked **New** or **Changed since you chose**. A choice written by hand, with no note in the folder, is taken as the choice of whoever wrote it.
- **The window ignores what the tool cannot do.** With a mangabind that does not report these chapters (every release before the one that carries its ADR 0028) there are no groups, and the app is as it was.

## Consequences

- Two versions of one chapter can be bound with one, with both or without the chapter, from the window, and the folder is never touched except for its `mangabind.json`, which the app already wrote.
- The editor of volumes shows one chapter for the group, and a chapter of a series with volumes goes to its volume when it is decided.
- A library's titles are read and bound by mangabind with their own folder's file, so a title whose choices were made in the window is bound with them; a title that has chapters in conflict and no choice still gets the warning, which now says to add the title's folder on its own and choose.
- Needs the mangabind release that carries its ADR 0028 and 0029; the pin moves to it, and until then the window is as it was.
