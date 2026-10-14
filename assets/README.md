# App and website artwork

JPmarquesbraga supplied the artwork in PR #203. On 2026-10-11 the maintainer confirmed permission to distribute it in the app and website under the project's MIT license and supplied the larger original. `branding/original.png` preserves that 1254 × 1254 source unchanged.

`branding/mangabound.png` retains the native-resolution artwork. A conventional crop `(98, 130, 1153, 1167)` removes the uneven transparent margin and stray almost-transparent pixels outside the mark; a transparent square canvas centers the cropped mark without stretching it. No generative editing or redrawing was used.

Exports use Pillow's PNG, ICO, ICNS and lossless WebP encoders with Lanczos downsampling:

| Asset                                        | Export                                                                                                                                                                                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `icons/mangabound.png`                       | 1024 × 1024, tight square master; Linux packages and non-Windows windows                                                                                                                                      |
| `icons/mangabound.ico`                       | 16, 20, 24, 32, 40, 48, 64, 128 and 256 px; Windows executable, installer and window                                                                                                                          |
| `icons/mangabound.icns`                      | Standard ICNS representations through 1024 px; macOS bundle, with the cropped mark centered on the original 1254 px canvas before downsampling to retain Dock padding                                         |
| `../website/src/assets/branding/header.webp` | 128 px, lossless; Starlight's compact header, retaining the site title                                                                                                                                        |
| `../website/public/favicon.ico`              | 16, 32, 48 and 64 px; browser icon without the unnecessary large desktop frames                                                                                                                               |
| `../website/public/mangabound.ico`           | Exact copy of `icons/mangabound.ico`; public URL required by Squirrel's installed-program entry                                                                                                               |
| `../website/public/social-preview.png`       | 1200 × 630, `icons/mangabound.png` at 630 px centered on the artwork's own background color (`#0b1d30`), as a 256-color palette PNG of about 260 KB, so that link previews that refuse larger files accept it |

Re-export these files together when the artwork changes. Preserve transparency and aspect ratio; do not remove the macOS-specific padding or enlarge a bitmap to manufacture resolution. The website imports the square master directly and Astro creates responsive lossless WebP images at build time. Native branding files and the favicon are not tutorial screenshots and do not run through Storybook capture.
