# ADR 0082: Volumes the folder cannot keep do not stop its books

- Status: Accepted
- Date: 2026-10-21
- Amends: [ADR 0008](0008-mapping-starts-from-mangabind-grouping.md) (what happens when the grouping cannot be written into the source folder)
- Relates to: [ADR 0032](0032-keep-the-author-and-language-with-the-folder.md) (the same rule for the author and the language)

## Context

ADR 0008 writes `mangabind.json` into a manga folder when the person changed mangabind's grouping, so that the edited volumes are there the next time the folder is added. It does not say what happens when that write fails. Since the first conversion slice, before ADR 0008, the run of a folder stopped: the item failed with "Couldn't save mangabind.json in the source folder", stayed in the queue, and nothing was made of it.

The write is not what the books are made from. mangabind is run with a scratch copy of the mapping (`-metadata-file`), which is always written in Mangabound's own working folder, so the books can follow the edited volumes whether or not the folder keeps them. A folder on a read-only drive, on a network share without write access, or with a `mangabind.json` that is not valid JSON (which is refused, never overwritten, as ADR 0032 decided) could not be converted with edited volumes at all, for the sake of remembering them.

ADR 0032 already decided the other half of the file the other way: when the author and the language cannot be kept with the folder, a notice says so and nobody is stopped. The gap was pointed out from outside, in gustavommcv/mangabound#363.

## Decision

- **The run of a folder goes on.** When the edited grouping cannot be written into the folder's `mangabind.json`, mangabind is run with the scratch copy as always, and the books follow the edited volumes.
- **The books say so.** The run carries a warning of the app's own, `mapping_not_kept`, which is told with every book of that run under "The volumes you edited were not kept with the folder", with the reason (the folder cannot be written, or its `mangabind.json` is not valid JSON) and what it means (the volumes have to be edited again the next time the folder is added). Like the other warnings, it is advice: the books are ready all the same.
- **A file that is not valid JSON is still never overwritten.** Only the run's failure changes, not what is written.
- **A title of a library is unchanged.** mangabind reads a library's titles from their own folders, with no scratch copy, so the file is how the volumes reach it: Confirm mapping still says it could not save them, and the title keeps needing volumes.

## Consequences

A folder that cannot be written can be converted with the volumes the person chose, and the person learns that they will not be remembered. The `mapping_save_failed` error remains, for a title of a library only. The guide says what the file is for and what happens when it cannot be written, and lists the new warning with the others, in the three languages.

Unit tests cover the adapter (a folder that cannot be written and a file that is not valid JSON are both joined from the scratch copy, the file is left as it was, and the warning is returned) and the warning being told with every book of the run.
