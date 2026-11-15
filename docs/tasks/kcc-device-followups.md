# Task: Add Kindle 1440x1920 and reset rainbow reduction

## Checkpoint

- Updated: 2026-11-15, America/Sao_Paulo.
- State: the owner approved the first beta release. The verified converter pin and app release notes are prepared together.
- Manga2Ink: [#428](https://github.com/gustavommcv/manga2ink/pull/428) merged as b1544c8.
- mangaprep: [#76](https://github.com/gustavommcv/mangaprep/pull/76) merged and [v0.9.1](https://github.com/gustavommcv/mangaprep/releases/tag/v0.9.1) published.

## Changes and boundaries

mangaprep lists `K1920` as a 1440-by-1920 Kindle profile with 16 gray levels. Manga2Ink starts with image enlargement off for the profile and applies [ADR 0097](../adr/0097-rainbow-reduction-follows-the-selected-screen.md) when the device changes.

## Verification

- mangaprep passed six device resolution tests, 36 synthetic checks and a comparison of 48 locally held manga pages against KCC 13.0.1 for the new profile. The published archives matched their SHA-256 checksums.
- Manga2Ink passed the application and documentation checks for #428. Local Windows tests included the 25 packaged desktop specs.

## Next action

After the beta release PR merges, verify both workflows for the merged commit before publishing v0.1.0-beta.1. Complete the desktop checklist with the published download before considering a stable release.
