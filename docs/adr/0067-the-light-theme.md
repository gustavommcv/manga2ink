# ADR 0067: The light theme

- Status: Accepted
- Date: 2026-10-17
- Amends: [ADR 0066](0066-the-look-of-the-app-is-a-theme-and-a-theme-is-a-block-of-tokens.md) (it left the flash of the default theme, and the images and checks of each theme, to this change)
- Relates to: [ADR 0002](0002-shadcn-radix-tailwind-design-system.md) (the tokens), [ADR 0047](0047-an-option-of-an-item-is-put-back-to-the-queues.md) (the color for what an item sets over the queue)

## Context

ADR 0066 made a theme a name, a block of tokens and the colors of the window, with the dark graphite look as the only one. The light theme is what that structure was for. What it had to settle: the colors themselves, what a theme is checked against, how the window avoids opening in the wrong theme for a moment, and what the pictures of the guide and the visual checks are made in.

## Decision

- **A light theme, "Light (paper)" / "Claro (papel)",** is a second block of the same variables in `styles.css`, a second entry in `themes` and in `themeWindowColors`, and two names. No component, setting or file format changes, and the dark theme is still the one a person starts with, whatever the system is set to.
- **The same hues, turned over.** Graphite for the neutrals (286), the lavender of the accent (274) as an indigo deep enough to be read on white, the cyan-teal for what an item sets over the queue's options (205), a brick red for failure (25) and a brown amber for a warning (72), and no green. The page is an off-white and the surfaces are white, raised a little above it, as the dark theme raises its surfaces by making them lighter; text is near-black graphite. The border is stronger than a first try of it was, since a white surface does not make an unchecked checkbox or an empty field show by itself.
- **Contrast is a test, not a sentence.** The comment in the stylesheet that said what was measured is now checked: for each theme, the foreground is at least 12:1 on the page, a raised surface and a muted ground; the muted foreground at least 7:1 on the first two and 6:1 on the third; the subtle foreground at least 4.5:1 on all; the accent, the override color, the failure color and the warning color at least 7:1 on the first two and 6:1 on the third; the label of a primary button at least 7:1 and of a destructive one 5.5:1. The dark theme meets all of it and the light one too (muted foreground 7.1–7.6:1, accent 7.8–8.3:1, failure 7.7–8.3:1 on the page and a surface), so a theme added later is held to the same.
- **The window follows the theme from the first paint.** The packaged page is served by the main process, so it is given with the `data-theme` of its `<html>` already set to the chosen theme (`pageInTheme`, which reads the build's attribute with or without quotes). The window is painted with the theme's background, the title-bar buttons are drawn in its colors, and the parts the system draws (dialogs, menus, scrollbars) are given its scheme through `nativeTheme.themeSource`, at launch and when the theme is kept. The first paint is therefore never in the other theme, and a native dialog does not come up dark over a light window. Under the development server the page is not served by the app, so `npm start` still shows the default theme for a moment before the settings are read.
- **The stories run in both themes.** `test:stories` runs the whole of Storybook once in the default theme and once in the light one (`storybook-light`, which sets `STORYBOOK_THEME`), with the same accessibility check at `error`, so a color pair that fails in the light theme fails the build. A `Design system/Theme` story draws every pair of text and ground, and checks that the page is in the theme the toolbar names.
- **The visual checks of the light theme** are the dialog, the queue with items in every state, a running item, the results, the mapping editor, the output settings and the button gallery, and the palette in each theme. The guide's pictures stay the dark ones (they are made by the tutorial pipeline, in the default theme), and the guide says so.

## Consequences

- A person can choose **Light (paper)** in the Interface tab and the page, the window, its buttons and what the system draws change at once; the choice is kept.
- Adding a third theme is the same four things (a block, two table entries and its names), and is held to the contrast above and to the stories passing in it.
- The dark theme is unchanged: its own pictures all still match.
- Not done, on purpose: **following the system's light or dark setting** is a choice of its own (an "Automatic" next to the two themes, which needs the system's change to be heard) and was not asked for; **non-text contrast** (the border of a field or an unchecked checkbox against what is behind it) is 1.8:1 in the light theme and 1.3:1 in the dark one, below the 3:1 that WCAG 1.4.11 asks of a control's edge, in both: raising it for both is a change to the border token or to a token of its own for controls, with the visual checks that go with it.
- Not checked on a real window: that the light theme looks right on macOS and Linux windows, and that the native dialogs and menus follow the scheme on each system. The packaged test checks, on the system it runs on, that choosing the theme paints the window, gives the system the scheme, and serves the page in it.
