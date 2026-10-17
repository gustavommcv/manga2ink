# ADR 0063: The app looks for a newer version when it is asked, and sends a person to the page to download it

- Status: Accepted
- Date: 2026-10-17
- Amends: [ADR 0055](0055-the-settings-dialog-has-a-fixed-size.md) (the Updates tab said that nothing in it could be done yet)
- Relates to: [ADR 0003](0003-bundled-version-pinned-cli-binaries.md) and [ADR 0017](0017-bundled-tools-are-updated-by-hand.md) (the app, and the converters inside it, change only when a new version is installed), [ADR 0054](0054-the-about-tab-and-links-that-open-by-name.md) (a place is opened by its name, never by an address the window gives), [ADR 0053](0053-what-is-said-outside-the-window-is-a-code.md)

## Context

The Updates tab drew a button that did nothing, and a notice that the app could not update itself. A person with an installed alpha has no way to know that another one is out, short of reading the releases page, and a new alpha comes every few days. Updating by itself is a different feature: it differs by system (Windows has an installer that can do it, macOS needs the app signed, Linux installs from packages), and it needs the installers to be signed to be safe. Telling a person that a newer version exists, and where to get it, needs none of that.

## Decision

- **The check is a button, and nothing else starts one.** The app contacts nothing at launch and on no timer, and keeps nothing between checks. The choice of checking at launch is still drawn in the tab, and cannot be changed.
- **What is contacted is the list of the app's releases on GitHub** (`api.github.com`, over https), as anyone may read it: no account, no token. What goes out is what any request carries, the address of the computer and a user agent that says what the app is. Nothing about the person, the computer or the books is sent. Only the tag, whether it is a pre-release and the day it was published are read, and a draft is left out.
- **The newest version is the newest by semantic version**, not by date: `0.1.0-alpha.9` is before `0.1.0-alpha.10`, and an alpha is before the version it leads to. It is compared with the version that is running, which the main process says (the window never does). A tag that is not a version is not a release of the app and is ignored.
- **Pre-releases are looked for,** since every release so far is one. The choice of which versions to look for is drawn and cannot be changed, and shows the one that is in force; it becomes real when there is a stable version to choose against.
- **What the tab says** is that the installed version is the newest, or that a newer one is out (with its number and the day it was published), or why GitHub could not be asked, in the words of an online source (it cannot be reached, it does not answer in time, it is rate-limiting, it answered with something unexpected). A newer version has a button, **Download the update**, which opens the page of the app's releases in the browser of the system. The window names the place (`releases`) and the address is the main process's (ADR 0054). The app installs nothing and downloads nothing: the person downloads the file for their system and installs it as the first time.
- **The failure is the same one every online source has,** so the check goes through the same request as the online sources do (`requestText`): a timeout, a limit, an error status and a malformed answer are told alike.

## Consequences

- A person can see that a new version is out without leaving the app. It is not an update: nothing is installed by the app, and the installers are still not signed (the release notes say so). Installing by itself on Windows, and on macOS once the app is signed, is a feature of its own, with an ADR of its own: what is downloaded, what is verified before it is run, and what the releases must publish (the Squirrel files the release leaves out today).
- GitHub sees the address of the computer when the button is clicked, and limits anonymous requests (60 an hour), which is told as a limit when it is reached.
- The check says nothing of what is new in a version. The page it opens has the release notes and the files.
- The Updates tab's picture changed, and the About tab's did not.
