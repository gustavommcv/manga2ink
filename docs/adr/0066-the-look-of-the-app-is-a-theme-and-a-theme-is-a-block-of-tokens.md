# ADR 0066: The look of the app is a theme, and a theme is a block of tokens

- Status: Accepted (amended by 0067, 0070)
- Date: 2026-10-17
- Relates to: [ADR 0002](0002-shadcn-radix-tailwind-design-system.md) (the design tokens), [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (the app's own settings and the dialog behind the gear), [ADR 0062](0062-the-window-opens-as-it-was-left.md) (what the main process makes the window with)

## Context

The app has one look, a dark graphite one, written once as the CSS variables of `:root` in `src/renderer/styles.css`. A light theme is wanted, and it will come in a change of its own. What that change should be is the block of colors and the name of the theme, and nothing else: no component should have to learn that there is more than one look, and nothing that the window is made with should be left in the dark one by accident. Before that, the structure that lets a theme be added has to be in place, with one theme in it.

Three places hold the look. The page's own colors are CSS variables. The **window** is painted by Electron before the page draws, and its title bar buttons on Windows and Linux are drawn by the system over the page, from colors given in code; Electron cannot read CSS variables, so those were hex values written in `window.ts` with a comment asking that they be kept in step. And the **choice** has to be kept and applied.

## Decision

- **A theme is a name in `src/domain/theme.ts`** (`themes`, `Theme`, `defaultTheme`, `isTheme`), with its **window colors** (`themeWindowColors`: the background and the foreground as hex). There is one, `dark`, which is the look the app has always had.
- **A theme is a block of the same variables in the stylesheet,** selected by the `data-theme` attribute of the page (`:root[data-theme='dark']`). A component reads the variables through the tokens and never knows which theme it is in. The bare `:root` is the default theme too, so a page with no attribute (Storybook, a test, the moment before the settings are read) is drawn as the app has always been. `index.html` names the default theme on the page itself. Adding a theme is a new block that sets every variable (including `color-scheme`), its entry in `themes` and in `themeWindowColors`, and its name in each language's catalog; the compiler asks for the last two, and a test asks for the first.
- **A test keeps them in step.** It reads the stylesheet, checks that each theme has a block that sets the same variables as every other, that the bare `:root` is the default theme and no other, that `index.html` names the default one, and that the `--background` and `--foreground` of each block, converted from `oklch` to hex, are the window colors of the theme. The comment that asked for them to be kept in step is now a check.
- **The choice is `theme` in `app-settings.json`,** next to the language and the choices about a queue (ADR 0065), and in the command that keeps them (`app:save-settings` takes the choices that changed). The file stays at version 1: a theme that is missing, or that this build does not have (one a newer version wrote), reads as the default theme, as an unknown language reads as following the system.
- **The page follows it.** `AppSettingsProvider` puts the theme on `<html>` (`dataset.theme`), as it puts the language. Everything under it is drawn with the variables the attribute selects.
- **The window follows it too, where the system draws.** `createMainWindow` takes the theme and paints with its colors; when a theme is kept, the settings handler tells the main process, which gives every open window its background and, off macOS, the overlay of its buttons (`applyThemeToWindow`). The tokens and the hex now come from one place each, and the window no longer has colors of its own in code.
- **A selector in the Interface tab, with one option.** **Theme** is a native select under **Language**, with the name of each theme in the window's language ("Dark (graphite)" / "Escuro (grafite)"). It has a single option now and is not disabled: it is a real choice that will have more, and the control, its name, its message when the choice cannot be kept and its place in the file and in the tests are the ones a second theme needs.
- **Storybook has a Theme toolbar** that sets the attribute, as the Language one sets the language, so the light theme can be looked at, and checked for accessibility, in every story.

## Consequences

- The look of the app is unchanged: the tokens are the same, selected by a name. The Interface tab gains a field, so its picture changes.
- The light theme will be a block in the stylesheet, one entry in `themes` and in `themeWindowColors`, two names and its own images and checks. Nothing in a component, in the settings, in the window or in the file changes.
- Not done here, on purpose, and what that change will have to settle: a **flash of the default theme** on launch (the page is drawn in `dark` from `index.html` until the settings are read, since the window shows at once on its own color; a theme that is not the default would need the main process to hand the page its theme at creation, as it hands it the version), whether a theme should **follow the system's** light or dark setting (it is a choice of its own, not a theme), and which images of the guide and the visual baselines are made in each theme.
- Nothing of this is checked on a real window: that `setTitleBarOverlay` changes the buttons on the system's title bar, and that `setBackgroundColor` repaints a window already drawn, are Electron's behavior on Windows and Linux; the tests check that they are asked, with the colors of the theme, and not on macOS.
