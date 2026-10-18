# ADR 0070: The theme may follow the system, and it does until a person chooses another

- Status: Accepted
- Date: 2026-10-18
- Amends: [ADR 0066](0066-the-look-of-the-app-is-a-theme-and-a-theme-is-a-block-of-tokens.md) (what a person starts with, and what the choice is), [ADR 0067](0067-the-light-theme.md) (it left "following the system's light or dark setting" as a choice of its own, and made the dark theme the one a person starts with whatever the system is)
- Relates to: [ADR 0052](0052-the-app-language-is-chosen-behind-a-gear.md) (the language has the same choice, to follow the system)

## Context

The language of the app can be one of its languages or the system's, and starts as the system's. The theme could only be one of its two, and started dark. A person whose system is set to light, or who changes it at sunset, opens a dark app. The ADRs of the themes named this on purpose as a choice of its own, "which needs the system's change to be heard".

## Decision

- **A third choice: Automatic (system theme).** What is kept is a _preference_, `system`, `dark` or `light` (`ThemePreference`, `themePreferences` in `src/domain/theme.ts`), in `app-settings.json` as `theme`, as before; the file stays at version 1 and a value this build does not have reads as the default. A theme is still `dark` or `light`: `resolveTheme(preference, systemIsDark)` says which one a preference comes to now.
- **It is what a person starts with.** As the language starts as the system's, the theme starts as the system's, and `defaultThemePreference` is `system`. The dark theme stays the default _theme_ (`defaultTheme`): the bare `:root` of the stylesheet, a story with no choice, and what a system that is dark comes to. A file with a theme in it is respected: the person who chose Dark or Light, and also the one whose file got `dark` written when any other setting was kept (the file has always held every choice), are as they were. Only an app that has no choice kept, or none about the theme, follows the system.
- **The main process asks the system, and the page does too.** For a preference that follows the system, `nativeTheme.themeSource` is `system` (`applyThemeToApp`), so the system's own parts and the page's `prefers-color-scheme` say what the system says. The main process takes what the preference comes to from `nativeTheme.shouldUseDarkColors`, for the window's color and the buttons of its title bar (`applyThemePreference`, when the choice is kept) and for the page it serves (`serveRenderer` and `createMainWindow` are given the theme the preference comes to, each time: the first paint is already in it, as in ADR 0067). The page puts the theme on `<html>` from what its own `matchMedia('(prefers-color-scheme: dark)')` says (`useResolvedTheme`), and again when that changes.
- **The system's change is heard.** `followSystemTheme` listens to `nativeTheme`'s `updated` and, only while the preference is `system`, gives every open window the colors of the theme it comes to. The page changes by itself, through the same media query, so nothing is sent to it.
- **The selector says it.** **Theme** in the Interface tab has **Automatic (system theme)** first, then Dark and Light, with the words in both languages, and its help says that Automatic follows the system also when it changes.
- **Nothing else changes:** the tokens, the contrast checks, the stories (their toolbar still names a theme), and the pictures of the guide, which stay the dark ones.

## Consequences

- A person with a light system gets a light app, and one whose system changes at a time of day sees the app change with it, with no choice made.
- **An alpha release changes what some people see on update:** whoever has no theme in their file (they never kept any setting) starts following the system, so on a light system the app is light where it was dark. The notes of the release say it under "Before you update", and that **Dark (graphite)** is one choice away.
- Not checked on a real system: the packaged test checks, on the system it runs on, that choosing Automatic gives the system its own setting back and paints the window and serves the page in what the system comes to, and that a change of the system's setting (made by asking Electron for the other scheme, which is what the app sees) repaints the window and changes the page. That Windows, macOS and each Linux desktop report their light or dark setting, and its changes, through `nativeTheme` as Electron documents is theirs: on Linux it depends on the desktop's portal or toolkit settings, and a window manager with neither reports the light one.
