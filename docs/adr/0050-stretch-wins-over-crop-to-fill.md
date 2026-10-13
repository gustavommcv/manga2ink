# ADR 0050: Stretching wins over cropping to fill when both are saved

- Status: Accepted
- Date: 2026-10-13
- Amends: [ADR 0036](0036-page-layout-options-are-grouped-by-decision.md) (the order in which mangapress lets the three size flags win)

## Context

ADR 0036 made page size one list of four entries for three mangapress flags, and said that "mangapress lets one of them win (cropping over stretching, stretching over enlarging)". Settings saved with more than one of the flags are read as the entry that wins, and `pageSizeOf` did so: a saved `wallpaper` was read as **Crop to fill the screen** whatever else was set.

That order was not checked, and it is the wrong one. Writing the guide's page on size and borders, the two flags were given together to the pinned mangapress 0.8.0 (a 992 × 1373 page, the reMarkable Paper Pro Move profile, CBZ): `--stretch --wallpaper` writes the same page as `--stretch` alone, byte for byte, and not the page `--wallpaper` alone writes. `--stretch --upscale` is the same as `--stretch` too.

Both converters say why. Kindle Comic Converter 12.0.0's `resizeImage` tests stretching before cropping to fill, and both before the rule that leaves a page that already fits alone when it is not enlarged; mangapress's `resize.rs` follows that order (stretch, crop to fill, left alone, cropped by a few pixels when the shape is close, padded or only fitted). mangapress follows Kindle Comic Converter here, and the app did not follow either.

## Decision

- **`pageSizeOf` reads stretching first, then cropping to fill, then enlarging**, the order in which mangapress and Kindle Comic Converter act on the flags. A settings file that has both `stretch` and `wallpaper` set shows **Stretch to the screen**, which is the page it produces.
- Nothing else changes. The list still sets exactly one flag when an entry is chosen (`withPageSize`), so the app does not make the combination; only a file written by hand or by an earlier version can hold it.
- The unit test that pinned the old order now pins the new one, and the other ADR 0036 sentence about this order is read as corrected by this record.

## Consequences

A person whose saved settings had both flags saw **Crop to fill the screen** and got stretched pages. They now see **Stretch to the screen**, and the pages are unchanged. Choosing an entry in the list clears the flags that are not its own, as before.
