# Task: Recognizable device model names for 0.2.0

## Checkpoint

- Updated: 2026-11-19, America/Sao_Paulo
- State: ready for review
- Branch and PR: `codex/device-model-names`; no PR opened
- Base and observed HEAD: `9ac21040298c91047d8330be80c277db898b3ced`; task-owned uncommitted draft
- Working tree: device model catalog, localized names, conversion mapping, regression tests and matching documentation

## Goal and boundaries

Offer separate model choices with commercial names, release years and manufacturer generations where available, for the next minor version, 0.2.0. Preserve old saved profile IDs and the identity of each new selection after reopening. Follow [ADR 0098](../adr/0098-device-choices-identify-the-model-and-release-year.md). The owner asked to see changes before a PR. A merge and release tag need their own approval.

## Decisions and changes

The domain maps model IDs to existing mangaprep profiles. The toolchain hook expands only available profiles and formats names in the current language. Conversion planning, conversion and device defaults resolve the same mapping. The existing settings schema retains model IDs without migration. The conversion guide explains the names in English, Portuguese and Japanese.

Aura Edition 2, Aura H2O Edition 2 and reMarkable Paper Pure remain pending verification of conversion profiles, recorded in current priorities.

## Verification

| Check                                        | Commit or working-tree state | Result and evidence                                                                                                                                                                                                                                                                           |
| -------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused unit and real-converter tests        | Draft                        | 117 passed, including model aliases through the pinned mangaprep                                                                                                                                                                                                                              |
| `npm run check`                              | Draft                        | Passed: 5,495 unit tests (one unrelated skipped), 915 component tests, 223 stories in each theme, lint/type checks, production audit and Storybook build. Required unit coverage: 100% in every metric.                                                                                       |
| `npm run package:e2e` and `npm run test:e2e` | Draft, Windows x64           | Passed: all 25 packaged spec files, including selecting and retaining `K11-2024` after reopening.                                                                                                                                                                                             |
| Narrow-window visual behavior tests          | Draft                        | Both passed. Portuguese model preview inspected; 480px viewport has 480px document width.                                                                                                                                                                                                     |
| `npm run site:check`                         | Draft                        | Passed: 45 tutorial capture tests, build, audit, unit/link/translation checks, 310 browser tests (four existing skips) and 12 development-media tests. The first capture attempt had a Playwright trace ENOENT from concurrent suites sharing a results directory; the isolated rerun passed. |
| Application and documentation CI             | No PR                        | Not run                                                                                                                                                                                                                                                                                       |

## Next action

The local implementation and preview are ready for the owner's review before a PR, as requested. After review, open the focused PR, inspect changed visual baselines from Windows CI and verify application and documentation CI for the exact final head. Merge requires explicit owner approval; the 0.2.0 release remains a separate step.

## Cleanup and outcome

Checks used scoped Node 24.22.2 and npm 11.19.1 on Windows x64. Removed the task-owned temporary directory `manga2ink-models-tools-t2g2chwy`, packaged test app, webpack/Storybook output, browser results, website build/cache and generated tutorial captures after verification: 572.0 MiB in nine directories. The inspected Portuguese preview is retained as a 34 KiB image outside the checkout. User inputs, installed app data, dependencies and other repositories are preserved.

Visual screenshot baselines must be reviewed from Windows CI after the owner reviews the local changes and a PR is opened; they were not regenerated locally. No release or version bump is included in this draft.
