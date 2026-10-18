# ADR 0068: How many books of a title are converted at once is a choice, and a queue keeps the one it began with

- Status: Accepted
- Date: 2026-10-18
- Amends: [ADR 0027](0027-bounded-volume-conversion.md) (the limit was worked out once, when the app started, with no way to change it)
- Relates to: [ADR 0065](0065-a-queue-is-a-signal-the-window-gives-the-main-process.md) (a queue copies the choices it begins with), [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (the app's own settings)

## Context

[ADR 0027](0027-bounded-volume-conversion.md) converts the volumes of one title with a bounded pool, and the bound was the lesser of three, one worker for every four processors and one for every four GiB of memory. The main process worked it out once, when it built the workflow, and handed the workflow a number. Nobody could change it, and the code could not either: a number fixed at construction cannot follow a choice.

A person has reasons to want it different. A laptop that has to stay usable while a series converts may want one at a time, whatever the count says. A desktop whose count came to two may be fine with three, and one with many more processors than any that was measured may do better with still more. ADR 0027 measured one machine (12 processor threads, 32 GiB: three at once took about half the time of one, and four were slower), so its rule is a conservative guess for the others, not a measurement of them.

This is the part of the app that is most expensive to get wrong: it decides how many conversion processes run, and so how much memory and processor a conversion takes.

## Decision

- **A choice with seven values:** **Automatic**, 1, 2, 3, 4, 6 or 8, **Parallel conversions** in the Processing tab, under **While Mangabound converts**. It is kept in `app-settings.json` as `parallelConversions` (`"automatic"`, or the number). The file stays at version 1: a key that is missing, or is not one of those, reads as **Automatic**, as the theme reads as dark. The window changes it through `app:save-settings`, which accepts those values and nothing else. The numbers step wider as they grow (no 5 or 7) so the list stays short.
- **Automatic is what the app did before, unchanged, and still comes to 3 at most.** It is ADR 0027's rule, worked out from the processors and the memory of the computer each time it is asked. Nobody who does not choose sees any difference. Its most (`mostAutomaticConversions`) is no longer the most a person can name.
- **A number that is named is the person's, and may be more than Automatic ever comes to.** It is not lowered to what the computer would allow: they asked for it, and the guide says what more at once costs and how to go back. The numbers go to 8 because of what was measured (below): on twelve processor threads nothing is gained past 3 and nothing is lost, and one conversion keeps a smaller share of the threads busy the more there are, so a computer with many more should gain from more at once. That last part is a guess, not a measurement, which is why Automatic does not go there.
- **The workflow asks, it is not told.** `ConversionWorkflow` takes a function that gives the limit, and asks it each time a title starts converting its volumes: once for a title, not for each volume, and not once for the life of the app. Whatever it answers is made a whole number of at least one (`workerLimit`) where the pool is built, because a pool of no workers would end having converted nothing and said nothing. A volume that is converted alone, copies that only join volumes, and the titles of a library one after the other (ADR 0027) are as they were.
- **A queue keeps the one it began with.** `QueueRuns` copies `parallelConversions` with the other choices when `queue:begin` arrives (ADR 0065), so a change made while a queue runs is for the next one. The function the workflow is given (`conversionLimit`, in `src/main/conversion-limit.ts`) asks the queues that run for what they began with. Should more than one run, it uses the fewest, since what they take adds up. A conversion that no queue asked for (the window could not say that a queue began) uses what is chosen now. The window never sends the number: it sends the choice, and the main process knows the computer.
- **What does not change:** the order in which books come out and are published, what a failure does (nothing new starts; the ones that are running finish), what cancelling does (every running conversion is stopped), the progress of a title, and the queue's items going one after the other.

## What was done about the risk

- The pool's limit, order and cancelling are tested for each of the numbers, not for one: with 1, 2, 3, 4, 6 and 8 at most that many run at once while the books finish in reverse order and still come out in the order of the volumes; with 2, 3 and 6 running, cancelling stops all of them and starts no later volume; and a limit that is zero, negative, fractional, infinite or not a number still converts every volume, never fewer than one at a time.
- The limit is asked once for a title, and a change made while a title converts does not reach it; the next title is asked again.
- `conversionLimit` is a pure function of what the queues began with, what is chosen now and the computer, and is tried without Electron; the bootstrap test checks the workflow is given that function and that a queue that is running keeps its number when the choice changes.
- The file, the command, the registry, the tab (English and Portuguese), the story (with the contrast and role checks of the stories) and, in the packaged app, that the choice reaches the file as a number and goes back, are tested.

## What was measured (2026-10-18)

Asked whether the number could go past 3, the real bundled `mangapress` (0.8.0) was run directly with the arguments the app gives it by default (the Kindle Paperwhite 6 profile, the starting options, CBZ) on 12 volumes of 100 pages each, N at a time. The pages are **drawn, not scanned** (1500 by 2200, grayscale JPEG, about 100 MB a volume: panels, screentone, speech bubbles, scanner noise), so they are the size and kind of a manga page and not a real one. The computer was an AMD Ryzen 5 5600X (6 cores, 12 threads) with 32 GiB under Windows 11, with other programs open, and the same setup varied by up to about 20% from one run to the next. A smaller computer was made by limiting the process to its first K logical processors and telling `rayon`, which `mangapress` uses, to start K threads. The program that did this is not kept in the repository.

Twelve threads, total time for the 12 volumes (the processor time used was about 360 seconds whatever N, so 30 seconds is the least that twelve threads can do it in):

| At once | Runs | Median | Best | Threads busy |
| ------- | ---- | ------ | ---- | ------------ |
| 1       | 5    | 40.8 s | 37.4 | 8.9 of 12    |
| 2       | 2    | 42.1 s | 33.8 | 9.0          |
| 3       | 5    | 34.7 s | 32.8 | 10.5 to 11.1 |
| 4       | 2    | 32.7 s | 32.6 | 11.2         |
| 6       | 5    | 38.3 s | 34.1 | 9.6 to 10.3  |
| 8       | 2    | 40.7 s | 32.6 | 9.5          |
| 12      | 5    | 33.9 s | 33.1 | 10.6 to 11.2 |

- **Up to 3, more at once is faster, about 15% to 20%, and past 3 nothing more is gained on twelve threads.** Three at once were steady (32.8 to 34.8 s) at 88% to 93% of the least possible. More than that cost no time (twelve at once took 33.9 s) but memory: each conversion peaked near 580 MB, so twelve at once took about 6 GB of the computer's memory.
- **One conversion keeps a smaller share of the threads busy the more there are:** 95% of 4 (3.8), 85% of 8 (6.8) and 74% of 12 (8.9). On 4 and 8 threads, then, one conversion already fills the computer and more at once gained nothing that the noise did not hide (85 s, 84 s, 89 s and 91 s for 1 to 4 at once on 4 threads; 51 s for 1 and between 45 and 57 s for 2 to 6 on 8). Each conversion peaked at 344, 470 and 580 MB on 4, 8 and 12 threads.
- **This is why more than 3 is on offer.** The share one conversion keeps busy keeps falling as threads are added, so a computer with 24, 32 or 64 threads should want 3, 4 or more at once to fill them. A straight-line fit of that fall, from three points, puts about 4 at 32 threads and about 6 at 48. It is a guess from a computer that is not one of those, so Automatic stays at 3 at most and a person with such a computer can try 4, 6 or 8.
- **It differs from ADR 0027,** which measured 65 s for one at a time and 32 s for three on a real 11-volume manga, and found four slower. This found three at once about 15% to 20% faster than one and four no slower than three. The pages here are drawn, and `mangapress` may use the threads of one conversion better than it did then (not checked); both are the same class of computer. ADR 0027's figure is left as it was.

## What is not verified, and why

- **Anything on more than twelve threads.** There is no such computer here, so what a larger one gains from 4, 6 or 8 is the fit above and not a measurement. Nor was a real manga used, nor EPUB or PDF output.
- **Memory on a small computer.** A named number is not checked against the computer, so someone with 4 GiB who chooses 8 gets eight conversions on 4 GiB. The test above measured what each takes (about 350 to 600 MB on 4 to 12 threads, with pages of this size) but not what happens when the memory runs out; the guide says to go back to **Automatic** or 1 if the computer becomes slow.
- **That a conversion fails cleanly when the computer runs out of memory.** The tools' behavior then was not exercised.

## Not done

- Showing, next to **Automatic**, the number it comes to on this computer. It would need the main process to say it to the window; for now the guide gives the rule and an example.
- Applying a change to a queue that is already running.
- Converting several items or several titles of a library at the same time (ADR 0027 keeps them one after the other so that pools do not multiply).
