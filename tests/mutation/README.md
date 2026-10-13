# Mutation testing

Stryker changes the layers that hold logic one thing at a time (a condition flipped, a value
dropped, a call removed) and runs the unit tests that import the changed file. A change that no
test notices is a test that does not check what it seems to. Coverage cannot say that.

The layers are `src/domain`, `src/application`, `src/library`, `src/adapters`, `src/opds`,
`src/main` and `src/preload`: the React renderer is checked through its behavior and is not mutated.

```text
npm ci --prefix tests/mutation                 once
npm run toolchain:acquire                      once: the two tests that run the real tools need them
npm run test:mutation                          every file of every layer (about an hour)
npm run test:mutation -- src/library           every file of a folder
npm run test:mutation -- src/domain/mapping.ts only these files
MUTATE_STRINGS=1 npm run test:mutation         also change the text of messages
```

It is not a gate. It is a package of its own, as `website/` is, because Stryker needs Babel 8 and
none of it should reach the app's lockfile. The report of each file is in `reports/` (JSON).

It also runs by itself once a week (`.github/workflows/mutation.yml`, Mondays, and on request from the
Actions tab): the score and the lowest files are in the summary of the run, and the reports are
kept for a month as an artifact. That run is not a gate either; nothing fails on a score.

## How it is run, and why

- **One Stryker run per source file**, tested with only the unit tests that import it (found by the
  module name in the test's imports; the workflow classes are reached through the tests that build
  the whole workflow). A change that those do not notice is not noticed by anything meant to cover it.
- **The command runner**, one Vitest per change. Stryker's own runner for Vitest found no test to
  run under Vitest 5 (it lets Vitest choose the tests related to the changed file, and it chose
  none) and reported every change as surviving. A tool that fails by reporting success is worse than
  none: if a run says almost nothing was noticed, check that first.
- **The two tests that run the real downloaded tools are among them**, for the files they are the
  only tests of (what verifies the bundled tools and starts them). The sandbox holds `vendor/` for
  that, which is why it is not in `ignorePatterns`.
- **The text of messages is left out** unless asked for. A test that does not check a sentence is
  usually right not to.

## What survives, and is not a gap

Most of what is left after the tests were written is the same change many times. Before writing a
test for a survivor, see whether it is one of these:

- **A guard TypeScript already needs**, such as `row.state === 'inspected'` before reading a field
  that only an inspected row has. Making it always true changes nothing a caller can see.
- **An optional field spread**, `...(value === undefined ? {} : { value })`. Making the test always
  false leaves a property that is `undefined` instead of absent, which `toEqual` does not tell apart.
  Where it matters, a test says `toStrictEqual` or `not.toHaveProperty`.
- **A check that another one makes redundant.** `createMappingDraft` looks for a duplicate volume id
  and so does `addVolume`, which it calls: either alone is enough.
- **A regular expression that only differs where nothing can reach it**, such as an upper-casing
  that does nothing to digits.
- **What a platform or a default makes the same.** `writeFile(path, text, 'utf8')` without `utf8`
  writes UTF-8; a `path.sep` or a drive check cannot differ on Linux and is checked on Windows, where
  the same tests run in CI; `JSON.parse` ignores a trailing carriage return, so removing the
  removal of one changes nothing.
- **A comparison the schema already settles.** The protocol schemas accept only version 1, so a
  comparison of the version with the pinned one cannot be reached by a different value while the
  pin says 1. A pin that moved to 2 would need the schema moved with it.
- **A tie that a stable sort keeps either way**, and a `<` that becomes `<=` inside a branch where
  the two values are already different.
- **An option of the operating system that a test cannot see**: `windowsHide`, the `maxBuffer` and
  `timeout` of `execFile`.
- **A sorted copy or a joined message whose difference is not observable**: a `filter` that removes
  nothing because what it filters is never there.

A survivor that is none of these is a test to write: the one that would have failed.

## Where it stands

The first run of the layers beyond the domain and the application (73 files, 3738 changes) noticed
88.2% of them. What survived was the cancellation of a run (the signal reaching the tool and the
request), the failure of a tool on the routes that did not check it, the schemas of the protocol
(each could be made empty without a test failing), the headers of the OPDS server, damaged files, and
a handful of guards. They are held by `binding-port-boundaries`, `node-process-runner-limits`,
`tool-adapters-boundaries`, `toolchain-handshake`, `opds-http-server-answers`,
`mangabind-protocol-required`, `damaged-state-files`, `main-handlers-edges`,
`ipc-pending-and-conversion-edges` and `small-boundaries`, and the survivors that remain are of the
kinds above.
