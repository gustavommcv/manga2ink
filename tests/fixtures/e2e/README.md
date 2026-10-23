# Packaged-app fixture

`manga-folder/Manga2Ink E2E` is a complete manga folder fixture: two chapter directories with two valid PNG pages each. The images are procedurally generated geometric patterns, not copyrighted manga pages.

`cbz/Manga2Ink Direct.cbz` contains two of the same generated pages and exercises the direct-CBZ path without mangabind.

`manga-named-volumes/Named Volumes` is one manga whose chapter folders carry the volume in their names (`Vol.01 Ch.0001 - First (en) [Group]`), so mangabind groups it into volumes 1 and 2 on its own.

`manga-volume-units/Volume Units` is a manga kept as one folder for each volume (`(一般コミック) [作者] テスト 第01巻` and `第02巻`), each a volume with one chapter, so both are chapter 1. `manga-volume-folders/Volume Folders` has a folder for each volume (`第1巻`, `第2巻`) with the chapters in it (`第1話`, `第2話`), numbered again in each volume. The app has to bind both without anything assigned by hand.

`manga-batch/Library` is a library of two manga, for the real-library e2e path: `Auto-Resolved Manga` groups by name like `manga-named-volumes`, and `Needs Mapping Manga` has plain `Chapter 1`/`Chapter 2` folders that still need manual volume assignment.

Regenerate the checked-in PNG files from the repository root with:

```console
node scripts/generate-e2e-fixture.mjs
```
