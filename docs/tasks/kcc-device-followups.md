# Task: Add Kindle 1440x1920 and reset rainbow reduction

## Checkpoint

- Updated: 2026-11-15, America/Sao_Paulo.
- State: the owner reviewed the changes and approved integration for the first beta.
- Manga2Ink: `codex/reset-rainbow-on-device-change` with the reviewed changes committed locally.
- mangaprep: `codex/kindle-1440x1920` in [mangaprep #76](https://github.com/gustavommcv/mangaprep/pull/76).

## Changes and boundaries

mangaprep lists `K1920` as a 1440-by-1920 Kindle profile with 16 gray levels. Manga2Ink prepares its enlargement default and applies the device-switch rule in [ADR 0097](../adr/0097-rainbow-reduction-follows-the-selected-screen.md). The new profile reaches the app after a mangaprep release and a verified pin update.

## Verification

- mangaprep: six CLI device-resolution tests passed. The K1920 comparisons against KCC 13.0.1 passed 36 checks across three page scenarios. The temporary Rust and KCC checkout was removed.
- Manga2Ink: 154 focused unit and component tests passed. The settings module reached 100% coverage, and TypeScript, focused ESLint, formatting and guide label checks passed.

## Next action

Open separate pull requests and verify the checks on their exact heads and merged commits. Publish mangaprep 0.9.1 and verify its assets, then update the verified tool pin for Manga2Ink 0.1.0-beta.1. Run the release checklist with the published beta before considering a stable release.
