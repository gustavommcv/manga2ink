# Manga2Ink artwork

This is the artwork of Manga2Ink: the editable sources, the scripts that compose
and export them, and the large renders. The app, its installers and the website
use the exports listed in [`../../README.md`](../../README.md).

## Editable sources

| File            | Purpose                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| `character.svg` | Standalone transparent mascot, complete head, 135 native paths in twelve named layers.                   |
| `wordmark.svg`  | Manga2Ink lettering, set in Grenze Black. Each glyph is an editable path.                                |
| `logo.svg`      | Complete navy badge, mascot and gold lettering. The bust has the original composition's top/bottom crop. |
| `icon.svg`      | Text-free compact mark. The full crown is visible; the bust meets the badge base.                        |

The character is the reviewed stroke-by-stroke reconstruction from before **all**
collar corrections. Its SHA-256 is
`9a53a5afc63d49f715de3e076a84c97ddf27246e4913ef881ec0dda16c40d449`.
The original high collar and neck paths are restored exactly, not redrawn again.
Hair, skin, eyes, brows, mouth, clothing, hand, book and individual flower petals
remain separate editable objects. The standalone head is not cropped.

All four SVGs use native paths, with no embedded raster, external image, script
or runtime font dependency. `compose.py` builds the logo and icon from
`character.svg` and `wordmark.svg`; edit those sources, not duplicate character
paths inside the compositions. Geometry is copied without deformation.

The lettering uses **Grenze Black**, not the rejected Charles experiment.
It has a small optical gap before the capital I to distinguish “2Ink”. The
maintainer approved the logo, icon and lettering on 2026-10-22.
The [Grenze Project](https://github.com/Omnibus-Type/Grenze) authors' copyright
and SIL Open Font License are preserved in `type/Grenze-OFL.txt`. No proprietary
font file is included or required.

## Original artwork and attribution

Original artwork supplied by **JPmarquesbraga** is preserved unchanged:

| Original                                                   | SHA-256                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `../original.png` — supplied 1254 px source                | `643d32544b318686b5851640f6779887c6bd808dcf30ee943e420618eb6a50b5` |
| `../mangabound.png` — existing conventionally cropped mark | `ce2c5830c1ea45b9bd5992f8290304f481716b55e40f3d58037bcf191fa4abe6` |

These files, Mangabound's icons and their attribution must not be overwritten
or removed by the rename. The maintainer confirmed MIT distribution permission
on 2026-10-11; see `../../README.md`. The maintainer also states that the original
image was AI-generated. This vector adaptation was made with AI assistance.
The missing crown is reconstructed, and clean curves simplify raster texture;
this is not a pixel-identical conversion or a claim of independently drawn art.

## Exports and integration

`exports/manifest.json` records sizes, SHA-256 hashes and icon representations.
The high-resolution files are rendered from SVG, not enlarged from a bitmap.
WebPs are lossless. The PNG and ICO have transparent badge corners; ICNS also
retains the existing macOS-specific outer padding.

`exports/` keeps the large renders: `character-4096.png`, the standalone
mascot, which the guide's home page reads through its responsive image pipeline,
and `logo-4096.png` and `wordmark-4096.png`, the complete logo and the lettering. The other
exports were moved to where they are used; [`../../README.md`](../../README.md)
lists each place, and the manifest records them by their path in the repository.

The Windows ICO has 16, 20, 24, 32, 40, 48, 64, 128 and 256 px representations.
Its exact bytes must also be served at the public icon URL used by Squirrel.
Keep legacy public icon URLs working for already published installers.

From a checkout with the project's npm dependencies, Python and Pillow:

```powershell
python assets/branding/manga2ink/export.py
```

If the Playwright browser is unavailable, select an installed Chromium browser:

```powershell
python assets/branding/manga2ink/export.py --browser-executable 'C:/Program Files/Google/Chrome/Application/chrome.exe'
```

The optional exporter composes and validates the SVGs, renders them, encodes the
platform icons and decodes every representation. It is not an app startup step
or a new CI pipeline. Browser/encoder versions can change the exact image bytes.

The exporter writes every file into `exports/`; move each one to its place, as
listed in the asset guide, and record it in the manifest.
