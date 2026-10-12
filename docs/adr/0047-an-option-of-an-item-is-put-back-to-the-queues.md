# ADR 0047: An option of an item is put back to the queue's value

- Status: Accepted
- Date: 2026-10-12
- Amends: [ADR 0046](0046-an-item-can-have-conversion-options-of-its-own.md) (what its page compares with and puts back)

## Context

ADR 0046 gave each item the queue's own options page, and with it the page's way of marking an option: shown in color when it differs from the app's defaults, with an arrow that puts the default back. On the queue's page that is right. On an item's it is not what the page is about: an item's options are what it sets _over the queue's_, so the question on that page is "what is different here?", and the queue's options are rarely the app's defaults (the device and the format almost never are). An untouched item showed arrows for everything the queue had changed, and the arrow of an option the item had changed went to a value that was neither the queue's nor the item's.

## Decision

- **On an item's page a field is changed when it differs from the queue's value, and its arrow puts the queue's value back.** Its name says so: "Use the queue's value for <option>", where the queue's page says "Restore default for <option>".
- **It is the same for every kind of control**: the device (which puts back the upscaling and color that choosing it set, as choosing it did), the format, and the choices that stand for more than one setting (page size, borders, autocontrast).
- **What an item sets has a color of its own**, a soft cyan-teal that nothing else in the app uses (the accent also means the primary action, focus and status), on its page and on the button of its row. The theme still has no green: it is cyan, and never the only sign, since the arrow and the button's title say the same.
- **An option put back is no longer a difference**, so the item holds nothing for it (ADR 0046), and an item with nothing changed is the queue's again. "Use the queue's options" still puts back all of them at once.
- **The queue's page is unchanged**: it compares with the app's defaults and "Reset to defaults" still puts those back.

## Consequences

- What is in color on an item's page is exactly what the item does differently, which is also what its button on the queue says (colored when it has any).
- Choosing the app's default on an item whose queue has another value is a change like any other, with an arrow back to the queue's.
- The option editor takes the queue's options as a parameter instead of knowing about items; without it, it is what it was.
