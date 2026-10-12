# Mutation testing

Stryker changes the domain and application layers one thing at a time (a condition flipped, a
value dropped, a call removed) and runs the unit tests that import the changed file. A change that
no test notices is a test that does not check what it seems to. Coverage cannot say that.

```text
npm ci --prefix tests/mutation                 once
npm run test:mutation                          every file of both layers (an hour or more)
npm run test:mutation -- src/domain/mapping.ts only these files
MUTATE_STRINGS=1 npm run test:mutation         also change the text of messages
```

It is not a gate. It is a package of its own, as `website/` is, because Stryker needs Babel 8 and
none of it should reach the app's lockfile. The report of each file is in `reports/` (JSON).

## How it is run, and why

- **One Stryker run per source file**, tested with only the unit tests that import it (found by the
  module name in the test's imports; the workflow classes are reached through the tests that build
  the whole workflow). A change that those do not notice is not noticed by anything meant to cover it.
- **The command runner**, one Vitest per change. Stryker's own runner for Vitest found no test to
  run under Vitest 5 (it lets Vitest choose the tests related to the changed file, and it chose
  none) and reported every change as surviving. A tool that fails by reporting success is worse than
  none: if a run says almost nothing was noticed, check that first.
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

A survivor that is none of these is a test to write: the one that would have failed.
