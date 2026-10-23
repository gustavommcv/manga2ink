# ADR 0089: Chapters of different volumes are not copies of each other

- Status: Accepted
- Date: 2026-10-23
- Amends: [ADR 0008](0008-mapping-starts-from-mangabind-grouping.md) (what the mapping asks of the chapters mangabind has already grouped)

## Context

mangabind 0.8.0 reads two kinds of collection that the app had never seen: a series kept as one folder (or `.cbz`, or `.zip`) for each volume, and one with a folder for each volume that holds the chapters, numbered again in each. A smoke test of the published alpha.18 found that neither could be converted. The row said `2 volumes`, and Process stopped with "Fix the chapter mapping errors before converting"; the editor said "More than one source represents chapter 1; mangabind cannot choose between them".

The cause was in the app's own rule. `validateMapping` took any two placed chapters of one number for copies, since the `mangabind.json` it writes lists a chapter number once and mangabind keeps the last volume when a number is listed under two. That is true of chapters that have no volume of their own. It is not true of these, and the app already knew it for the copies left out of the folder (ADR 0082): mangabind tells chapters apart by volume when each has one of its own. mangabind reports each volume of the first kind as chapter 1, so all of them have the same number, and in the second kind the numbers repeat by design.

What mangabind reports, recorded from the pinned 0.8.0 (`tests/fixtures/protocol`):

- A volume of the first kind is a unit whose `parser.volume` is its volume and whose chapter is 1.
- A chapter in a volume folder has no `parser.volume`; its volume is its `effective_volume`, and `volume_folder` says where it was found.

## Decision

- **A chapter has a volume of its own when its name says one, or when it is in a volume folder.** The draft takes it from `parser.volume`, and, for a unit with `volume_folder`, from `effective_volume`. It is the volume mangabind keeps over the file, so it is `parsedVolume` for the chapters of both.
- **Two chapters of one number are copies only if mangabind could take one for the other.** They are not when both have a volume of their own and the two differ. It is the rule that already decided which copies left out of the folder count, now the one rule for the chapters that are placed too. A chapter with no volume of its own could be either, so it is still a copy of any chapter of its number.
- **The file lists a chapter number once.** A chapter whose own volume wins is left out of the file when its number would be listed under more than one volume, so that mangabind is not told two things and does not warn that the file disagrees with a name or a folder. Any other chapter is listed as before.
- **A chapter in a volume folder is shown with its folder in its name** (`第1巻/第1話`), since two folders may hold a chapter of one name. It cannot be put in another volume than its folder's: that is the same error as for a name that says a volume, and the message is the same, since the path names the volume.

## Consequences

- A series kept with a unit for each volume, or with the chapters in a folder for each volume, converts in the app, as it did in mangabind. The packaged e2e binds both as they arrive, from fixtures made by `scripts/generate-e2e-fixture.mjs`, and the reports they are tested against are real ones.
- What did not change: a chapter number repeated in the same volume, or with no volume of its own, is an error as before; the editor lists chapters by number, so the folders of a series numbered again in each volume alternate in the list, each named by its folder.
- The report of a pin that changes what mangabind reports is tried through the app before the pin is moved: `toolchain:check`, the capabilities check and the unit tests did not see this, because the app validates the mapping by rules of its own.
