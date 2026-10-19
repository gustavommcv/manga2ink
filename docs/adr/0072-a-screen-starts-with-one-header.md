# ADR 0072: A screen starts with one header, and its title takes focus without a ring

- Status: Accepted
- Date: 2026-10-18
- Relates to: [ADR 0002](0002-shadcn-radix-tailwind-design-system.md) (the tokens and primitives the header is made of)

## Context

Each screen wrote the top of its page itself: the way back, the line above the title, the title, what it says, and the effect that puts focus on the title when the screen opens. Seven screens and the volume editor had each their copy, and the copies had drifted: the titles were 16, 24 and 30 px, the space between the line above, the title and the text under it was 4, 8 or 12 px, three screens broke a long name anywhere in it and the others did not, the back button had two icons, and the text under the title was one of two greys. A measured pass over the app found them side by side.

The title also drew a focus ring. It cannot be reached by Tab (`tabIndex={-1}`: focus is put there so that a screen reader says where it is and a keyboard starts there), so the ring told a person nothing, and it showed at the start of the app and of every screen, before anyone had touched a key.

## Decision

- **`ScreenHeader` (`components/shared/screen-header.tsx`) is the top of a screen.** It takes the way back (`back`), the line above (`eyebrow`), the title, a `badge` beside it, what it says (`description`) and what comes at the end (`actions`). The queue, the library, the details of a book, both pages of options, the running screen, the results and the volume editor use it; a screen does not write its own. `Eyebrow` is the line above, and the one place that says how it looks.
- **One title: 24 px, semibold, tight.** A `section` title, 16 px medium, is for a screen that is one list among others, which is the queue. The text under the title is 14 px in the muted grey, no wider than a line can be read (`max-w-2xl`); the line above, the title and that text are 4 px apart.
- **The title takes focus when the screen opens, as before, and draws no ring.** The header does it, so no screen has the effect, and a screen that moves focus back to its title afterwards (the queue, once a waiting conversion is deleted) gives the header its `titleRef`.
- **A long name wraps where it can** (`wrap-anywhere`) and only breaks inside a word when it has to, where it was broken at any letter on three screens and not at all on the others.
- **The back button has one icon, a chevron,** whatever it says.

Not here, and said where it goes: the width and the left edge of each page (the next change gives a screen its width by name), and where the glyph of a ghost button sits against the edge it is lined up with.

## Consequences

- A change to how a screen begins is made once, and a new screen begins like the others by using the component.
- The pages of options, which had a 30 px title, now have the 24 px one of the other pages, and the library, the details of a book and the results have the muted grey where they had the dimmer one.
- A keyboard user sees no ring on a title they cannot reach; everything they can reach keeps its ring.
