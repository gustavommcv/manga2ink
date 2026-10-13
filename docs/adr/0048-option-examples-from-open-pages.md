# ADR 0048: The pictures of the options are made from open-licensed pages, with the pinned mangapress, and committed

- Status: Accepted
- Date: 2026-10-12

## Context

What an advanced option does to a page is best shown by converting a real page twice. The guide's pictures of the application are captured from Storybook (ADR 0034), but nothing there shows a converted page, and the pages a person converts are copyrighted manga that cannot be published. A page drawn by a script was tried and does not look like what the options are for: the effects that matter (a margin cropped, a spread split, a tone moved) show on real art.

Two sets of open pages were found that fit: _Pepper&Carrot_ by David Revoy (color, CC BY 4.0) and _Go Go! Encyclopedia Girls_ by Kasuga (black and white, CC BY-SA 4.0). No black-and-white manga with printed screentone and a licence that allows redistribution was found, so what depends on screentone is described, not pictured.

The conversion is the point of the pictures, so they must come from the mangapress that Mangabound ships, and they go stale when it changes.

## Decision

- **Source pages are listed in `website/media-src/options/sources.json`**, each with its author, licence, page and download URL, and the SHA-256 of the file. They are downloaded by `npm run site:options` into the ignored `website/.cache/options-art/` and refused when the hash differs. They are not committed, and only works whose licence allows adaptation and redistribution are listed.
- **`website/media-src/options/examples.mjs` says what each example shows**: the page, the settings shared by every variant (Mangabound's starting settings, which mangapress is told as flags), and the flags that differ per variant. The generator runs the mangapress named in `toolchain.lock.json` (it refuses another), once per variant, and writes WebP pictures of about 700 pixels and a manifest to `website/src/assets/options/`. Some examples are not pictures: they record only the size of the page each variant gives, or the file it is saved as, or what the finished book says about itself (its title, author, language and reading direction, its file name, whether it holds a ComicInfo.xml, the size of each page), read back from the file mangapress wrote; the pages show these as tables. An input is a page, several pages, pages joined into a strip or a spread, or a strip cut into images the way a webtoon is handed out; where what an option does is to move parts of a page into other pages, as with a spread, the picture is a diagram the generator draws around the real pages, with numbers, colors and arrows and no words; where an option needs a ComicInfo.xml, which the open comics do not have, the example writes one and the page says so.
- **The pictures and the manifest are committed.** The manifest records the mangapress version, every variant's flags, the size and file size of the page mangapress wrote, tone statistics where a page uses them, and the SHA-256 of each picture. They are not generated in documentation CI: that would make every build of the guide depend on a download from a third party and on the tools being acquired, to make the same files.
- **The site's tests check them** (`website/scripts/verify-options-gallery.mjs`): the manifest was made with the pinned mangapress; every picture is the one the manifest describes and belongs to an example; every example is used in both languages; and every option mangapress offers a person (`schemas/cli-capabilities.json`) is covered by a page, by a page named in `coverage.json` as covered elsewhere, or by one listed as planned. A page that covers options must name each in both languages, and the overview page must list every long flag, with a link to where it is explained, in both languages. A page that is planned and exists, or exists and is not written in both languages, fails.
- **A picture keeps the licence of its source page.** Every example shows its credit and licence under the pictures, and the overview page lists them. Pictures made from a CC BY-SA page are CC BY-SA.
- **The pages say only what was measured.** Numbers that a person reads in the text were taken with the pinned mangapress; the captions and tables take theirs from the manifest, so they change when the pictures are made again.

## Consequences

Changing the pinned mangapress fails the site's tests until `npm run site:options` is run and the pages are read again for what the new pictures and numbers say. That is the intended cost: a pin change that alters what an option does is noticed in the guide.

About 1 MB of pictures is committed for the first two pages, and each new page adds some. The generator needs the root toolchain (`npm run toolchain:acquire`) and network access the first time; the checks do not.

The examples use one device (Kindle Paperwhite 6) and CBZ, as Mangabound starts, except where the option is about a format or a device: the examples about metadata and reading direction convert to EPUB, PDF and CBZ, and one uses a Kobo profile. Options whose effect depends on another device or format are said to, in the text, and not pictured.

Pictures show pixels on a computer screen, not an e-ink screen, and say so.
