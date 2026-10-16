# ADR 0055: The app settings dialog has a fixed size and a list of tabs beside its panel, and an Updates tab that is not available yet

- Status: Accepted
- Date: 2026-10-16
- Amends: [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (the dialog was a row of tabs above a panel that took the size of what it held), [ADR 0054](0054-the-about-tab-and-links-that-open-by-name.md) (the tabs are Interface, Updates and About)
- Relates to: [ADR 0003](0003-bundled-version-pinned-cli-binaries.md) and [ADR 0017](0017-bundled-tools-are-updated-by-hand.md) (the converters are pinned inside the app and change only with it)

## Context

The dialog behind the gear grew and shrank with the tab that was open: a panel of one field was a small box, the About tab a tall one, and the dialog moved under the pointer as the tabs were chosen. More tabs are coming (a folder to process in, themes and other choices on the Interface tab), and a row of tabs above the panel stops fitting when there are four or five of them. A list of the tabs beside the panel, in a box that does not change, is how a settings dialog with this many parts is usually made, and a person finds the tab before reading any of it.

Two tabs would also look empty in a box that size. One of the things a person looks for in an app's settings is whether it is up to date and how it is kept so; the app cannot update itself (it is installed from the releases page, and the converters inside it are pinned and change only with it, ADR 0003 and ADR 0017), but the place where that will be can be drawn now.

## Decision

- **The dialog has a size of its own: 56 rem wide and 38 rem high, whatever the tab holds.** It is smaller only when the window is: never wider than the window minus a margin and never taller than the window under the title bar. A panel that is taller than the box scrolls inside it, under a header that stays. 38 rem holds the About tab, the tallest, on the 768px-high screen ADR 0054 asks for.
- **It is centered in the part of the window under the title bar**, not in the whole window. Centered in the whole window it went under the title bar when the window was short.
- **The tabs are a list beside the panel**, at the left, under the name of the dialog. Below 768px of width the list becomes a row above the panel, so the window can still be as narrow as it opens (480px, which the pages are laid out and checked down to). The name of the tab shown is the heading of the panel (a level below the title of the dialog). It is the same ARIA tabs pattern as before: one tab in the order of Tab, the arrow keys moving between the tabs in either direction (up and down in a column, left and right in a row, since the same list is drawn either way), Home and End to the ends. With one tab there is no list.
- **The Updates tab goes between the choices and About** (Interface, then the tabs of choices to come, Updates, About). It shows the version that is installed, a notice that says that updating from inside the app is not available yet and that the options will work when it is, and the options drawn and turned off: check for updates, check automatically, and which versions to look for (stable only, or pre-release too). Nothing in it can be changed, nothing is kept, and `app-settings.json` is not touched.
- **The options are there to say where the feature will be, and to settle what it would offer**, not to promise it. The feature itself, a check that reaches a service and an update that is downloaded and installed, is a new kind of thing for the app, which downloads and updates nothing of itself while it runs; it needs its own ADR (what is contacted, what is verified before anything is installed, what the installers must be signed with, and how a person turns it off) before any of these controls does anything. Until then the notice is the truth, and a person is sent to the releases page, which is where the updates are.

## Consequences

- The picture of the dialog and of About changes, and the Updates tab has its own; the window's pictures that include the title bar do not.
- A tab is added by one entry in `app-settings-tabs.tsx`, as before; the list and the box do not change for it. The Interface tab is small until what is decided about how the window looks (themes, density) is added, and the box does not make it look empty because it keeps the size.
- A short window shows the dialog cut by the window and scrolling inside, never over the title bar.
- When the update feature is decided, the tab already has its place and its words in both languages; its controls become real one by one, each with its test.
