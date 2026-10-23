# ADR 0091: The converter is mangaprep

- Status: Accepted
- Date: 2026-10-23
- Amends: [ADR 0003](0003-bundled-version-pinned-cli-binaries.md), [ADR 0017](0017-bundled-tools-are-updated-by-hand.md), [ADR 0038](0038-cover-options-and-the-kobo-file-name.md)

## Context

mangapress was renamed to mangaprep in release 0.9.0, which also follows KCC 12.1.1. Its executable, release assets and machine-protocol `tool` value changed together. The upstream protocol version remains 1; accepting the old literal would reject the pinned release. The app supplies explicit output filenames for typed titles, which bypass the converter's new Kobo derived-name sanitization.

## Decision

Pin the published mangaprep 0.9.0 for all four supported targets, checking archive and executable hashes through the existing update script. Rename the adapter, tool manifest key, scripts, diagnostics, interface text and guide together. Require `tool: "mangaprep"` and protocol version 1; do not accept both identities, since the app ships and verifies one exact converter release. Historical records keep the former name, and the guide keeps its existing CLI page URLs.

For a Kobo EPUB without custom dimensions, replace each of `/ \\ ? % * : ; | " ' > < $ !` in a typed filename with `_` before portable filename sanitization. Preserve runs, internal spaces and dots. This also applies with `--nokepub`; that option changes the extension only. Other formats and custom dimensions retain their current portable filename behavior. Book metadata receives the original title. Untitled output names remain the converter's responsibility.

## Consequences

The tool update brings KCC 12.1.1 profiles, 16-bit decoding and grayscale gamma ordering to the app. Real-tool tests exercise planning and writing with Kobo punctuation and an unchanged metadata title. The advanced-options examples are regenerated with the new pin.

Saved preferences still use the same flat `settings` fields and version 1, so no preference migration is needed. This change prepares the next application release; it does not publish a tag.
