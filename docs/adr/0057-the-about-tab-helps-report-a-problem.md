# ADR 0057: The About tab helps report a problem, and says what it leaves out

- Status: Accepted (amended by [ADR 0058](0058-the-app-keeps-a-log-file.md): `logs` is a second folder that opens by name)
- Date: 2026-10-16
- Relates to: [ADR 0054](0054-the-about-tab-and-links-that-open-by-name.md) (the About tab, and places that open by name), [ADR 0053](0053-what-is-said-outside-the-window-is-a-code.md) (a failure is a code the window writes)

## Context

A person who reports a problem is asked which version of the app and of each converter is running, on what system, and whether the tools passed their check. The About tab said the version of the app and nothing else, so each answer was a search through the installation. The app's own files (its settings) are in a folder most people do not know the name of, and an answer to "send me your settings file" starts with finding it.

What helps a report can also give away what the person did not mean to: the name of a series, the place of a folder, a user name inside a path.

## Decision

- **A button copies the diagnostics.** The main process builds the text and puts it on the clipboard (`app:copy-diagnostics`): the version of the app and whether it is a packaged build, Electron, Chrome and Node, the system and its architecture and version, how many processors and how much memory, the language of the window, whether the working folder was chosen, and each converter with its version and whether it passed the check made at launch.
- **What it leaves out is a promise, and a test says it.** No path, nothing named by the person (a folder, a title), nothing from a log, and not what a failed check said about a tool (it may name a place on the disk). A chosen working folder is said as "chosen by the person", not as where it is. The text is always English, since it is read by whoever answers, and one thing is on each line.
- **The folder of the app's data opens in the file manager** (`app:open-folder`). The window names the folder (`data` is the only one for now) and the main process has the path, as with a place that opens by name (ADR 0054): the page never gives a path. If the system cannot open it the person is told, and that is a code the window writes.
- **They are in a section of their own, Troubleshooting, of the About tab,** with a line that says what is in the diagnostics and what is not, so that a person can decide before pasting.
- **The versions of the converters were added to the same tab** (a section, "Conversion tools"), from what the main process already verifies at launch; and the release notes of the running version are one more place that opens by name.

## Consequences

- A report can start from one paste instead of a list of questions.
- The main process keeps what the tools were found to be at launch, since the diagnostics need it again.
- A new folder to open is a name in `src/shared/app-folders-contract.ts` and a path in `src/main/ipc/troubleshooting.ts`; the log file of a later change will be one.
- The diagnostics are a promise about what the app tells, so adding a line to them is a decision: it goes through the test that looks for paths.
