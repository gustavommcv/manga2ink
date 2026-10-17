# ADR 0062: The window opens as it was left

- Status: Accepted
- Date: 2026-10-17
- Relates to: [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (the app's own settings are in a file of their own), [ADR 0055](0055-the-settings-dialog-has-a-fixed-size.md) (a window that is made small must stay usable)

## Context

The window always opened at 1180×760, wherever the system put it. A person who made it smaller to sit beside a reader, or larger on a big display, or moved it to another display, did it again at every launch.

## Decision

- **A file of its own.** `window-state.json` in the per-user data folder holds `{ version, width, height, x?, y?, maximized }`. It is not in `app-settings.json`: it is rewritten every time a window is dragged to rest, and a file that is written that often should not be the one a language choice shares, nor one whose failure is told to anyone. It is read once, when the window is made; what cannot be used (no file, damaged, another version, a size that is not one) is a window that opens as it always did.
- **What is kept is the size the window has when it is neither maximized nor full screen** (`getNormalBounds`), where it was, and whether it was maximized. Full screen is not kept: opening full screen is not what a person who left in it expects. A maximized window opens maximized, and un-maximizing goes to the size it was.
- **When it is kept.** After the window has stayed as it is for half a second (a drag is a stream of moves), when the window closes, and when the app quits (the quit step asks the keeper to keep every window as it is, because a quit by menu or key can be ahead of the last write). Writes go one after another, a state that is the same as what is kept is not written, and one that fails to be written is told in the log and stops nothing.
- **What is read is checked against the displays there are now** (`placeWindow`, a pure rule in the domain). A size is never under the least a window can be made, nor more than the display it is on. A place is kept only if at least 120×48 pixels of the window's top (enough of the title bar to take hold of) are on a display, and is then moved the least that puts the window wholly on it. Otherwise the system chooses the place and the size is still kept. A display that was unplugged, a resolution that changed, or a window left half off the screen do not put the window where it cannot be reached.
- **A Wayland session places nothing.** There a program cannot say where its window goes, and a position it asks for is ignored, so it is neither kept nor trusted (`windowPositionsAreKnown`: Linux with `XDG_SESSION_TYPE=wayland` or `WAYLAND_DISPLAY`). The size is kept there. A tiling window manager decides the size of a tiled window itself, so what is kept is the last size it gave; it is only the size the window opens with where the manager lets it.

## Consequences

- The window comes back where and how it was left, on every system, on the displays that are still there.
- On Wayland and under a tiling manager the gain is the size of a floating window and whether it was maximized; the place is the compositor's.
- A new file in the data folder; the packaged suite checks it is written, and the unit tests check the reading, the rule, the keeper and the quit.
- The least size and the size it opens at are in one place (`src/domain/window-state.ts`), and the window and the rule both read them.
