# ADR 0064: The app settings open by the keys of the system

- Status: Accepted
- Date: 2026-10-17
- Relates to: [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (the gear opens the app settings), [ADR 0055](0055-the-settings-dialog-has-a-fixed-size.md) (the dialog and its tabs)

## Context

The app settings opened only by the click on the gear in the title bar. Every system has a key for a program's settings, and a person who works with the keyboard, or beside a reader in a window half the screen wide, reaches for it. Nothing told a screen reader which keys a control answers to.

## Decision

- **Ctrl+, on Windows and Linux, Cmd+, on macOS.** It is what the editors and browsers a person has used have made it, and what every macOS app has for its settings. `settingsShortcut(platform)` (`src/renderer/lib/shortcuts.ts`, under the 100% gate) says the keys, how they are written (`Ctrl+,`, `⌘,`), how they are announced, and when a key press is them. The comma is the key that prints a comma (`event.key`), so a keyboard whose layout puts it elsewhere still works. Held with any other modifier it is another shortcut and is left alone: on macOS Ctrl+, is not it, nor is Cmd+, on the others, where that key is the system's.
- **It works wherever the focus is in the window.** The menu listens on the window while it is shown, stops the browser's own answer to the key (`preventDefault`), and gives the listener up when it goes. Pressed while the dialog is open it leaves the dialog open: it is a way in, not a switch, and Escape and the close button remain the ways out.
- **The dialog is controlled by the menu** (`open` state), which is what lets a key press open what a click on the gear opens. The click, the focus going back to the gear, the tabs starting from the first each time, and `onClose` (ADR 0061) are as they were.
- **The gear says it.** It has `aria-keyshortcuts` (`Control+,` or `Meta+,`) for a screen reader, and a tip, written by the catalog in the language of the window (`App settings (Ctrl+,)`), when the pointer rests on it. Its name stays "App settings". The keys come from the system the app runs on, which `AppInfo` now carries (`platform`, from the bridge's runtime).

## Consequences

- The settings are one key press away in every language of the window, and the keys are announced and shown.
- A shortcut for something else is added to `shortcuts.ts` beside this one, and is decided there for every system.
- A keyboard that cannot make a comma without a modifier (some layouts need Shift) does not reach it by this; the gear is still there.
