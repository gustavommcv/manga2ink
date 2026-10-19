# Shared compositions

Small pieces used across screens rather than owned by one of them, each with a story and tests. This includes `Notices` (the dismissible message shown when a saved setting could not be used and what took its place) `InfoBanner` (the non-dismissible informational status banner used across settings, volume mapping, and library views), and `ScreenHeader` with `Eyebrow` (the top of every screen: the way back, the line above, the title, what it says; ADR 0072), `Screen` (a screen's width, by name, and the space between its blocks) and `TwoColumns` (what a screen is about and the card beside it, on one proportion; ADR 0073).

A composition earns a place here when a second screen needs it, with real props, accessible behavior, a story and a test. It is not created ahead of a use.
