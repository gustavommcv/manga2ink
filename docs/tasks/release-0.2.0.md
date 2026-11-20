# Task: Update dependencies and publish the next minor

## Checkpoint

- Updated: 2026-11-19, America/Sao_Paulo
- State: in progress
- Authorization: the owner asked to update Dependabot PRs and publish a new version after reviewing the device-model preview. Release channel preference is pending; the proposed version is 0.2.0-beta.1.
- Dependency integration branch: `codex/dependabot-release-integration`, based on `9ac21040298c91047d8330be80c277db898b3ced`.
- Device-model PR: [#436](https://github.com/gustavommcv/manga2ink/pull/436), initially `7fc274c4c0d20d8e8820d3c531548a6381638522`.

## Decisions and changes

Integrate Dependabot [#430](https://github.com/gustavommcv/manga2ink/pull/430), [#431](https://github.com/gustavommcv/manga2ink/pull/431), [#432](https://github.com/gustavommcv/manga2ink/pull/432), [#433](https://github.com/gustavommcv/manga2ink/pull/433), [#434](https://github.com/gustavommcv/manga2ink/pull/434) and [#435](https://github.com/gustavommcv/manga2ink/pull/435) together. Update #435 to the combined integration head and merge it with a merge commit so GitHub recognizes the other source PRs as indirectly merged; do not close them as unverified duplicates. Require the original source PR checks and the combined #435 checks to pass before merging, then verify the resulting main commit before branch cleanup.

The converters remain mangabind v0.10.0 and mangaprep v0.9.1. Their repositories have no open PRs. New device labels belong to #436. Version and release notes must match the eventual tag; publication follows [RELEASING](../../RELEASING.md), including checks of the published downloads and the documentation deployment.

## Verification

- Original dependency heads: five passed; #435's macOS packaged preferences test failed once. Its rerun remained queued; updating its head to the full dependency integration supersedes that old run. Verify the new combined head instead.
- Combined local dependency checks: pending. Use scoped Node 24.22.2/npm 11.19.1, preserving the system installation.
- Integration PR, merged-main CI, release publication and downloaded-asset smoke: pending.

## Next action

Complete combined dependency checks and verify every required check for #435's combined head. Then integrate the reviewed device-model change and prepare the authorized release. Do not tag until application and documentation CI pass for the exact main commit.

## Cleanup

Task scratch files and scoped tools are under temporary directory `manga2ink-release-6kuf2rrl`. Remove owned downloads, extracted test packages, generated captures and build output after verification. Preserve user app data, manga inputs, dependencies and other worktrees.
