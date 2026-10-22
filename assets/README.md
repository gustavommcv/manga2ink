# App and website artwork

## Manga2Ink

The current logo, icon and lettering are in [`branding/manga2ink/`](branding/manga2ink/README.md): the editable mascot (`character.svg`), the lettering (`wordmark.svg`), the complete logo (`logo.svg`) and the text-free icon (`icon.svg`), with the scripts that compose and export them. The mascot is a vector adaptation, made with AI assistance, of the artwork JPmarquesbraga supplied (below): the missing crown is reconstructed and clean curves simplify the raster's texture, so it is neither a pixel-identical conversion nor an independently drawn illustration. The lettering is Grenze Black, outlined; its SIL Open Font License is kept in `branding/manga2ink/type/Grenze-OFL.txt`.

The exports are rendered from the SVGs and placed where they are used. `branding/manga2ink/exports/manifest.json` records each one's place, size and SHA-256:

| Asset                                        | Use                                                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `icons/manga2ink.png`                        | 1024 × 1024; Linux packages and non-Windows windows                                                           |
| `icons/manga2ink.ico`                        | 16, 20, 24, 32, 40, 48, 64, 128 and 256 px; Windows executable, installer and window                          |
| `icons/manga2ink.icns`                       | ICNS representations through 1024 px, with the macOS-specific outer padding; macOS bundle                     |
| `../src/renderer/assets/mark-48.webp`        | 48 px, lossless; the title bar of the app, drawn at 20 px (2x screens get 40)                                 |
| `../src/renderer/assets/mark-192.webp`       | 192 px, lossless; the About tab of the app settings, drawn at 96 px (2x screens get 192)                      |
| `branding/manga2ink/exports/logo-4096.png`   | The complete logo on the guide's home page; Astro makes responsive lossless WebP images from it at build time |
| `../website/src/assets/branding/header.webp` | 128 px, lossless; Starlight's compact header, beside the site title                                           |
| `../website/public/favicon.ico`              | 16, 32, 48 and 64 px; browser icon                                                                            |
| `../website/public/manga2ink.ico`            | Exact copy of `icons/manga2ink.ico`; the public address Squirrel's installed-program entry reads              |
| `../website/public/social-preview.png`       | 1200 × 630; link previews                                                                                     |

Re-export them together when the artwork changes, then move each to its place and record it in the manifest. Do not enlarge a bitmap to manufacture resolution or remove the macOS padding.

## Mangabound, the app's former name

JPmarquesbraga supplied the artwork in PR #203. On 2026-10-11 the maintainer confirmed permission to distribute it in the app and website under the project's MIT license and supplied the larger original; the maintainer also states that the original image was AI-generated. `branding/original.png` preserves that 1254 × 1254 source unchanged.

`branding/mangabound.png` retains the native-resolution artwork. A conventional crop `(98, 130, 1153, 1167)` removes the uneven transparent margin and stray almost-transparent pixels outside the mark; a transparent square canvas centers the cropped mark without stretching it. No generative editing or redrawing was used.

`icons/mangabound.png`, `icons/mangabound.ico` and `icons/mangabound.icns` are the icons Mangabound shipped with, exported from that mark with Pillow. They are kept unchanged as the record of that name.
