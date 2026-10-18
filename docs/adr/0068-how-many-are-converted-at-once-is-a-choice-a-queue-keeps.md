# ADR 0068: How many books of a title are converted at once is a choice, and a queue keeps the one it began with

- Status: Accepted
- Date: 2026-10-18
- Amends: [ADR 0027](0027-bounded-volume-conversion.md) (the limit was worked out once, when the app started, with no way to change it)
- Relates to: [ADR 0065](0065-a-queue-is-a-signal-the-window-gives-the-main-process.md) (a queue copies the choices it begins with), [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (the app's own settings)

## Context

[ADR 0027](0027-bounded-volume-conversion.md) converts the volumes of one title with a bounded pool, and the bound was the lesser of three, one worker for every four processors and one for every four GiB of memory. The main process worked it out once, when it built the workflow, and handed the workflow a number. Nobody could change it, and the code could not either: a number fixed at construction cannot follow a choice.

A person has reasons to want it different. A laptop that has to stay usable while a series converts may want one at a time, whatever the count says. A desktop whose count came to two may be fine with three. ADR 0027 measured one machine (12 processors, 32 GiB: three at once took about half the time of one, and four were slower), so its rule is a conservative guess for the others, not a measurement of them.

This is the part of the app that is most expensive to get wrong: it decides how many conversion processes run, and so how much memory and processor a conversion takes.

## Decision

- **A choice with four values:** **Automatic**, 1, 2 or 3, **Parallel conversions** in the Processing tab, under **While Mangabound converts**. It is kept in `app-settings.json` as `parallelConversions` (`"automatic"`, or the number). The file stays at version 1: a key that is missing, or is not one of the four, reads as **Automatic**, as the theme reads as dark. The window changes it through `app:save-settings`, which accepts those four values and nothing else.
- **Automatic is what the app did before, unchanged.** It is ADR 0027's rule, worked out from the processors and the memory of the computer each time it is asked. Nobody who does not choose sees any difference.
- **A number that is named is the person's.** It is not lowered to what the computer would allow: they asked for it, and the guide says what more at once costs and how to go back. The choices stop at 3, since ADR 0027 found four slower than three.
- **The workflow asks, it is not told.** `ConversionWorkflow` takes a function that gives the limit, and asks it each time a title starts converting its volumes: once for a title, not for each volume, and not once for the life of the app. Whatever it answers is made a whole number of at least one (`workerLimit`) where the pool is built, because a pool of no workers would end having converted nothing and said nothing. A volume that is converted alone, copies that only join volumes, and the titles of a library one after the other (ADR 0027) are as they were.
- **A queue keeps the one it began with.** `QueueRuns` copies `parallelConversions` with the other choices when `queue:begin` arrives (ADR 0065), so a change made while a queue runs is for the next one. The function the workflow is given (`conversionLimit`, in `src/main/conversion-limit.ts`) asks the queues that run for what they began with. Should more than one run, it uses the fewest, since what they take adds up. A conversion that no queue asked for (the window could not say that a queue began) uses what is chosen now. The window never sends the number: it sends the choice, and the main process knows the computer.
- **What does not change:** the order in which books come out and are published, what a failure does (nothing new starts; the ones that are running finish), what cancelling does (every running conversion is stopped), the progress of a title, and the queue's items going one after the other.

## What was done about the risk

- The pool's limit, order and cancelling are tested for each of the three numbers, not for one: with 1, 2 and 3 at most that many run at once while the books finish in reverse order and still come out in the order of the volumes; with 2 and 3 running, cancelling stops all of them and starts no later volume; and a limit that is zero, negative, fractional, infinite or not a number still converts every volume, never fewer than one at a time.
- The limit is asked once for a title, and a change made while a title converts does not reach it; the next title is asked again.
- `conversionLimit` is a pure function of what the queues began with, what is chosen now and the computer, and is tried without Electron; the bootstrap test checks the workflow is given that function and that a queue that is running keeps its number when the choice changes.
- The file, the command, the registry, the tab (English and Portuguese), the story (with the contrast and role checks of the stories) and, in the packaged app, that the choice reaches the file as a number and goes back, are tested.

## What is not verified, and why

- **Memory and processor use on a small computer at 3.** A named number is not checked against the computer, so someone with 4 GiB who chooses 3 gets three conversions on 4 GiB. Nothing here measures what that costs; the guide says to go back to **Automatic** or 1 if the computer becomes slow. ADR 0027's timing was taken on one machine, and the gain of 2 or 3 on any other is unknown.
- **That a conversion fails cleanly when the computer runs out of memory.** The tools' behavior then was not exercised.

## Not done

- Showing, next to **Automatic**, the number it comes to on this computer. It would need the main process to say it to the window; for now the guide gives the rule and an example.
- Applying a change to a queue that is already running.
- Converting several items or several titles of a library at the same time (ADR 0027 keeps them one after the other so that pools do not multiply).
